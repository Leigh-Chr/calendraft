// SPDX-License-Identifier: MIT
import prisma from "@calendraft/db";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailHarmony } from "better-auth-harmony";
import { sendResetPasswordEmail, sendVerificationEmail } from "./lib/email";

const isProduction = process.env.NODE_ENV === "production";

// URL du frontend pour les redirections après vérification
// Better-Auth redirige vers le callbackURL côté client
const frontendURL = process.env.CORS_ORIGIN || "http://localhost:3001";

export const auth = betterAuth<BetterAuthOptions>({
	database: prismaAdapter(prisma, {
		provider: "postgresql",
	}),
	trustedOrigins: [frontendURL],
	emailAndPassword: {
		enabled: true,
		// Validation des mots de passe (cohérent avec la validation côté client)
		minPasswordLength: 8,
		maxPasswordLength: 128,
		// Expiration du token de réinitialisation (1 heure)
		resetPasswordTokenExpiresIn: 3600,
		// Configuration de la réinitialisation de mot de passe
		sendResetPassword: async ({ user, url, token }) => {
			// L'URL générée par Better-Auth contient déjà:
			// - Le token de réinitialisation
			// - Le callbackURL (configuré via baseURL)
			// Format: ${baseURL}/api/auth/reset-password?token=...&callbackURL=${frontendURL}/reset-password
			// Ne pas await pour éviter les timing attacks
			void sendResetPasswordEmail({
				to: user.email,
				url, // URL complète générée par Better-Auth
				token,
			});
		},
		// Callback après réinitialisation réussie (optionnel)
		// Better-Auth invalide automatiquement toutes les sessions existantes
		onPasswordReset: async ({ user }) => {
			// Log pour audit (optionnel)
			console.log(`Password reset successful for user: ${user.email}`);
		},
	},
	// Configuration de la vérification d'email
	emailVerification: {
		sendVerificationEmail: async ({ user, url, token }) => {
			// L'URL générée par Better-Auth contient déjà:
			// - Le token de vérification
			// - Le callbackURL (configuré via baseURL)
			// Format: ${baseURL}/api/auth/verify-email?token=...&callbackURL=${frontendURL}/verify-email
			// Ne pas await pour éviter les timing attacks
			void sendVerificationEmail({
				to: user.email,
				url, // URL complète générée par Better-Auth
				token,
			});
		},
		sendOnSignUp: true, // Envoyer automatiquement à l'inscription
		autoSignInAfterVerification: true, // Connecter automatiquement après vérification
		expiresIn: 3600, // 1 heure (défaut)
	},
	// Configuration de l'URL de base pour les callbacks
	// Doit pointer vers le frontend car Better-Auth redirige côté client
	baseURL: frontendURL,
	basePath: "/api/auth",
	plugins: [
		// Plugin pour bloquer les emails temporaires
		emailHarmony({
			allowNormalizedSignin: true, // Permet de se connecter avec email normalisé
			// Le plugin bloque automatiquement 55,000+ domaines temporaires
		}),
	],
	advanced: {
		defaultCookieAttributes: {
			sameSite: isProduction ? "none" : "lax",
			secure: isProduction,
			httpOnly: true,
		},
	},
});
