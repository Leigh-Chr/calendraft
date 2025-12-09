# Système d'authentification - Calendraft

## Vue d'ensemble

Calendraft utilise **Better-Auth** pour gérer l'authentification des utilisateurs. Le système supporte deux modes :

1. **Mode anonyme** : Utilisation sans compte (données stockées localement)
2. **Mode authentifié** : Compte avec email/mot de passe (données synchronisées dans le cloud)

## Architecture

### Backend (Serveur)

Le serveur expose les endpoints Better-Auth via `/api/auth/*` :

```12:23:packages/auth/src/index.ts
	trustedOrigins: [process.env.CORS_ORIGIN || "http://localhost:3001"],
	emailAndPassword: {
		enabled: true,
	},
	advanced: {
		defaultCookieAttributes: {
			sameSite: isProduction ? "none" : "lax",
			secure: isProduction,
			httpOnly: true,
		},
	},
```

**Configuration serveur** (`apps/server/src/index.ts`) :
- Route `/api/auth/*` gérée par `auth.handler()`
- Rate limiting :
  - 5 inscriptions/minute pour `/api/auth/sign-up/email` (prévention des abus)
  - 10 requêtes/minute pour les autres endpoints d'authentification
- CORS configuré pour permettre les cookies cross-origin

**Configuration Better-Auth** (`packages/auth/src/index.ts`) :
- Vérification d'email activée avec envoi automatique à l'inscription
- Plugin `emailHarmony` pour bloquer 55,000+ domaines d'emails temporaires
- Normalisation d'email activée (permet connexion avec email normalisé)
- Auto-connexion après vérification d'email

### Frontend (Client)

Le client utilise `better-auth/react` pour l'authentification :

```5:8:apps/web/src/lib/auth-client.ts
export const authClient = createAuthClient({
	baseURL: import.meta.env.VITE_SERVER_URL,
	plugins: [inferAdditionalFields<typeof auth>()],
});
```

**Composants** :
- `SignInForm` : Formulaire de connexion (`apps/web/src/components/sign-in-form.tsx`)
- `SignUpForm` : Formulaire d'inscription (`apps/web/src/components/sign-up-form.tsx`)
- Route `/login` : Page de connexion/inscription

## Variables d'environnement requises

### Backend (`apps/server/.env`)

```env
# Base de données PostgreSQL (requis)
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE

# CORS - URL du frontend (requis en production)
CORS_ORIGIN=http://localhost:3001

# Better-Auth - Secret de chiffrement (requis, min 32 caractères)
BETTER_AUTH_SECRET=your-secret-key-min-32-chars

# Better-Auth - URL du backend (optionnel mais recommandé)
BETTER_AUTH_URL=http://localhost:3000

# Email Service Configuration (requis pour la vérification d'email)
# Option A: Resend (Recommandé)
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM=Calendraft <noreply@calendraft.com>

# Option B: SMTP (Alternative - si Nodemailer)
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=your-email@example.com
# SMTP_PASSWORD=your-password
```

### Frontend (`apps/web/.env`)

```env
# URL du serveur backend (requis)
VITE_SERVER_URL=http://localhost:3000
```

## Fonctionnement

### Inscription (Sign Up)

1. L'utilisateur remplit le formulaire avec :
   - Nom (min 2 caractères)
   - Email (format valide, emails temporaires bloqués)
   - Mot de passe (min 8 caractères)

2. Le client appelle `authClient.signUp.email()` qui envoie une requête POST à `/api/auth/sign-up/email`

3. Better-Auth avec le plugin `emailHarmony` :
   - Vérifie que l'email n'est pas un email temporaire/disposable (55,000+ domaines bloqués)
   - Normalise l'email (gmail.com = googlemail.com)
   - Vérifie que l'email n'existe pas déjà
   - Hash le mot de passe (scrypt)
   - Crée un utilisateur dans la table `user` avec `emailVerified: false`
   - Crée un compte dans la table `account` avec le mot de passe hashé
   - Envoie automatiquement un email de vérification (si `sendOnSignUp: true`)
   - **Ne crée PAS de session** tant que l'email n'est pas vérifié

