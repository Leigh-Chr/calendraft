# Politique de sécurité

## Versions supportées

| Version | Supportée          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Signaler une vulnérabilité

La sécurité de Calendraft est prise très au sérieux. Si vous découvrez une vulnérabilité de sécurité, merci de nous le signaler de manière responsable.

### Comment signaler

**Ne créez PAS d'issue publique pour les vulnérabilités de sécurité.**

1. **Par email** : Contactez le mainteneur du projet (voir profil GitHub)
2. **Via GitHub** : Utilisez la fonctionnalité "Report a vulnerability" si disponible dans l'onglet Security

### Informations à inclure

1. **Description** de la vulnérabilité
2. **Étapes** pour reproduire le problème
3. **Impact** potentiel
4. **Suggestion** de correction (si vous en avez une)

### Processus de réponse

1. Vous recevrez un accusé de réception sous **48 heures**
2. Nous évaluerons la vulnérabilité et vous tiendrons informé
3. Un correctif sera développé en privé
4. Une fois le correctif prêt, nous publierons une mise à jour
5. Vous serez crédité dans les notes de version (si vous le souhaitez)

## Mesures de sécurité en place

### Authentification

- Authentification via [Better-Auth](https://better-auth.com/)
- Cookies sécurisés (HttpOnly, Secure, SameSite)
- Support des utilisateurs anonymes avec ID unique haute entropie (192 bits)
- Validation serveur des IDs anonymes (protection contre l'injection)

### Protection SSRF (Server-Side Request Forgery)

L'importation d'URL externes est protégée contre les attaques SSRF :

- Blocage des adresses IP privées (10.x, 172.16-31.x, 192.168.x, 127.x)
- Blocage des endpoints metadata cloud (169.254.169.254, metadata.google, etc.)
- Blocage de localhost et variantes
- Validation du protocole (HTTP/HTTPS uniquement)

### Rate Limiting

Protection contre les attaques par force brute et déni de service :

| Route | Limite | Fenêtre |
|-------|--------|---------|
| Général (`/*`) | 100 requêtes | 1 minute |
| Authentification (`/api/auth/*`) | 10 requêtes | 1 minute |

Les événements de rate limiting sont loggés pour audit.

### Protection des API

- Validation des entrées avec schémas Zod
- Taille maximale des fichiers : 5 MB
- CORS configuré strictement (pas de wildcard `*` en production)
- Limite de 10 liens de partage par calendrier

### Headers de sécurité HTTP

Les headers suivants sont configurés automatiquement :

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
Strict-Transport-Security: max-age=31536000; includeSubDomains (HTTPS uniquement)
```

### Content Security Policy (CSP)

**Frontend** (via meta tag) :
```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https:;
connect-src 'self' https://*.sentry.io;
frame-ancestors 'none';
```

**Backend** (API) :
```
default-src 'none';
frame-ancestors 'none';
base-uri 'none';
```

### Données utilisateur

- Les données des utilisateurs anonymes sont automatiquement supprimées après 60 jours d'inactivité
- Les mots de passe sont hashés avec des algorithmes sécurisés
- Les sessions expirent automatiquement
- Sentry configuré pour ne pas collecter de données personnelles (PII)

### Limitations utilisateurs

Pour prévenir les abus, des limites sont appliquées à tous les utilisateurs :

**Utilisateurs anonymes :**
- Maximum 10 calendriers
- Maximum 500 événements par calendrier
- Suppression automatique après 60 jours d'inactivité

**Utilisateurs authentifiés :**
- Maximum 100 calendriers
- Maximum 2 000 événements par calendrier
- Pas de suppression automatique

### Logging de sécurité

Les événements de sécurité suivants sont loggés :
- Dépassement de rate limit
- Tentatives d'accès bloquées
- Tentatives SSRF bloquées

## Bonnes pratiques de déploiement

Consultez [DEPLOYMENT.md](DEPLOYMENT.md) pour les recommandations de sécurité en production :

- [ ] HTTPS obligatoire (certificat SSL/TLS)
- [ ] `CORS_ORIGIN` défini explicitement (pas de `*`)
- [ ] `BETTER_AUTH_SECRET` généré de manière sécurisée (min 32 caractères)
- [ ] Variables d'environnement non commitées dans le repo
- [ ] `NODE_ENV=production` en production
- [ ] Proxy inverse configuré (nginx, Caddy) avec headers de sécurité supplémentaires

### Rotation des secrets

Il est recommandé de faire une rotation des secrets suivants périodiquement :

| Secret | Fréquence recommandée |
|--------|----------------------|
| `BETTER_AUTH_SECRET` | Tous les 6 mois |
| `DATABASE_URL` (mot de passe) | Tous les 6 mois |

## Dépendances

Les dépendances sont régulièrement mises à jour pour inclure les correctifs de sécurité. Nous utilisons :

- `bun audit` pour scanner les vulnérabilités connues
- Dependabot (si configuré) pour les mises à jour automatiques
- Hono >= 4.10.3 (correctifs de sécurité critiques)

## Scope

Cette politique couvre :

- L'application web Calendraft
- L'API backend
- Les packages internes (`@calendraft/*`)
- Les déploiements tiers ou forks ne sont pas couverts

## Reconnaissance

Nous remercions les chercheurs en sécurité qui contribuent à la sécurité de Calendraft. Les contributeurs seront reconnus ici (avec leur permission).

---

Merci de nous aider à garder Calendraft sécurisé !
