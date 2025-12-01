// SPDX-License-Identifier: AGPL-3.0-only
import prisma from "@calendraft/db";
import { checkout, polar, portal, webhooks } from "@polar-sh/better-auth";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { polarClient } from "./lib/payments";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Map Polar product IDs to plan types
 */
function getProductPlanType(productId: string): "PERSONAL" | "PRO" | null {
	if (productId === process.env.POLAR_PRODUCT_PERSONAL_ID) {
		return "PERSONAL";
	}
	if (productId === process.env.POLAR_PRODUCT_PRO_ID) {
		return "PRO";
	}
	return null;
}

/**
 * Map Polar subscription status to our status enum
 */
function mapSubscriptionStatus(
	status: string,
): "ACTIVE" | "CANCELED" | "PAST_DUE" | "INCOMPLETE" | "TRIALING" | "UNPAID" {
	const statusMap: Record<
		string,
		"ACTIVE" | "CANCELED" | "PAST_DUE" | "INCOMPLETE" | "TRIALING" | "UNPAID"
	> = {
		active: "ACTIVE",
		canceled: "CANCELED",
		past_due: "PAST_DUE",
		incomplete: "INCOMPLETE",
		incomplete_expired: "INCOMPLETE",
		trialing: "TRIALING",
		unpaid: "UNPAID",
	};
	return statusMap[status] || "ACTIVE";
}

export const auth = betterAuth<BetterAuthOptions>({
	database: prismaAdapter(prisma, {
		provider: "postgresql",
	}),
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
	plugins: [
		polar({
			client: polarClient,
			createCustomerOnSignUp: true,
			use: [
				checkout({
					products: [
						...(process.env.POLAR_PRODUCT_PERSONAL_ID
							? [
									{
										productId: process.env.POLAR_PRODUCT_PERSONAL_ID,
										slug: "personal",
									},
								]
							: []),
						...(process.env.POLAR_PRODUCT_PRO_ID
							? [
									{
										productId: process.env.POLAR_PRODUCT_PRO_ID,
										slug: "pro",
									},
								]
							: []),
					],
					successUrl: process.env.POLAR_SUCCESS_URL || "/success",
					authenticatedUsersOnly: true,
				}),
				portal(),
				// Webhooks to sync subscription state with our database
				...(process.env.POLAR_WEBHOOK_SECRET
					? [
							webhooks({
								secret: process.env.POLAR_WEBHOOK_SECRET,
								// Called when a subscription is created
								onSubscriptionCreated: async (payload) => {
									const subscription = payload.data;
									const customerId = subscription.customerId;
									const productId = subscription.productId;
									const planType = getProductPlanType(productId);

									if (!planType || !customerId) return;

									// Get customer email from the embedded customer object
									const customerEmail = subscription.customer?.email;
									if (!customerEmail) return;

									const user = await prisma.user.findUnique({
										where: { email: customerEmail },
									});

									if (!user) return;

									await prisma.subscription.upsert({
										where: { userId: user.id },
										create: {
											userId: user.id,
											planType,
											status: mapSubscriptionStatus(subscription.status),
											polarSubscriptionId: subscription.id,
											polarCustomerId: customerId,
											currentPeriodStart: subscription.currentPeriodStart
												? new Date(subscription.currentPeriodStart)
												: null,
											currentPeriodEnd: subscription.currentPeriodEnd
												? new Date(subscription.currentPeriodEnd)
												: null,
											cancelAtPeriodEnd:
												subscription.cancelAtPeriodEnd ?? false,
										},
										update: {
											planType,
											status: mapSubscriptionStatus(subscription.status),
											polarSubscriptionId: subscription.id,
											polarCustomerId: customerId,
											currentPeriodStart: subscription.currentPeriodStart
												? new Date(subscription.currentPeriodStart)
												: null,
											currentPeriodEnd: subscription.currentPeriodEnd
												? new Date(subscription.currentPeriodEnd)
												: null,
											cancelAtPeriodEnd:
												subscription.cancelAtPeriodEnd ?? false,
										},
									});
								},
								// Called when a subscription is updated (renewal, plan change, etc.)
								onSubscriptionUpdated: async (payload) => {
									const subscription = payload.data;
									const productId = subscription.productId;
									const planType = getProductPlanType(productId);

									if (!subscription.id) return;

									// Find existing subscription by Polar subscription ID
									const existingSubscription =
										await prisma.subscription.findFirst({
											where: { polarSubscriptionId: subscription.id },
										});

									if (!existingSubscription) return;

									await prisma.subscription.update({
										where: { id: existingSubscription.id },
										data: {
											...(planType && { planType }),
											status: mapSubscriptionStatus(subscription.status),
											currentPeriodStart: subscription.currentPeriodStart
												? new Date(subscription.currentPeriodStart)
												: null,
											currentPeriodEnd: subscription.currentPeriodEnd
												? new Date(subscription.currentPeriodEnd)
												: null,
											cancelAtPeriodEnd:
												subscription.cancelAtPeriodEnd ?? false,
										},
									});
								},
								// Called when a subscription is canceled (but may still be active until period end)
								onSubscriptionCanceled: async (payload) => {
									const subscription = payload.data;

									if (!subscription.id) return;

									const existingSubscription =
										await prisma.subscription.findFirst({
											where: { polarSubscriptionId: subscription.id },
										});

									if (!existingSubscription) return;

									await prisma.subscription.update({
										where: { id: existingSubscription.id },
										data: {
											status: "CANCELED",
											cancelAtPeriodEnd: true,
										},
									});
								},
								// Called when subscription access is fully revoked
								onSubscriptionRevoked: async (payload) => {
									const subscription = payload.data;

									if (!subscription.id) return;

									const existingSubscription =
										await prisma.subscription.findFirst({
											where: { polarSubscriptionId: subscription.id },
										});

									if (!existingSubscription) return;

									// Revert to FREE plan
									await prisma.subscription.update({
										where: { id: existingSubscription.id },
										data: {
											planType: "FREE",
											status: "CANCELED",
											polarSubscriptionId: null,
											currentPeriodStart: null,
											currentPeriodEnd: null,
											cancelAtPeriodEnd: false,
										},
									});
								},
							}),
						]
					: []),
			],
		}),
	],
});