4. En cas de succès : redirection vers `/check-email` avec message de confirmation
5. En cas d'erreur : affichage d'un toast avec message spécifique :
   - Email temporaire bloqué
   - Email déjà utilisé
   - Rate limit dépassé
   - Autres erreurs

### Vérification d'email

1. L'utilisateur reçoit un email avec un lien de vérification
2. Le lien pointe vers `/api/auth/verify-email?token=...&callbackURL=/verify-email`
3. Better-Auth :
   - Vérifie le token
   - Met à jour `emailVerified: true` dans la table `user`
   - Crée une session si `autoSignInAfterVerification: true`
   - Redirige vers `/verify-email` (succès) ou `/verify-email?error=invalid_token` (échec)
4. L'utilisateur est automatiquement connecté et redirigé vers `/calendars`

### Réinitialisation de mot de passe (Forgot Password)

1. L'utilisateur clique sur "Forgot password?" dans le formulaire de connexion
2. Il est redirigé vers `/forgot-password` et entre son email
3. Le client appelle `authClient.requestPasswordReset()` qui envoie une requête POST à `/api/auth/request-password-reset`
4. Better-Auth :
   - Vérifie que l'email existe dans la base de données
   - Génère un token de réinitialisation (valide 1 heure)
   - Envoie un email avec un lien de réinitialisation
5. L'utilisateur reçoit l'email et clique sur le lien
6. Il est redirigé vers `/reset-password?token=...`
7. L'utilisateur entre son nouveau mot de passe (min 8 caractères) et confirme
8. Le client appelle `authClient.resetPassword()` avec le token et le nouveau mot de passe
9. Better-Auth :
   - Vérifie le token
   - Hash le nouveau mot de passe (scrypt)
   - Met à jour le mot de passe dans la table `account`
   - Invalide toutes les sessions existantes (sécurité)
10. En cas de succès : redirection vers `/login` avec message de confirmation
11. En cas d'erreur : affichage d'un toast avec message spécifique

### Connexion (Sign In)

1. L'utilisateur remplit le formulaire avec :
   - Email
   - Mot de passe (min 8 caractères)

2. Le client appelle `authClient.signIn.email()` qui envoie une requête POST à `/api/auth/sign-in/email`

3. Better-Auth :
   - Recherche l'utilisateur par email
   - Vérifie le mot de passe hashé
   - Crée une session dans la table `session`
   - Définit un cookie de session HTTP-only

4. En cas de succès : redirection vers `/calendars`
5. En cas d'erreur : affichage d'un toast avec le message d'erreur

## Problèmes courants et solutions

### 1. Erreur "Network Error" ou "Failed to fetch"

**Causes possibles** :
- Le serveur backend n'est pas démarré
- `VITE_SERVER_URL` est incorrect dans `apps/web/.env`
- Problème de CORS

**Solutions** :
```bash
# Vérifier que le serveur fonctionne
curl http://localhost:3000/health

# Vérifier la variable d'environnement
cat apps/web/.env | grep VITE_SERVER_URL

# Vérifier les logs du serveur
# Les erreurs CORS apparaîtront dans les logs
```

### 2. Erreur "Invalid credentials" ou "User not found"

**Causes possibles** :
- Email ou mot de passe incorrect
- L'utilisateur n'existe pas (pour la connexion)
- L'email existe déjà (pour l'inscription)

**Solutions** :
- Vérifier les identifiants
- Pour l'inscription : utiliser un autre email
- Pour la connexion : vérifier que le compte existe dans la base de données

### 3. Erreur "BETTER_AUTH_SECRET is required"

**Cause** : La variable d'environnement `BETTER_AUTH_SECRET` n'est pas définie ou est trop courte (< 32 caractères)

