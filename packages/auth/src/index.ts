// SPDX-License-Identifier: AGPL-3.0
// Copyright (C) 2024 Calendraft
import prisma from "@calendraft/db";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailHarmony } from "better-auth-harmony";
import {
	sendDeleteAccountVerificationEmail,
	sendResetPasswordEmail,
	sendVerificationEmail,
} from "./lib/email";
import { env } from "./lib/env";
import { logger } from "./lib/logger";

const isProduction = env.NODE_ENV === "production";

// URL du frontend pour les redirections après vérification
// Better-Auth redirige vers le callbackURL côté client
const frontendURL = env.CORS_ORIGIN || "http://localhost:3001";

// URL du backend (serveur) où Better-Auth est servi
// Better-Auth génère les URLs de vérification avec baseURL + basePath
// Exemple: ${baseURL}/api/auth/verify-email?token=...&callbackURL=${frontendURL}/verify-email
const backendURL = env.BETTER_AUTH_URL || "http://localhost:3000";

/**
 * Handle share bundles deletion during account deletion
 * Deletes bundles where all calendars belong to the user, or removes user's calendars from shared bundles
 */
async function deleteUserShareBundles(
	userId: string,
	calendarIds: string[],
): Promise<void> {
	if (calendarIds.length === 0) {
		return;
	}

	// Find all bundles containing user's calendars
	const bundleCalendars = await prisma.shareBundleCalendar.findMany({
		where: { calendarId: { in: calendarIds } },
		include: {
			bundle: {
				include: {
					calendars: true,
				},
			},
		},
	});

	// Group by bundle ID
	const bundlesMap = new Map<
		string,
		{
			bundle: (typeof bundleCalendars)[0]["bundle"];
			userCalendarIds: string[];
		}
	>();

	for (const bc of bundleCalendars) {
		const bundleId = bc.bundleId;
		if (!bundlesMap.has(bundleId)) {
			bundlesMap.set(bundleId, {
				bundle: bc.bundle,
				userCalendarIds: [],
			});
		}
		const bundleEntry = bundlesMap.get(bundleId);
		if (bundleEntry) {
			bundleEntry.userCalendarIds.push(bc.calendarId);
		}
	}

	// For each bundle, check if all calendars belong to the user
	for (const [bundleId, { bundle, userCalendarIds }] of bundlesMap) {
		const allCalendarIds = bundle.calendars.map((c) => c.calendarId);
		const allBelongToUser = allCalendarIds.every((id) =>
			calendarIds.includes(id),
		);

		if (allBelongToUser) {
			// Delete the entire bundle (ShareBundleCalendar will be deleted via CASCADE)
			await prisma.calendarShareBundle.delete({
				where: { id: bundleId },
			});
			logger.info("Deleted share bundle (all calendars belonged to user)", {
				userId,
				bundleId,
			});
		} else {
			// Delete only ShareBundleCalendar linked to user's calendars
			await prisma.shareBundleCalendar.deleteMany({
				where: {
					bundleId,
					calendarId: { in: userCalendarIds },
				},
			});
			logger.info("Removed user calendars from share bundle (bundle kept)", {
				userId,
				bundleId,
				removedCount: userCalendarIds.length,
			});
		}
	}
}

