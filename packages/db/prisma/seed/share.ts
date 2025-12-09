/**
 * Seed share links and bundles
 */
import prisma from "../../src/index.js";
import type { SeedCalendars } from "./calendars.js";
import { generateShareToken } from "./utils.js";

/**
 * Create share links
 */
export async function seedShareLinks(calendars: SeedCalendars): Promise<void> {
	console.log("🔗 Creating share links...");

	await prisma.calendarShareLink.createMany({
		data: [
			{
				calendarId: calendars.calAliceWorkMeetings.id,
				token: generateShareToken("work-meetings-share-abc"),
				name: "Partage calendrier travail",
				isActive: true,
				expiresAt: new Date("2025-12-31T23:59:59Z"),
				accessCount: 15,
				lastAccessedAt: new Date("2024-12-05T10:00:00Z"),
			},
			{
				calendarId: calendars.calAlicePersonal.id,
				token: generateShareToken("personal-share-xyz"),
				name: "Partage famille",
				isActive: true,
				expiresAt: null,
				accessCount: 42,
				lastAccessedAt: new Date("2024-12-06T15:30:00Z"),
			},
			{
				calendarId: calendars.calAliceSports.id,
				token: generateShareToken("sports-share-disabled"),
				name: null,
				isActive: false,
				expiresAt: new Date("2024-12-31T23:59:59Z"),
				accessCount: 3,
				lastAccessedAt: new Date("2024-11-20T08:00:00Z"),
			},
			{
				calendarId: calendars.calBobTeam.id,
				token: generateShareToken("bob-team-expired"),
				name: "Partage équipe (expiré)",
				isActive: true,
				expiresAt: new Date("2024-11-30T23:59:59Z"),
				accessCount: 8,
				lastAccessedAt: new Date("2024-11-25T10:00:00Z"),
			},
		],
	});
}

/**
 * Create share bundles
 */
export async function seedShareBundles(
	calendars: SeedCalendars,
): Promise<void> {
	console.log("📦 Creating share bundles...");

	const bundle1 = await prisma.calendarShareBundle.create({
		data: {
			token: generateShareToken("professional-bundle-001"),
			name: "Calendriers professionnels",
			isActive: true,
			expiresAt: new Date("2025-06-30T23:59:59Z"),
			removeDuplicates: true,
			accessCount: 8,
			lastAccessedAt: new Date("2024-12-04T09:00:00Z"),
		},
	});

	const bundle2 = await prisma.calendarShareBundle.create({
		data: {
			token: generateShareToken("family-bundle-002"),
			name: "Calendriers familiaux",
			isActive: true,
			expiresAt: null,
			removeDuplicates: false,
			accessCount: 25,
			lastAccessedAt: new Date("2024-12-07T18:00:00Z"),
		},
	});

	const bundle3 = await prisma.calendarShareBundle.create({
		data: {
			token: generateShareToken("work-bundle-disabled"),
			name: "Bundle travail (désactivé)",
			isActive: false,
			expiresAt: new Date("2025-12-31T23:59:59Z"),
			removeDuplicates: true,
			accessCount: 5,
			lastAccessedAt: new Date("2024-11-15T10:00:00Z"),
		},
	});

	// Add calendars to bundles (at least 2 per bundle)
	await prisma.shareBundleCalendar.createMany({
		data: [
			// Bundle 1 - Professional calendars
			{
				bundleId: bundle1.id,
				calendarId: calendars.calAliceWorkProjects.id,
				order: 0,
			},
			{
				bundleId: bundle1.id,
				calendarId: calendars.calAliceWorkMeetings.id,
				order: 1,
			},
			// Bundle 2 - Family calendars
			{
				bundleId: bundle2.id,
				calendarId: calendars.calAlicePersonal.id,
				order: 0,
			},
			{
				bundleId: bundle2.id,
				calendarId: calendars.calEvaFamily.id,
				order: 1,
			},
			{
				bundleId: bundle2.id,
				calendarId: calendars.calEvaSchool.id,
				order: 2,
			},
			// Bundle 3 - Work bundle
			{
				bundleId: bundle3.id,
				calendarId: calendars.calBobTeam.id,
				order: 0,
			},
			{
				bundleId: bundle3.id,
				calendarId: calendars.calBobClients.id,
				order: 1,
			},
		],
	});
}
