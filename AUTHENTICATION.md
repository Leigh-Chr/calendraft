# Authentication System - Calendraft

## Overview

Calendraft uses **Better-Auth** to manage user authentication. The system supports two modes:

1. **Anonymous mode**: Use without an account (data stored locally)
2. **Authenticated mode**: Account with email/password (data synchronized in the cloud)

## Architecture

### Backend (Server)

The server exposes Better-Auth endpoints via `/api/auth/*`.

**Better-Auth Configuration** (`packages/auth/src/index.ts`):
- Uses Prisma adapter for PostgreSQL
- `trustedOrigins` configured via `CORS_ORIGIN`
- Email/password authentication enabled
- Cookies configured based on environment (development/production)

**Server Configuration** (`apps/server/src/index.ts`):
- Route `/api/auth/*` handled by `auth.handler()`
- Rate limiting:
  - 5 sign-ups/minute for `/api/auth/sign-up/email` (abuse prevention)
  - 10 requests/minute for other authentication endpoints
- CORS configured to allow cross-origin cookies

**Better-Auth Features**:
- Email verification enabled with automatic sending on sign-up
- `emailHarmony` plugin to block 55,000+ temporary email domains
- Email normalization enabled (allows login with normalized email)
- Auto-sign-in after email verification

### Frontend (Client)

The client uses `better-auth/react` for authentication. The client is configured in `apps/web/src/lib/auth-client.ts` with the backend server URL.

**Components**:
- `SignInForm`: Sign-in form (`apps/web/src/components/sign-in-form.tsx`)
- `SignUpForm`: Sign-up form (`apps/web/src/components/sign-up-form.tsx`)
- Route `/login`: Sign-in/sign-up page

## Required Environment Variables

### Backend (`apps/server/.env`)

```env
# PostgreSQL database (required)
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE

# CORS - Frontend URL (required in production)
CORS_ORIGIN=http://localhost:3001

# Better-Auth - Encryption secret (required, min 32 characters)
BETTER_AUTH_SECRET=your-secret-key-min-32-chars

# Better-Auth - Backend URL (optional but recommended)
BETTER_AUTH_URL=http://localhost:3000

# Email Service Configuration (required for email verification)
# Option A: Resend (Recommended)
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM=Calendraft <noreply@calendraft.com>

# Option B: SMTP (Alternative - if using Nodemailer)
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=your-email@example.com
# SMTP_PASSWORD=your-password
```

### Frontend (`apps/web/.env`)

```env
# Backend server URL (required)
VITE_SERVER_URL=http://localhost:3000
```

## How It Works

### Sign Up

1. User fills out the form with:
   - Name (min 2 characters)
   - Email (valid format, temporary emails blocked)
   - Password (min 8 characters)

2. Client calls `authClient.signUp.email()` which sends a POST request to `/api/auth/sign-up/email`

3. Better-Auth with `emailHarmony` plugin:
   - Verifies that the email is not a temporary/disposable email (55,000+ domains blocked)
   - Normalizes the email (gmail.com = googlemail.com)
   - Verifies that the email doesn't already exist
   - Hashes the password (scrypt)
   - Creates a user in the `user` table with `emailVerified: false`
   - Creates an account in the `account` table with hashed password
   - Automatically sends a verification email (if `sendOnSignUp: true`)
   - **Does NOT create a session** until email is verified

4. On success: redirect to `/check-email` with confirmation message
5. On error: display a toast with specific message:
   - Temporary email blocked
   - Email already in use
   - Rate limit exceeded
   - Other errors

### Email Verification

1. User receives an email with a verification link
2. Link points to `/api/auth/verify-email?token=...&callbackURL=/verify-email`
3. Better-Auth:
   - Verifies the token
   - Updates `emailVerified: true` in the `user` table
   - Creates a session if `autoSignInAfterVerification: true`
   - Redirects to `/verify-email` (success) or `/verify-email?error=invalid_token` (failure)
4. User is automatically signed in and redirected to `/calendars`

### Password Reset (Forgot Password)

1. User clicks "Forgot password?" in the sign-in form
2. They are redirected to `/forgot-password` and enter their email
3. Client calls `authClient.requestPasswordReset()` which sends a POST request to `/api/auth/request-password-reset`
4. Better-Auth:
   - Verifies that the email exists in the database
   - Generates a reset token (valid for 1 hour)
   - Sends an email with a reset link
5. User receives the email and clicks the link
6. They are redirected to `/reset-password?token=...`
7. User enters their new password (min 8 characters) and confirms
8. Client calls `authClient.resetPassword()` with the token and new password
9. Better-Auth:
   - Verifies the token
   - Hashes the new password (scrypt)
   - Updates the password in the `account` table
   - Invalidates all existing sessions (security)
10. On success: redirect to `/login` with confirmation message
11. On error: display a toast with specific message

### Sign In

1. User fills out the form with:
   - Email
   - Password (min 8 characters)

2. Client calls `authClient.signIn.email()` which sends a POST request to `/api/auth/sign-in/email`

3. Better-Auth:
   - Finds user by email
   - Verifies the hashed password
   - Creates a session in the `session` table
   - Sets an HTTP-only session cookie

4. On success: redirect to `/calendars`
5. On error: display a toast with error message

## Diagnostics

A diagnostic script is available to check the configuration:

```bash
./scripts/check-auth.sh
```

This script checks:
- Presence and configuration of `.env` files
- Backend server accessibility
- Database connection
- Better-Auth endpoints

For common issues and solutions, see the "Troubleshooting" section of the [main README](README.md#troubleshooting).

## Database

Better-Auth automatically creates the following tables (see `packages/db/prisma/schema/auth.prisma`):

- **user**: Users (id, name, email, emailVerified, image, createdAt, updatedAt)
- **session**: Active sessions (id, token, userId, expiresAt, ipAddress, userAgent)
- **account**: Linked accounts (id, userId, providerId, hashed password, OAuth tokens)
- **verification**: Verification tokens (email, reset codes)

## Security

- **Passwords**: Hashed with scrypt, never stored in plain text
- **Sessions**: Secure UUID tokens, stored in HTTP-only cookies
- **Rate limiting**: 
  - 5 sign-ups/minute for `/api/auth/sign-up/email` (abuse prevention)
  - 10 requests/minute for other authentication endpoints
- **Email verification**: Required to activate account (prevents fake accounts)
- **Temporary email blocking**: 55,000+ domains blocked via `better-auth-harmony`
- **CORS**: Strict configuration with `trustedOrigins`
- **Cookies**: 
  - Development: `SameSite=lax`, `Secure=false`
  - Production: `SameSite=none`, `Secure=true`

## Available Endpoints

Better-Auth exposes the following endpoints via `/api/auth/*`:

- `GET /api/auth/get-session` - Get current session
- `POST /api/auth/sign-up/email` - Sign up with email/password
- `POST /api/auth/sign-in/email` - Sign in with email/password
- `POST /api/auth/sign-out` - Sign out
- `GET /api/auth/verify-email` - Verify email via token (called automatically via link in email)
- `POST /api/auth/send-verification-email` - Resend verification email
- `POST /api/auth/request-password-reset` - Request password reset (sends an email)
- `POST /api/auth/reset-password` - Reset password with a valid token

## Additional Documentation

- [Better-Auth Documentation](https://www.better-auth.com/docs)
- [@calendraft/auth README](packages/auth/README.md)
- [Main README](README.md) - "Authentication and Storage" section
