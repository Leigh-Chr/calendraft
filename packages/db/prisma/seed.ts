/**
 * Seed script for development database
 *
 * This script populates the database with realistic test data including:
 * - Users (authenticated)
 * - Calendars (with various colors and sources, including anonymous)
 * - Events (with different types, statuses, recurrence patterns)
 * - Event attendees, alarms, categories, and resources
 * - Share links and bundles
 *
 * Usage:
 *   bun run db:seed
 *
 * Note: This script will clear existing data before seeding.
 * Only run this in development environments!
 */
import prisma from "../src/index.js";
import { seedCalendars } from "./seed/calendars.js";
import { seedEvents } from "./seed/events.js";
import { seedShareBundles, seedShareLinks } from "./seed/share.js";
import { seedAccounts, seedSessions, seedUsers } from "./seed/users.js";

async function main() {
	console.log("🌱 Starting database seed...");

	// Clear existing data (in reverse order of dependencies)
	console.log("🧹 Cleaning existing data...");
	await prisma.recurrenceDate.deleteMany();
	await prisma.eventResource.deleteMany();
	await prisma.eventCategory.deleteMany();
	await prisma.eventAlarm.deleteMany();
	await prisma.eventAttendee.deleteMany();
	await prisma.event.deleteMany();
	await prisma.shareBundleCalendar.deleteMany();
	await prisma.calendarShareBundle.deleteMany();
	await prisma.calendarShareLink.deleteMany();
	await prisma.calendar.deleteMany();
	await prisma.session.deleteMany();
	await prisma.account.deleteMany();
	await prisma.verification.deleteMany();
	await prisma.user.deleteMany();

	// Seed in order of dependencies
	const users = await seedUsers();
	await seedAccounts(users);
	await seedSessions(users);

	const calendars = await seedCalendars(users);
	await seedEvents(calendars);
	await seedShareLinks(calendars);
	await seedShareBundles(calendars);

	console.log("✅ Database seeded successfully!");
	console.log("\n📊 Summary:");
	console.log("   - Users: 6");
	console.log("   - Calendars: 18");
	console.log("   - Events: 17");
	console.log("   - Attendees: 8");
	console.log("   - Alarms: 6");
	console.log("   - Categories: 17");
	console.log("   - Resources: 9");
	console.log("   - Recurrence dates: 3");
	console.log("   - Share links: 4");
	console.log("   - Share bundles: 3");
	console.log("   - Accounts: 4");
	console.log("   - Sessions: 3");
}

main()
	.catch((e) => {
		console.error("❌ Error seeding database:", e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
