/**
 * Seed events and their relations (attendees, alarms, categories, resources, recurrence dates)
 */
import prisma from "../../src/index.js";
import type { SeedCalendars } from "./calendars.js";
import { createDate } from "./utils.js";

/**
 * Create all events and their relations
 */
export async function seedEvents(calendars: SeedCalendars): Promise<void> {
	console.log("📆 Creating events...");
	const now = new Date("2024-12-07T10:00:00Z"); // Reference date

	// 1. Meeting with all details
	const meetingStart = createDate(now, 3, 10, 0);
	const meetingEnd = createDate(now, 3, 11, 30);
	const meetingEvent = await prisma.event.create({
		data: {
			calendarId: calendars.calAliceWorkMeetings.id,
			title: "Réunion d'équipe - Sprint Planning",
			startDate: meetingStart,
			endDate: meetingEnd,
			description:
				"Planification du sprint pour les 2 prochaines semaines. Points à aborder: backlog, priorités, répartition des tâches.",
			location:
				"Salle de conférence A - Bâtiment Principal, 123 Rue Example, 75001 Paris",
			status: "CONFIRMED",
			priority: 5,
			class: "PUBLIC",
			transp: "OPAQUE",
			organizerName: "Alice Martin",
			organizerEmail: "alice.martin@example.com",
			url: "https://meet.example.com/room/sprint-planning",
			contact: "+33 1 23 45 67 89",
			comment: "Préparer les user stories avant la réunion",
			sequence: 0,
			rrule: null,
			geoLatitude: null,
			geoLongitude: null,
			recurrenceId: null,
			relatedTo: null,
			color: null,
			uid: "sprint-meeting-2024-12-10-001",
			dtstamp: new Date("2024-12-05T10:00:00Z"),
			created: new Date("2024-12-05T10:00:00Z"),
			lastModified: new Date("2024-12-05T10:00:00Z"),
		},
	});

	// 2. Event with geographic coordinates
	const lunchStart = createDate(now, 5, 12, 30);
	const lunchEnd = createDate(now, 5, 14, 0);
	const lunchEvent = await prisma.event.create({
		data: {
			calendarId: calendars.calAlicePersonal.id,
			title: "Déjeuner d'affaires",
			startDate: lunchStart,
			endDate: lunchEnd,
			description: "Déjeuner avec partenaire commercial",
			location:
				"Restaurant Le Jardin, 123 Rue de la République, 75001 Paris, France",
			status: "CONFIRMED",
			priority: 6,
			class: "PRIVATE",
			transp: "OPAQUE",
			organizerName: null,
			organizerEmail: null,
			url: null,
			contact: null,
			comment: null,
			sequence: 0,
			rrule: null,
			geoLatitude: 48.8566,
			geoLongitude: 2.3522,
			recurrenceId: null,
			relatedTo: null,
			color: "#10B981",
			uid: "lunch-business-2024-12-12-001",
			dtstamp: new Date("2024-12-05T10:00:00Z"),
			created: new Date("2024-12-05T10:00:00Z"),
			lastModified: new Date("2024-12-05T10:00:00Z"),
		},
	});

	// 3. Cancelled event (with sequence > 0)
	const cancelledStart = createDate(now, 8, 9, 0);
	const cancelledEnd = createDate(now, 8, 17, 0);
	const cancelledEvent = await prisma.event.create({
		data: {
			calendarId: calendars.calAliceTraining.id,
			title: "Formation annulée",
			startDate: cancelledStart,
			endDate: cancelledEnd,
			description:
				"Formation reportée à une date ultérieure. Nouvelle date à confirmer.",
			location: "Salle de formation",
			status: "CANCELLED",
			priority: null,
			class: "PUBLIC",
			transp: "OPAQUE",
			organizerName: null,
			organizerEmail: null,
			url: null,
			contact: null,
			comment: "Reporté pour cause de maladie du formateur",
			sequence: 1,
			rrule: null,
			geoLatitude: null,
			geoLongitude: null,
			recurrenceId: null,
			relatedTo: null,
			color: null,
			uid: "training-cancelled-2024-12-15-001",
			dtstamp: new Date("2024-12-06T14:00:00Z"),
			created: new Date("2024-12-01T10:00:00Z"),
			lastModified: new Date("2024-12-06T14:00:00Z"),
		},
	});

	// 4. Tentative event
	const tentativeStart = createDate(now, 11, 12, 0);
	const tentativeEnd = createDate(now, 11, 13, 30);
	const tentativeEvent = await prisma.event.create({
		data: {
			calendarId: calendars.calAlicePersonal.id,
			title: "Déjeuner avec partenaire (à confirmer)",
			startDate: tentativeStart,
			endDate: tentativeEnd,
			description: "En attente de confirmation du partenaire",
			location: "Restaurant à déterminer",
			status: "TENTATIVE",
			priority: null,
			class: "PRIVATE",
			transp: "OPAQUE",
			organizerName: null,
			organizerEmail: null,
			url: null,
			contact: null,
			comment: null,
			sequence: 0,
			rrule: null,
			geoLatitude: null,
			geoLongitude: null,
			recurrenceId: null,
			relatedTo: null,
			color: null,
			uid: "lunch-tentative-2024-12-18-001",
			dtstamp: new Date("2024-12-05T10:00:00Z"),
			created: new Date("2024-12-05T10:00:00Z"),
			lastModified: new Date("2024-12-05T10:00:00Z"),
		},
	});

	// 5. Event with high priority and CONFIDENTIAL class
	const presentationStart = createDate(now, 38, 14, 0);
	const presentationEnd = createDate(now, 38, 15, 30);
	const presentationEvent = await prisma.event.create({
		data: {
			calendarId: calendars.calAliceWorkMeetings.id,
			title: "Présentation client importante",
			startDate: presentationStart,
			endDate: presentationEnd,
			description:
				"Présentation du nouveau produit à notre client principal. Préparer la démo et les slides.",
			location: "Salle de conférence principale",
			status: "CONFIRMED",
			priority: 1,
			class: "CONFIDENTIAL",
			transp: "OPAQUE",
			organizerName: "Alice Martin",
			organizerEmail: "alice.martin@example.com",
			url: null,
			contact: null,
			comment: "Documents confidentiels requis",
			sequence: 0,
			rrule: null,
			geoLatitude: null,
			geoLongitude: null,
			recurrenceId: null,
			relatedTo: null,
			color: "#EF4444",
			uid: "presentation-client-2025-01-15-001",
			dtstamp: new Date("2024-12-05T10:00:00Z"),
			created: new Date("2024-12-05T10:00:00Z"),
			lastModified: new Date("2024-12-05T10:00:00Z"),
		},
	});

	// 6. Event with priority: 0 (undefined) and TRANSPARENT
	const casualStart = createDate(now, 2, 15, 0);
	const casualEnd = createDate(now, 2, 15, 30);
	const casualEvent = await prisma.event.create({
		data: {
			calendarId: calendars.calAliceWorkMeetings.id,
			title: "Discussion informelle",
			startDate: casualStart,
			endDate: casualEnd,
			description: "Discussion rapide avec l'équipe",
			location: null,
			status: "CONFIRMED",
			priority: 0,
			class: "PUBLIC",
			transp: "TRANSPARENT",
			organizerName: null,
			organizerEmail: null,
			url: null,
			contact: null,
			comment: null,
			sequence: 0,
			rrule: null,
			geoLatitude: null,
			geoLongitude: null,
			recurrenceId: null,
			relatedTo: null,
			color: null,
			uid: "casual-meeting-2024-12-09-001",
			dtstamp: new Date("2024-12-05T10:00:00Z"),
			created: new Date("2024-12-05T10:00:00Z"),
			lastModified: new Date("2024-12-05T10:00:00Z"),
		},
	});

	// 7. Multi-day event
	const conferenceStart = createDate(now, 60, 9, 0);
	const conferenceEnd = createDate(now, 62, 18, 0);
	const conferenceEvent = await prisma.event.create({
		data: {
			calendarId: calendars.calAliceTraining.id,
			title: "Conférence Tech 2025",
			startDate: conferenceStart,
			endDate: conferenceEnd,
			description:
				"Conférence annuelle sur les technologies web. 3 jours de conférences, ateliers et networking.",
			location: "Palais des Congrès, Paris",
			status: "CONFIRMED",
			priority: 3,
			class: "PUBLIC",
			transp: "OPAQUE",
			organizerName: "Tech Conference Org",
			organizerEmail: "contact@techconf.example.com",
			url: "https://techconf.example.com",
			contact: "+33 1 23 45 67 89",
			comment: "Badge à récupérer à l'accueil",
			sequence: 0,
			rrule: null,
			geoLatitude: 48.8566,
			geoLongitude: 2.3522,
			recurrenceId: null,
			relatedTo: null,
			color: "#8B5CF6",
			uid: "conference-tech-2025-001",
			dtstamp: new Date("2024-12-05T10:00:00Z"),
			created: new Date("2024-12-05T10:00:00Z"),
			lastModified: new Date("2024-12-05T10:00:00Z"),
		},
	});

	// 8. Recurring daily event
	const standupStart = createDate(now, 3, 9, 0);
	const standupEnd = createDate(now, 3, 9, 15);
	const standupEvent = await prisma.event.create({
		data: {
			calendarId: calendars.calAliceWorkMeetings.id,
			title: "Daily Standup",
			startDate: standupStart,
			endDate: standupEnd,
			description: "Point quotidien avec l'équipe",
			location: "Zoom",
			status: "CONFIRMED",
			priority: 5,
			class: "PUBLIC",
			transp: "OPAQUE",
			organizerName: null,
			organizerEmail: null,
			url: "https://zoom.us/j/123456789",
			contact: null,
			comment: null,
			sequence: 0,
			rrule: "FREQ=DAILY;COUNT=30",
			geoLatitude: null,
			geoLongitude: null,
			recurrenceId: null,
			relatedTo: null,
			color: null,
			uid: "standup-daily-2024-12-10-001",
			dtstamp: new Date("2024-12-05T10:00:00Z"),
			created: new Date("2024-12-05T10:00:00Z"),
			lastModified: new Date("2024-12-05T10:00:00Z"),
		},
	});

	// 9. Recurring weekly event
	const yogaStart = createDate(now, 9, 18, 0);
	const yogaEnd = createDate(now, 9, 19, 30);
	const yogaEvent = await prisma.event.create({
		data: {
			calendarId: calendars.calAliceSports.id,
			title: "Cours de yoga",
			startDate: yogaStart,
			endDate: yogaEnd,
			description: "Cours de yoga hebdomadaire",
			location: "Studio Zen, 45 Avenue des Champs, 75008 Paris",
			status: "CONFIRMED",
			priority: null,
			class: "PRIVATE",
			transp: "OPAQUE",
			organizerName: null,
			organizerEmail: null,
			url: null,
			contact: null,
			comment: null,
			sequence: 0,
			rrule: "FREQ=WEEKLY;BYDAY=MO;COUNT=12",
			geoLatitude: null,
			geoLongitude: null,
			recurrenceId: null,
			relatedTo: null,
			color: null,
			uid: "yoga-weekly-2024-12-16-001",
			dtstamp: new Date("2024-12-05T10:00:00Z"),
			created: new Date("2024-12-05T10:00:00Z"),
			lastModified: new Date("2024-12-05T10:00:00Z"),
		},
	});

	// 10. Recurring monthly event
	const monthlyStart = createDate(now, 13, 14, 0);
	const monthlyEnd = createDate(now, 13, 16, 0);
	const monthlyEvent = await prisma.event.create({
		data: {
			calendarId: calendars.calBobTeam.id,
			title: "Réunion mensuelle d'équipe",
			startDate: monthlyStart,
			endDate: monthlyEnd,
			description: "Bilan mensuel et planification",
			location: "Salle de réunion principale",
			status: "CONFIRMED",
			priority: 4,
			class: "PUBLIC",
			transp: "OPAQUE",
			organizerName: "Bob Dupont",
			organizerEmail: "bob.dupont@example.com",
			url: null,
			contact: null,
			comment: null,
			sequence: 0,
			rrule: "FREQ=MONTHLY;BYMONTHDAY=20;COUNT=12",
			geoLatitude: null,
			geoLongitude: null,
			recurrenceId: null,
			relatedTo: null,
			color: null,
			uid: "meeting-monthly-2024-12-20-001",
			dtstamp: new Date("2024-12-05T10:00:00Z"),
			created: new Date("2024-12-05T10:00:00Z"),
			lastModified: new Date("2024-12-05T10:00:00Z"),
		},
	});

	// 11. Recurring annual event
	const birthdayStart = createDate(now, 191, 18, 0);
	const birthdayEnd = createDate(now, 191, 22, 0);
	const birthdayEvent = await prisma.event.create({
		data: {
			calendarId: calendars.calAlicePersonal.id,
			title: "Anniversaire de Marie",
			startDate: birthdayStart,
			endDate: birthdayEnd,
			description: "Fête d'anniversaire",
			location: "Restaurant Le Jardin",
			status: "CONFIRMED",
			priority: null,
			class: "PRIVATE",
			transp: "OPAQUE",
			organizerName: null,
			organizerEmail: null,
			url: null,
			contact: null,
			comment: null,
			sequence: 0,
			rrule: "FREQ=YEARLY;BYMONTH=6;BYMONTHDAY=15",
			geoLatitude: null,
			geoLongitude: null,
			recurrenceId: null,
			relatedTo: null,
			color: null,
			uid: "birthday-marie-2025-06-15-001",
			dtstamp: new Date("2024-12-05T10:00:00Z"),
			created: new Date("2024-12-05T10:00:00Z"),
			lastModified: new Date("2024-12-05T10:00:00Z"),
		},
	});

	// 12. Recurring biweekly event
	const biweeklyStart = createDate(now, 4, 10, 0);
	const biweeklyEnd = createDate(now, 4, 11, 0);
	const biweeklyEvent = await prisma.event.create({
		data: {
			calendarId: calendars.calBobTeam.id,
			title: "Réunion bimensuelle",
			startDate: biweeklyStart,
			endDate: biweeklyEnd,
			description: "Réunion toutes les 2 semaines",
			location: "Salle de réunion",
			status: "CONFIRMED",
			priority: 5,
			class: "PUBLIC",
			transp: "OPAQUE",
			organizerName: null,
			organizerEmail: null,
			url: null,
			contact: null,
			comment: null,
			sequence: 0,
			rrule: "FREQ=WEEKLY;INTERVAL=2;COUNT=26",
			geoLatitude: null,
			geoLongitude: null,
			recurrenceId: null,
			relatedTo: null,
			color: null,
			uid: "meeting-biweekly-2024-12-11-001",
			dtstamp: new Date("2024-12-05T10:00:00Z"),
			created: new Date("2024-12-05T10:00:00Z"),
			lastModified: new Date("2024-12-05T10:00:00Z"),
		},
	});

	// 13. Recurring complex event (multiple days)
	const languageStart = createDate(now, 2, 19, 0);
	const languageEnd = createDate(now, 2, 20, 30);
	const languageEvent = await prisma.event.create({
		data: {
			calendarId: calendars.calClaireUniversity.id,
			title: "Cours d'anglais",
			startDate: languageStart,
			endDate: languageEnd,
			description: "Cours d'anglais niveau avancé",
			location: "École de langues, Bâtiment B",
			status: "CONFIRMED",
			priority: null,
			class: "PUBLIC",
			transp: "OPAQUE",
			organizerName: null,
			organizerEmail: null,
			url: null,
			contact: null,
			comment: null,
			sequence: 0,
			rrule: "FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=36",
			geoLatitude: null,
			geoLongitude: null,
			recurrenceId: null,
			relatedTo: null,
			color: null,
			uid: "language-course-2024-12-09-001",
			dtstamp: new Date("2024-12-05T10:00:00Z"),
			created: new Date("2024-12-05T10:00:00Z"),
			lastModified: new Date("2024-12-05T10:00:00Z"),
		},
	});

	// 14. Event with RECURRENCE-ID (recurrence exception)
	const standupExceptionStart = createDate(now, 10, 9, 0);
	const standupExceptionEnd = createDate(now, 10, 9, 15);
	const standupExceptionEvent = await prisma.event.create({
		data: {
			calendarId: calendars.calAliceWorkMeetings.id,
			title: "Daily Standup (Exception)",
			startDate: standupExceptionStart,
			endDate: standupExceptionEnd,
			description: "Standup exceptionnel avec ordre du jour spécial",
			location: "Salle de réunion (pas Zoom)",
			status: "CONFIRMED",
			priority: 5,
			class: "PUBLIC",
			transp: "OPAQUE",
			organizerName: null,
			organizerEmail: null,
			url: null,
			contact: null,
			comment: "Exception: réunion en présentiel",
			sequence: 0,
			rrule: null,
			geoLatitude: null,
			geoLongitude: null,
			recurrenceId: "20241217T090000Z",
			relatedTo: "standup-daily-2024-12-10-001",
			color: null,
			uid: "standup-exception-2024-12-17-001",
			dtstamp: new Date("2024-12-05T10:00:00Z"),
			created: new Date("2024-12-05T10:00:00Z"),
			lastModified: new Date("2024-12-05T10:00:00Z"),
		},
	});

	// 15. Event with RELATED-TO
	const followUpStart = createDate(now, 39, 10, 0);
	const followUpEnd = createDate(now, 39, 10, 30);
	const followUpEvent = await prisma.event.create({
		data: {
			calendarId: calendars.calAliceWorkMeetings.id,
			title: "Follow-up Présentation client",
			startDate: followUpStart,
			endDate: followUpEnd,
			description: "Suivi de la présentation d'hier",
			location: null,
			status: "CONFIRMED",
			priority: 2,
			class: "CONFIDENTIAL",
			transp: "OPAQUE",
			organizerName: null,
			organizerEmail: null,
			url: null,
			contact: null,
			comment: null,
			sequence: 0,
			rrule: null,
			geoLatitude: null,
			geoLongitude: null,
			recurrenceId: null,
			relatedTo: "presentation-client-2025-01-15-001",
			color: null,
			uid: "follow-up-presentation-2025-01-16-001",
			dtstamp: new Date("2024-12-05T10:00:00Z"),
			created: new Date("2024-12-05T10:00:00Z"),
			lastModified: new Date("2024-12-05T10:00:00Z"),
		},
	});

	// 16. Event for Bob
	const bobTrainingStart = createDate(now, 3, 14, 0);
	const bobTrainingEnd = createDate(now, 3, 17, 0);
	const bobTrainingEvent = await prisma.event.create({
		data: {
			calendarId: calendars.calBobTeam.id,
			title: "Formation technique",
			startDate: bobTrainingStart,
			endDate: bobTrainingEnd,
			description: "Formation sur les nouvelles technologies",
			location: "Salle de formation",
			status: "CONFIRMED",
			priority: null,
			class: "PUBLIC",
			transp: "OPAQUE",
			organizerName: null,
			organizerEmail: null,
			url: null,
			contact: null,
			comment: null,
			sequence: 0,
			rrule: null,
			geoLatitude: null,
			geoLongitude: null,
			recurrenceId: null,
			relatedTo: null,
			color: null,
			uid: "training-bob-2024-12-10-001",
			dtstamp: new Date("2024-12-05T10:00:00Z"),
			created: new Date("2024-12-05T10:00:00Z"),
			lastModified: new Date("2024-12-05T10:00:00Z"),
		},
	});

	// 17. Exam for Claire
	const examStart = createDate(now, 20, 9, 0);
	const examEnd = createDate(now, 20, 12, 0);
	const examEvent = await prisma.event.create({
		data: {
			calendarId: calendars.calClaireExams.id,
			title: "Examen final - Mathématiques",
			startDate: examStart,
			endDate: examEnd,
			description: "Examen final de mathématiques - Salle 201",
			location: "Université, Bâtiment A, Salle 201",
			status: "CONFIRMED",
			priority: 1,
			class: "PUBLIC",
			transp: "OPAQUE",
			organizerName: null,
			organizerEmail: null,
			url: null,
			contact: null,
			comment: "Apporter calculatrice et pièce d'identité",
			sequence: 0,
			rrule: null,
			geoLatitude: null,
			geoLongitude: null,
			recurrenceId: null,
			relatedTo: null,
			color: "#DC2626",
			uid: "exam-math-2024-12-27-001",
			dtstamp: new Date("2024-12-05T10:00:00Z"),
			created: new Date("2024-12-05T10:00:00Z"),
			lastModified: new Date("2024-12-05T10:00:00Z"),
		},
	});

	// Create attendees
	console.log("👥 Creating attendees...");
	await prisma.eventAttendee.createMany({
		data: [
			// For sprint meeting
			{
				eventId: meetingEvent.id,
				name: "Bob Dupont",
				email: "bob.dupont@example.com",
				role: "REQ_PARTICIPANT",
				status: "ACCEPTED",
				rsvp: true,
			},
			{
				eventId: meetingEvent.id,
				name: "Claire Bernard",
				email: "claire.bernard@example.com",
				role: "REQ_PARTICIPANT",
				status: "TENTATIVE",
				rsvp: true,
			},
			{
				eventId: meetingEvent.id,
				name: "David Chen",
				email: "david.chen@example.com",
				role: "OPT_PARTICIPANT",
				status: "NEEDS_ACTION",
				rsvp: true,
			},
			// For presentation
			{
				eventId: presentationEvent.id,
				name: "Directeur Commercial",
				email: "directeur@client.com",
				role: "CHAIR",
				status: "ACCEPTED",
				rsvp: true,
			},
			{
				eventId: presentationEvent.id,
				name: "Alice Martin",
				email: "alice.martin@example.com",
				role: "REQ_PARTICIPANT",
				status: "ACCEPTED",
				rsvp: true,
			},
			{
				eventId: presentationEvent.id,
				name: "Bob Dupont",
				email: "bob.dupont@example.com",
				role: "REQ_PARTICIPANT",
				status: "ACCEPTED",
				rsvp: true,
			},
			{
				eventId: presentationEvent.id,
				name: "Assistante",
				email: "assistante@client.com",
				role: "NON_PARTICIPANT",
				status: "DECLINED",
				rsvp: false,
			},
			// For monthly meeting with DELEGATED status
			{
				eventId: monthlyEvent.id,
				name: "Eva Rodriguez",
				email: "eva.rodriguez@example.com",
				role: "REQ_PARTICIPANT",
				status: "DELEGATED",
				rsvp: true,
			},
		],
	});

	// Create alarms (RFC 5545 compliant)
	console.log("⏰ Creating alarms...");
	await prisma.eventAlarm.createMany({
		data: [
			// DISPLAY alarm (requires summary)
			{
				eventId: meetingEvent.id,
				trigger: "-PT15M",
				action: "DISPLAY",
				summary: "Réunion d'équipe dans 15 minutes",
				description: null,
				duration: null,
				repeat: null,
			},
			// EMAIL alarm (requires summary AND description)
			{
				eventId: presentationEvent.id,
				trigger: "-P1D",
				action: "EMAIL",
				summary: "Rappel: Présentation client demain",
				description:
					"N'oubliez pas de préparer votre présentation et les documents nécessaires.",
				duration: null,
				repeat: null,
			},
			{
				eventId: presentationEvent.id,
				trigger: "-PT1H",
				action: "DISPLAY",
				summary: "Présentation client dans 1 heure",
				description: null,
				duration: null,
				repeat: null,
			},
			{
				eventId: presentationEvent.id,
				trigger: "-PT15M",
				action: "DISPLAY",
				summary: "Présentation client dans 15 minutes",
				description: null,
				duration: null,
				repeat: null,
			},
			// AUDIO alarm (summary can be null)
			{
				eventId: standupEvent.id,
				trigger: "-PT5M",
				action: "AUDIO",
				summary: null,
				description: null,
				duration: null,
				repeat: null,
			},
			// Alarm with repetition
			{
				eventId: examEvent.id,
				trigger: "-PT10M",
				action: "DISPLAY",
				summary: "Examen dans 10 minutes",
				description: null,
				duration: "PT5M",
				repeat: 3,
			},
		],
	});

	// Create categories
	console.log("🏷️ Creating categories...");
	await prisma.eventCategory.createMany({
		data: [
			{ eventId: meetingEvent.id, category: "Travail" },
			{ eventId: meetingEvent.id, category: "Réunion" },
			{ eventId: meetingEvent.id, category: "Équipe" },
			{ eventId: lunchEvent.id, category: "Personnel" },
			{ eventId: birthdayEvent.id, category: "Personnel" },
			{ eventId: birthdayEvent.id, category: "Fête" },
			{ eventId: birthdayEvent.id, category: "Anniversaire" },
			{ eventId: yogaEvent.id, category: "Sport" },
			{ eventId: yogaEvent.id, category: "Fitness" },
			{ eventId: yogaEvent.id, category: "Yoga" },
			{ eventId: conferenceEvent.id, category: "Formation" },
			{ eventId: conferenceEvent.id, category: "Conférence" },
			{ eventId: conferenceEvent.id, category: "Networking" },
			{ eventId: languageEvent.id, category: "Éducation" },
			{ eventId: languageEvent.id, category: "Université" },
			{ eventId: examEvent.id, category: "Éducation" },
			{ eventId: examEvent.id, category: "Examen" },
		],
	});

	// Create resources
	console.log("📦 Creating resources...");
	await prisma.eventResource.createMany({
		data: [
			{ eventId: meetingEvent.id, resource: "Projecteur" },
			{ eventId: meetingEvent.id, resource: "Tableau blanc" },
			{ eventId: meetingEvent.id, resource: "Microphone" },
			{
				eventId: presentationEvent.id,
				resource: "Salle de conférence principale",
			},
			{ eventId: presentationEvent.id, resource: "Projecteur HD" },
			{ eventId: presentationEvent.id, resource: "WiFi" },
			{ eventId: conferenceEvent.id, resource: "Parking" },
			{ eventId: conferenceEvent.id, resource: "WiFi" },
			{ eventId: conferenceEvent.id, resource: "Catering" },
		],
	});

	// Create recurrence dates
	console.log("📅 Creating recurrence dates...");
	await prisma.recurrenceDate.createMany({
		data: [
			// EXDATE - Exception for daily standup (skip Dec 17)
			{
				eventId: standupEvent.id,
				date: createDate(now, 10, 9, 0),
				type: "EXDATE",
			},
			// EXDATE - Exception for yoga (skip Christmas)
			{
				eventId: yogaEvent.id,
				date: createDate(now, 18, 18, 0),
				type: "EXDATE",
			},
			// RDATE - Additional date for daily standup
			{
				eventId: standupEvent.id,
				date: createDate(now, 7, 9, 0),
				type: "RDATE",
			},
		],
	});
}
