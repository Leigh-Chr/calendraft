/**
 * Seed calendars
 */

import type { CalendarModel } from "../../src/index.js";
import prisma from "../../src/index.js";
import type { SeedUsers } from "./users.js";
import { generateAnonymousId } from "./utils.js";

export interface SeedCalendars {
	calAliceWorkProjects: Pick<CalendarModel, "id">;
	calAliceWorkMeetings: Pick<CalendarModel, "id">;
	calAlicePersonal: Pick<CalendarModel, "id">;
	calAliceSports: Pick<CalendarModel, "id">;
	calAliceTraining: Pick<CalendarModel, "id">;
	calBobTeam: Pick<CalendarModel, "id">;
	calBobClients: Pick<CalendarModel, "id">;
	calClaireUniversity: Pick<CalendarModel, "id">;
	calClaireExams: Pick<CalendarModel, "id">;
	calDavidProject1: Pick<CalendarModel, "id">;
	calDavidProject2: Pick<CalendarModel, "id">;
	calDavidPersonal: Pick<CalendarModel, "id">;
	calEvaFamily: Pick<CalendarModel, "id">;
	calEvaSchool: Pick<CalendarModel, "id">;
	calAnon1: Pick<CalendarModel, "id">;
	calAnon2: Pick<CalendarModel, "id">;
	calAnonEmpty: Pick<CalendarModel, "id">;
	calNullUser: Pick<CalendarModel, "id">;
}

/**
 * Create all calendars
 */
export async function seedCalendars(users: SeedUsers): Promise<SeedCalendars> {
	console.log("📅 Creating calendars...");

	const calAliceWorkProjects = await prisma.calendar.create({
		data: {
			name: "Travail - Projets",
			color: "#3B82F6",
			userId: users.userAlice.id,
			sourceUrl: null,
			lastSyncedAt: null,
		},
	});

	const calAliceWorkMeetings = await prisma.calendar.create({
		data: {
			name: "Travail - Réunions",
			color: "#8B5CF6",
			userId: users.userAlice.id,
			sourceUrl: null,
			lastSyncedAt: null,
		},
	});

	const calAlicePersonal = await prisma.calendar.create({
		data: {
			name: "Personnel",
			color: "#10B981",
			userId: users.userAlice.id,
			sourceUrl: null,
			lastSyncedAt: null,
		},
	});

	const calAliceSports = await prisma.calendar.create({
		data: {
			name: "Sport & Fitness",
			color: "#F59E0B",
			userId: users.userAlice.id,
			sourceUrl:
				"https://calendar.google.com/ical/sports%40example.com/public/basic.ics",
			lastSyncedAt: new Date("2024-12-01T08:00:00Z"),
		},
	});

	const calAliceTraining = await prisma.calendar.create({
		data: {
			name: "Formations & Conférences",
			color: "#EF4444",
			userId: users.userAlice.id,
			sourceUrl: null,
			lastSyncedAt: null,
		},
	});

	const calBobTeam = await prisma.calendar.create({
		data: {
			name: "Bureau - Équipe",
			color: "#6366F1",
			userId: users.userBob.id,
			sourceUrl: null,
			lastSyncedAt: null,
		},
	});

	const calBobClients = await prisma.calendar.create({
		data: {
			name: "Bureau - Clients",
			color: "#14B8A6",
			userId: users.userBob.id,
			sourceUrl: null,
			lastSyncedAt: null,
		},
	});

	const calClaireUniversity = await prisma.calendar.create({
		data: {
			name: "Cours Université",
			color: "#EC4899",
			userId: users.userClaire.id,
			sourceUrl: "https://university.example.com/calendar.ics",
			lastSyncedAt: new Date("2024-12-05T07:00:00Z"),
		},
	});

	const calClaireExams = await prisma.calendar.create({
		data: {
			name: "Examens",
			color: "#DC2626",
			userId: users.userClaire.id,
			sourceUrl: null,
			lastSyncedAt: null,
		},
	});

	const calDavidProject1 = await prisma.calendar.create({
		data: {
			name: "Projet Alpha",
			color: "#06B6D4",
			userId: users.userDavid.id,
			sourceUrl: null,
			lastSyncedAt: null,
		},
	});

	const calDavidProject2 = await prisma.calendar.create({
		data: {
			name: "Projet Beta",
			color: "#84CC16",
			userId: users.userDavid.id,
			sourceUrl: null,
			lastSyncedAt: null,
		},
	});

	const calDavidPersonal = await prisma.calendar.create({
		data: {
			name: "Personnel",
			color: "#F97316",
			userId: users.userDavid.id,
			sourceUrl: null,
			lastSyncedAt: null,
		},
	});

	const calEvaFamily = await prisma.calendar.create({
		data: {
			name: "Famille",
			color: "#A855F7",
			userId: users.userEva.id,
			sourceUrl: null,
			lastSyncedAt: null,
		},
	});

	const calEvaSchool = await prisma.calendar.create({
		data: {
			name: "École des enfants",
			color: "#22C55E",
			userId: users.userEva.id,
			sourceUrl: null,
			lastSyncedAt: null,
		},
	});

	// Anonymous calendars (format: anon-[32 characters])
	const calAnon1 = await prisma.calendar.create({
		data: {
			name: "Calendrier temporaire",
			color: "#6B7280",
			userId: generateAnonymousId("temp-calendar-001"),
			sourceUrl: null,
			lastSyncedAt: null,
		},
	});

	const calAnon2 = await prisma.calendar.create({
		data: {
			name: "Événements locaux",
			color: "#059669",
			userId: generateAnonymousId("local-events-002"),
			sourceUrl: null,
			lastSyncedAt: null,
		},
	});

	const calAnonEmpty = await prisma.calendar.create({
		data: {
			name: "Calendrier vide",
			color: "#9CA3AF",
			userId: generateAnonymousId("empty-calendar-003"),
			sourceUrl: null,
			lastSyncedAt: null,
		},
	});

	// Calendar with userId: null (edge case)
	const calNullUser = await prisma.calendar.create({
		data: {
			name: "Calendrier orphelin",
			color: "#DC2626",
			userId: null,
			sourceUrl: null,
			lastSyncedAt: null,
		},
	});

	return {
		calAliceWorkProjects,
		calAliceWorkMeetings,
		calAlicePersonal,
		calAliceSports,
		calAliceTraining,
		calBobTeam,
		calBobClients,
		calClaireUniversity,
		calClaireExams,
		calDavidProject1,
		calDavidProject2,
		calDavidPersonal,
		calEvaFamily,
		calEvaSchool,
		calAnon1,
		calAnon2,
		calAnonEmpty,
		calNullUser,
	};
}
