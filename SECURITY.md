# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

Calendraft takes security very seriously. If you discover a security vulnerability, please report it responsibly.

### How to Report

**Do NOT create a public issue for security vulnerabilities.**

1. **By email**: Contact the project maintainer (see GitHub profile)
2. **Via GitHub**: Use the "Report a vulnerability" feature if available in the Security tab

### Information to Include

1. **Description** of the vulnerability
2. **Steps** to reproduce the issue
3. **Potential impact**
4. **Suggestion** for fix (if you have one)

### Response Process

1. You will receive an acknowledgment within **48 hours**
2. We will assess the vulnerability and keep you informed
3. A fix will be developed privately
4. Once the fix is ready, we will publish an update
5. You will be credited in the release notes (if you wish)

## Security Measures in Place

### Authentication

- Authentication via [Better-Auth](https://better-auth.com/)
- **Email verification required** - Prevents fake accounts and spam
- **Temporary email blocking** - 55,000+ disposable email domains blocked via `better-auth-harmony`
- **Email normalization** - Prevents duplicate accounts (gmail.com = googlemail.com)
- **Password reset** - Secure password reset flow via email with token expiration (1 hour)
- Secure cookies (HttpOnly, Secure, SameSite)
- Support for anonymous users with high entropy unique ID (192 bits)
- Server-side validation of anonymous IDs (injection protection)

### SSRF Protection (Server-Side Request Forgery)

External URL imports are protected against SSRF attacks:

- Blocking private IP addresses (10.x, 172.16-31.x, 192.168.x, 127.x)
- Blocking cloud metadata endpoints (169.254.169.254, metadata.google, etc.)
- Blocking localhost and variants
- Protocol validation (HTTP/HTTPS only)

### Rate Limiting

Protection against brute force and denial of service attacks:

| Route | Limit | Window |
|-------|-------|--------|
| General (`/*`) | 100 requests | 1 minute |
| Authentication (`/api/auth/*`) | 10 requests | 1 minute |
| Sign-up (`/api/auth/sign-up/email`) | 5 requests | 1 minute |

Rate limiting events are logged for audit.

### API Protection

- Input validation with Zod schemas
- Maximum file size: 5 MB
- CORS configured strictly (no wildcard `*` in production)
- Limit of 10 sharing links per calendar

### HTTP Security Headers

The following headers are configured automatically:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
Strict-Transport-Security: max-age=31536000; includeSubDomains (HTTPS only)
```

### Content Security Policy (CSP)

**Frontend** (via meta tag):
```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https:;
connect-src 'self' https://*.sentry.io;
frame-ancestors 'none';
```

**Backend** (API):
```
default-src 'none';
frame-ancestors 'none';
base-uri 'none';
```

### User Data

- Anonymous user data is automatically deleted after 60 days of inactivity
- Passwords are hashed with secure algorithms
- Sessions expire automatically
- Sentry configured to not collect personal data (PII)

### User Limitations

To prevent abuse, limits are applied to all users:

**Anonymous users:**
- Maximum 10 calendars
- Maximum 500 events per calendar
- Automatic deletion after 60 days of inactivity

**Authenticated users:**
- Maximum 100 calendars
- Maximum 2,000 events per calendar
- No automatic deletion

### Security Logging

The following security events are logged:
- Rate limit exceeded
- Blocked access attempts
- Blocked SSRF attempts

## Deployment Best Practices

See [DEPLOYMENT.md](DEPLOYMENT.md) for production security recommendations:

- [ ] HTTPS required (SSL/TLS certificate)
- [ ] `CORS_ORIGIN` defined explicitly (no `*`)
- [ ] `BETTER_AUTH_SECRET` generated securely (min 32 characters)
- [ ] Environment variables not committed to the repo
- [ ] `NODE_ENV=production` in production
- [ ] Reverse proxy configured (nginx, Caddy) with additional security headers

### Secret Rotation

It is recommended to periodically rotate the following secrets:

| Secret | Recommended Frequency |
|--------|----------------------|
| `BETTER_AUTH_SECRET` | Every 6 months |
| `DATABASE_URL` (password) | Every 6 months |

## Dependencies

Dependencies are regularly updated to include security patches. We use:

- `bun audit` to scan for known vulnerabilities
- Dependabot (if configured) for automatic updates
- Hono >= 4.10.3 (critical security patches)

## Scope

This policy covers:

- The Calendraft web application
- The backend API
- Internal packages (`@calendraft/*`)
- Third-party deployments or forks are not covered

## Acknowledgments

We thank security researchers who contribute to Calendraft's security. Contributors will be recognized here (with their permission).

---

Thank you for helping keep Calendraft secure!
