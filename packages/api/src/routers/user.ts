import {
	getDefaultPlanType,
	getPlanLimits,
	type PlanType,
} from "@calendraft/core";
import prisma from "@calendraft/db";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../index";
import { getAnonymousUsage } from "../middleware";

export const userRouter = router({
	/**
	 * Get current user's subscription and usage information
	 */
	getSubscription: protectedProcedure.query(async ({ ctx }) => {
		const subscription = await prisma.subscription.findUnique({
			where: { userId: ctx.session.user.id },
		});

		const planType =
			(subscription?.planType as PlanType) || getDefaultPlanType();
		const limits = getPlanLimits(planType);

		// Get usage stats
		const usage = await getAnonymousUsage(ctx);
		if (!usage) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Unable to fetch usage statistics",
			});
		}

		return {
			planType,
			limits,
			usage: {
				calendarCount: usage.calendarCount,
				maxCalendars: usage.maxCalendars,
				maxEventsPerCalendar: usage.maxEventsPerCalendar,
			},
			subscription: subscription
				? {
						status: subscription.status,
						currentPeriodStart: subscription.currentPeriodStart,
						currentPeriodEnd: subscription.currentPeriodEnd,
						cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
					}
				: null,
		};
	}),
});
