// SPDX-License-Identifier: AGPL-3.0-only
/**
 * @calendraft/core
 * Plan limits and subscription logic
 */

export enum PlanType {
	FREE = "FREE",
	PERSONAL = "PERSONAL",
	PRO = "PRO",
}

export interface PlanLimits {
	calendars: number;
	eventsPerCalendar: number;
	historyDays: number;
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
	[PlanType.FREE]: {
		calendars: 3,
		eventsPerCalendar: 50,
		historyDays: 30,
	},
	[PlanType.PERSONAL]: {
		calendars: 15,
		eventsPerCalendar: 500,
		historyDays: 365,
	},
	[PlanType.PRO]: {
		calendars: Number.POSITIVE_INFINITY,
		eventsPerCalendar: Number.POSITIVE_INFINITY,
		historyDays: Number.POSITIVE_INFINITY,
	},
};

/**
 * Get plan limits for a given plan type
 */
export function getPlanLimits(planType: PlanType): PlanLimits {
	return PLAN_LIMITS[planType];
}

/**
 * Check if a value is within the limit (handles Infinity)
 * Returns true if value is less than or equal to the limit
 */
export function isWithinLimit(value: number, limit: number): boolean {
	if (limit === Number.POSITIVE_INFINITY) {
		return true;
	}
	return value <= limit;
}

/**
 * Get the default plan type (FREE)
 */
export function getDefaultPlanType(): PlanType {
	return PlanType.FREE;
}