**Solution** :
```bash
# Générer un secret sécurisé
openssl rand -base64 32

# Ajouter dans apps/server/.env
BETTER_AUTH_SECRET=<secret-généré>
```

### 4. Les cookies ne sont pas définis (session non persistante)

**Causes possibles** :
- Configuration CORS incorrecte
- `CORS_ORIGIN` ne correspond pas à l'URL du frontend
- Problème avec les cookies en développement (SameSite, Secure)

**Solutions** :
```bash
# Vérifier que CORS_ORIGIN correspond à l'URL du frontend
# En développement : http://localhost:3001
# En production : https://votre-domaine.com

# Vérifier dans les DevTools du navigateur :
# - Application > Cookies
# - Vérifier que le cookie de session est présent
```

### 5. Erreur de base de données

**Causes possibles** :
- La base de données n'est pas accessible
- Les tables Better-Auth n'existent pas
- `DATABASE_URL` est incorrect

**Solutions** :
```bash
# Vérifier la connexion à la base de données
bun run db:push

# Vérifier que les tables existent
bun run db:studio
# Vérifier les tables : user, session, account, verification

# Vérifier DATABASE_URL
cat apps/server/.env | grep DATABASE_URL
```

### 6. Erreur "Rate limit exceeded"

**Cause** : Trop de tentatives de connexion/inscription (limite : 10 requêtes/minute)

**Solution** : Attendre 1 minute avant de réessayer

## Diagnostic

Un script de diagnostic est disponible pour vérifier la configuration :

```bash
./scripts/check-auth.sh
```

Ce script vérifie :
- La présence et la configuration des fichiers `.env`
- L'accessibilité du serveur backend
- La connexion à la base de données
- Les endpoints Better-Auth

## Base de données

Better-Auth crée automatiquement les tables suivantes (voir `packages/db/prisma/schema/auth.prisma`) :

- **user** : Utilisateurs (id, name, email, emailVerified, image, createdAt, updatedAt)
- **session** : Sessions actives (id, token, userId, expiresAt, ipAddress, userAgent)
- **account** : Comptes liés (id, userId, providerId, password hashé, tokens OAuth)
- **verification** : Tokens de vérification (email, codes de réinitialisation)

## Sécurité

- **Mots de passe** : Hashés avec scrypt, jamais stockés en clair
- **Sessions** : Tokens UUID sécurisés, stockés dans des cookies HTTP-only
- **Rate limiting** : 
  - 5 inscriptions/minute pour `/api/auth/sign-up/email` (prévention des abus)
  - 10 requêtes/minute pour les autres endpoints d'authentification
- **Vérification d'email** : Obligatoire pour activer le compte (prévention des comptes fake)
- **Blocage des emails temporaires** : 55,000+ domaines bloqués via `better-auth-harmony`
- **CORS** : Configuration stricte avec `trustedOrigins`
- **Cookies** : 
  - Development : `SameSite=lax`, `Secure=false`
  - Production : `SameSite=none`, `Secure=true`

## Endpoints disponibles

Better-Auth expose les endpoints suivants via `/api/auth/*` :

- `GET /api/auth/get-session` - Récupère la session actuelle
- `POST /api/auth/sign-up/email` - Inscription avec email/mot de passe
- `POST /api/auth/sign-in/email` - Connexion avec email/mot de passe
- `POST /api/auth/sign-out` - Déconnexion
- `GET /api/auth/verify-email` - Vérifie l'email via token (appelé automatiquement via lien dans email)
- `POST /api/auth/send-verification-email` - Renvoie un email de vérification
- `POST /api/auth/request-password-reset` - Demande de réinitialisation de mot de passe (envoie un email)
- `POST /api/auth/reset-password` - Réinitialise le mot de passe avec un token valide

## Documentation supplémentaire

- [Better-Auth Documentation](https://www.better-auth.com/docs)
- [@calendraft/auth README](packages/auth/README.md)
- [README principal](README.md) - Section "Authentication and Storage"

