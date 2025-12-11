/**
 * Event relation update utilities
 */

import type { Prisma } from "@calendraft/db";
import type { eventUpdateSchema } from "@calendraft/schemas";
import type z from "zod";

type EventUpdateInput = z.infer<typeof eventUpdateSchema>;

import {
	prepareAlarmData,
	prepareAttendeeData,
	prepareCategoriesData,
	prepareRecurrenceDatesData,
	prepareResourcesData,
} from "../../lib/event-helpers";

type PrismaTransactionClient = Omit<
	Prisma.TransactionClient,
	"$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

type EventUpdateData = {
	attendees?: Parameters<
		PrismaTransactionClient["event"]["update"]
	>[0]["data"]["attendees"];
	alarms?: Parameters<
		PrismaTransactionClient["event"]["update"]
	>[0]["data"]["alarms"];
	categories?: Parameters<
		PrismaTransactionClient["event"]["update"]
	>[0]["data"]["categories"];
	resources?: Parameters<
		PrismaTransactionClient["event"]["update"]
	>[0]["data"]["resources"];
	recurrenceDates?: Parameters<
		PrismaTransactionClient["event"]["update"]
	>[0]["data"]["recurrenceDates"];
};

/**
 * Update event attendees relation
 */
export async function updateEventAttendees(
	tx: PrismaTransactionClient,
	eventId: string,
	attendees: EventUpdateInput["attendees"],
	updateData: EventUpdateData,
) {
	if (attendees === undefined) return;
	await tx.eventAttendee.deleteMany({ where: { eventId } });
	const attendeesData = prepareAttendeeData(attendees);
	if (attendeesData) {
		updateData.attendees = attendeesData;
	}
}

/**
 * Update event alarms relation
 */
export async function updateEventAlarms(
	tx: PrismaTransactionClient,
	eventId: string,
	alarms: EventUpdateInput["alarms"],
	updateData: EventUpdateData,
) {
	if (alarms === undefined) return;
	await tx.eventAlarm.deleteMany({ where: { eventId } });
	const alarmsData = prepareAlarmData(alarms);
	if (alarmsData) {
		updateData.alarms = alarmsData;
	}
}

/**
 * Update event categories relation
 */
export async function updateEventCategories(
	tx: PrismaTransactionClient,
	eventId: string,
	categories: EventUpdateInput["categories"],
	updateData: EventUpdateData,
) {
	if (categories === undefined) return;
	await tx.eventCategory.deleteMany({ where: { eventId } });
	const categoriesData = prepareCategoriesData(categories);
	if (categoriesData) {
		updateData.categories = categoriesData;
	}
}

/**
 * Update event resources relation
 */
export async function updateEventResources(
	tx: PrismaTransactionClient,
	eventId: string,
	resources: EventUpdateInput["resources"],
	updateData: EventUpdateData,
) {
	if (resources === undefined) return;
	await tx.eventResource.deleteMany({ where: { eventId } });
	const resourcesData = prepareResourcesData(resources);
	if (resourcesData) {
		updateData.resources = resourcesData;
	}
}

/**
 * Update event recurrence dates relation
 */
export async function updateEventRecurrenceDates(
	tx: PrismaTransactionClient,
	eventId: string,
	rdate: EventUpdateInput["rdate"],
	exdate: EventUpdateInput["exdate"],
	updateData: EventUpdateData,
) {
	if (rdate === undefined && exdate === undefined) return;
	await tx.recurrenceDate.deleteMany({ where: { eventId } });
	const recurrenceDatesData = prepareRecurrenceDatesData(rdate, exdate);
	if (recurrenceDatesData) {
		updateData.recurrenceDates = recurrenceDatesData;
	}
}