export const auth = betterAuth<BetterAuthOptions>({
	database: prismaAdapter(prisma, {
		provider: "postgresql",
	}),
	trustedOrigins: [frontendURL],
	emailAndPassword: {
		enabled: true,
		// Exiger la vérification d'email avant de pouvoir se connecter
		requireEmailVerification: true,
		// Validation des mots de passe (cohérent avec la validation côté client)
		minPasswordLength: 8,
		maxPasswordLength: 128,
		// Expiration du token de réinitialisation (1 heure)
		resetPasswordTokenExpiresIn: 3600,
		// Configuration de la réinitialisation de mot de passe
		sendResetPassword: async ({ user, url, token }) => {
			// L'URL générée par Better-Auth contient déjà:
			// - Le token de réinitialisation
			// - Le callbackURL (frontend URL pour la redirection après réinitialisation)
			// Format: ${backendURL}/api/auth/reset-password?token=...&callbackURL=${frontendURL}/reset-password
			// Better-Auth traite la réinitialisation côté backend, puis redirige vers le callbackURL (frontend)
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
			logger.info("Password reset successful", { email: user.email });
		},
	},
	// Configuration de la vérification d'email
	emailVerification: {
		sendVerificationEmail: async ({ user, url, token }) => {
			// L'URL générée par Better-Auth contient déjà:
			// - Le token de vérification
			// - Le callbackURL (frontend URL pour la redirection après vérification)
			// Format: ${backendURL}/api/auth/verify-email?token=...&callbackURL=${frontendURL}/verify-email
			// Better-Auth vérifie le token côté backend, puis redirige vers le callbackURL (frontend)
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
	// Configuration de l'URL de base pour Better-Auth
	// Doit pointer vers le backend (serveur) où /api/auth/* est servi
	// Better-Auth génère les URLs comme: ${baseURL}${basePath}/verify-email?token=...&callbackURL=${frontendURL}/verify-email
	// Le callbackURL pointe vers le frontend pour la redirection après vérification
	baseURL: backendURL,
	basePath: "/api/auth",
	// Configuration de la suppression de compte
	user: {
		deleteUser: {
			enabled: true,
			// Envoyer un email de confirmation avant suppression
			sendDeleteAccountVerification: async ({ user, url, token }) => {
				// L'URL générée par Better-Auth contient déjà:
				// - Le token de suppression
				// - Le callbackURL (frontend URL pour la redirection après suppression)
				// Format: ${backendURL}/api/auth/delete-user?token=...&callbackURL=${frontendURL}/delete-account
				// Better-Auth traite la suppression côté backend, puis redirige vers le callbackURL (frontend)
				// Ne pas await pour éviter les timing attacks
				void sendDeleteAccountVerificationEmail({
					to: user.email,
					url, // URL complète générée par Better-Auth
					token,
				});
			},
			// Callback avant suppression : logique de cascade personnalisée
			beforeDelete: async (user) => {
				const userId = user.id;
				logger.info("Starting account deletion process", {
					userId,
					email: user.email,
				});

				try {
					// 1. Trouver tous les calendars de l'utilisateur
					const userCalendars = await prisma.calendar.findMany({
						where: { userId },
						select: { id: true },
					});
					const calendarIds = userCalendars.map((cal) => cal.id);

					if (calendarIds.length > 0) {
						// 2. Delete share links linked to user's calendars
						await prisma.calendarShareLink.deleteMany({
							where: { calendarId: { in: calendarIds } },
						});
						logger.info("Deleted share links", {
							userId,
							count: calendarIds.length,
						});

						// 3. Handle share bundles
						await deleteUserShareBundles(userId, calendarIds);
					}

					// 4. Supprimer les GroupMember où l'utilisateur est membre
					// (Les membres seront supprimés des groupes partagés)
					const deletedMemberships = await prisma.groupMember.deleteMany({
						where: { userId },
					});
					logger.info("Deleted group memberships", {
						userId,
						count: deletedMemberships.count,
					});

					// 5. Supprimer les calendar groups de l'utilisateur
					// (Les CalendarGroupMember seront supprimés via CASCADE)
					const deletedGroups = await prisma.calendarGroup.deleteMany({
						where: { userId },
					});
					logger.info("Deleted calendar groups", {
						userId,
						count: deletedGroups.count,
					});

					// 6. Supprimer les calendars de l'utilisateur
					// (Les Events seront supprimés automatiquement via CASCADE)
					const deletedCalendars = await prisma.calendar.deleteMany({
						where: { userId },
					});
					logger.info("Deleted calendars", {
						userId,
						count: deletedCalendars.count,
					});

					logger.info("Account deletion cascade completed successfully", {
						userId,
						email: user.email,
					});
				} catch (error) {
					logger.error("Error during account deletion cascade", {
						userId,
						email: user.email,
						error,
					});
					// Throw l'erreur pour empêcher Better-Auth de supprimer l'utilisateur
					// si la cascade échoue. Cela garantit la cohérence des données.
					throw error;
				}
			},
			// Callback après suppression : logging pour audit
			afterDelete: async (user) => {
				logger.info("Account deleted successfully", {
					userId: user.id,
					email: user.email,
					timestamp: new Date().toISOString(),
				});
			},
		},
	},
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
