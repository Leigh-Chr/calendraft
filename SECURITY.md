# Politique de sécurité

## Versions supportées

| Version | Supportée          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Signaler une vulnérabilité

La sécurité de Calendraft est prise très au sérieux. Si vous découvrez une vulnérabilité de sécurité, merci de nous le signaler de manière responsable.

### Comment signaler

**⚠️ Ne créez PAS d'issue publique pour les vulnérabilités de sécurité.**

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
- Support des utilisateurs anonymes avec ID unique

### Protection des API

- Rate limiting : 100 requêtes/minute par IP
- Validation des entrées avec schémas Zod
- Taille maximale des fichiers : 5 MB
- CORS configuré strictement (pas de wildcard `*` en production)

### Headers de sécurité HTTP

Les headers suivants sont configurés automatiquement :

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; ...
```

### Données utilisateur

- Les données des utilisateurs anonymes sont automatiquement supprimées après 60 jours d'inactivité
- Les mots de passe sont hashés avec des algorithmes sécurisés
- Les sessions expirent automatiquement

### Limitations utilisateurs anonymes

Pour prévenir les abus :
- Maximum 10 calendriers par utilisateur anonyme
- Maximum 500 événements par calendrier
- Suppression automatique après 60 jours d'inactivité

## Bonnes pratiques de déploiement

Consultez [DEPLOYMENT.md](DEPLOYMENT.md) pour les recommandations de sécurité en production :

- [ ] HTTPS obligatoire (certificat SSL/TLS)
- [ ] `CORS_ORIGIN` défini explicitement (pas de `*`)
- [ ] `BETTER_AUTH_SECRET` généré de manière sécurisée (min 32 caractères)
- [ ] Variables d'environnement non commitées dans le repo
- [ ] `NODE_ENV=production` en production

## Dépendances

Les dépendances sont régulièrement mises à jour pour inclure les correctifs de sécurité. Nous utilisons :

- `bun audit` pour scanner les vulnérabilités connues
- Dependabot (si configuré) pour les mises à jour automatiques

## Scope

Cette politique couvre :

- ✅ L'application web Calendraft
- ✅ L'API backend
- ✅ Les packages internes (`@calendraft/*`)
- ❌ Les déploiements tiers ou forks

## Reconnaissance

Nous remercions les chercheurs en sécurité qui contribuent à la sécurité de Calendraft. Les contributeurs seront reconnus ici (avec leur permission).

---

Merci de nous aider à garder Calendraft sécurisé ! 🔒

