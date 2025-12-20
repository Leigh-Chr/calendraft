import type { ValidationErrors } from "@calendraft/schemas";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { Copy, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Breadcrumb } from "@/components/breadcrumb";
import {
	type EventFormData,
	EventFormExtended,
} from "@/components/event-form-extended";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { transformEventFormDataForUpdate } from "@/lib/event-form-transform";
import {
	getFirstValidationError,
	handleTRPCMutationError,
} from "@/lib/parse-trpc-errors";
import { QUERY_KEYS } from "@/lib/query-keys";
import { trpc } from "@/utils/trpc";

// Helper types for event data fields
interface CategoryItem {
	category: string;
}
interface ResourceItem {
	resource: string;
}
interface RecurrenceDateItem {
	type: string;
	date: string | Date;
}
interface AttendeeItem {
	name: string | null;
	email: string;
	role: string | null;
	status: string | null;
	rsvp: boolean;
}
interface AlarmItem {
	trigger: string;
	action: string;
	summary: string | null;
	description: string | null;
	duration: string | null;
	repeat: number | null;
}

/**
 * Transform categories to comma-separated string
 */
function transformCategories(
	categories: CategoryItem[] | string | null | undefined,
): string {
	if (Array.isArray(categories)) {
		return categories.map((c) => c.category).join(",");
	}
	return typeof categories === "string" ? categories : "";
}

/**
 * Transform resources to comma-separated string
 */
function transformResources(
	resources: ResourceItem[] | string | null | undefined,
): string {
	if (Array.isArray(resources)) {
		return resources.map((r) => r.resource).join(",");
	}
	return typeof resources === "string" ? resources : "";
}

/**
 * Transform recurrence dates to JSON string
 */
function transformRecurrenceDates(
	recurrenceDates: RecurrenceDateItem[] | null | undefined,
	type: "RDATE" | "EXDATE",
): string {
	if (!Array.isArray(recurrenceDates)) return "";

	const dates = recurrenceDates
		.filter((rd) => rd.type === type)
		.map((rd) => new Date(rd.date).toISOString());

	return dates.length > 0 ? JSON.stringify(dates) : "";
}

/**
 * Transform attendees from API format
 */
function transformAttendees(attendees: AttendeeItem[] | null | undefined) {
	return attendees?.map((a) => ({
		name: a.name || undefined,
		email: a.email,
		role: a.role || undefined,
		status: a.status || undefined,
		rsvp: a.rsvp ?? false,
	}));
}

/**
 * Transform alarms from API format
 */
function transformAlarms(alarms: AlarmItem[] | null | undefined) {
	return alarms?.map((a) => ({
		trigger: a.trigger,
		action: a.action,
		summary: a.summary || undefined,
		description: a.description || undefined,
		duration: a.duration || undefined,
		repeat: a.repeat ?? undefined,
	}));
}

// Event data type from API (simplified for transformation)
interface EventDataForTransform {
	title: string;
	startDate: string | Date;
	endDate: string | Date;
	description: string | null;
	location: string | null;
	status: string | null;
	priority: number | null;
	categories: CategoryItem[] | null;
	url: string | null;
	class: string | null;
	comment: string | null;
	contact: string | null;
	resources: ResourceItem[] | null;
	sequence: number | null;
	transp: string | null;
	rrule: string | null;
	recurrenceDates: RecurrenceDateItem[] | null;
	geoLatitude: number | null;
	geoLongitude: number | null;
	organizerName: string | null;
	organizerEmail: string | null;
	uid: string | null;
	recurrenceId: string | null;
	relatedTo: string | null;
	color: string | null;
	attendees: AttendeeItem[] | null;
	alarms: AlarmItem[] | null;
}

// Helper: Convert nullable string to empty string
const str = (value: string | null | undefined): string => value ?? "";

// Helper: Convert nullable value to undefined
function opt<T>(value: T | null | undefined): T | undefined {
	return value ?? undefined;
}

/**
 * Transform basic event fields
 */
function transformBasicFields(event: EventDataForTransform) {
	return {
		title: event.title,
		startDate: format(new Date(event.startDate), "yyyy-MM-dd'T'HH:mm"),
		endDate: format(new Date(event.endDate), "yyyy-MM-dd'T'HH:mm"),
		description: str(event.description),
		location: str(event.location),
		url: str(event.url),
		comment: str(event.comment),
		contact: str(event.contact),
	};
}

/**
 * Transform optional enum/number fields
 */
function transformOptionalFields(event: EventDataForTransform) {
	return {
		status: opt(event.status),
		priority: opt(event.priority),
		class: opt(event.class),
		transp: opt(event.transp),
		sequence: event.sequence ?? 0,
		geoLatitude: opt(event.geoLatitude),
		geoLongitude: opt(event.geoLongitude),
	};
}

/**
 * Transform organizer and id fields
 */
function transformOrganizerFields(event: EventDataForTransform) {
	return {
		organizerName: str(event.organizerName),
		organizerEmail: str(event.organizerEmail),
		uid: str(event.uid),
		recurrenceId: str(event.recurrenceId),
		relatedTo: str(event.relatedTo),
		color: str(event.color),
	};
}

/**
 * Transform event data from API to form data
 */
function transformEventToFormData(
	event: EventDataForTransform,
): Partial<EventFormData> {
	return {
		...transformBasicFields(event),
		...transformOptionalFields(event),
		...transformOrganizerFields(event),
		categories: transformCategories(event.categories),
		resources: transformResources(event.resources),
		rrule: str(event.rrule),
		rdate: transformRecurrenceDates(event.recurrenceDates, "RDATE"),
		exdate: transformRecurrenceDates(event.recurrenceDates, "EXDATE"),
		attendees: transformAttendees(event.attendees),
		alarms: transformAlarms(event.alarms),
	};
}

/**
 * Loading state component
 */
function LoadingState() {
	return (
		<div className="container mx-auto max-w-2xl px-4 py-6 sm:py-10">
			<div className="text-center">Loading...</div>
		</div>
	);
}

/**
 * Not found state component
 */
function NotFoundState() {
	return (
		<div className="container mx-auto max-w-2xl px-4 py-6 sm:py-10">
			<div className="text-center">Event not found</div>
		</div>
	);
}

/**
 * Duplicate Dialog Component
 */
function DuplicateDialog({
	open,
	onOpenChange,
	dayOffset,
	onDayOffsetChange,
	onDuplicate,
	isPending,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	dayOffset: number;
	onDayOffsetChange: (offset: number) => void;
	onDuplicate: () => void;
	isPending: boolean;
}) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Duplicate event</AlertDialogTitle>
					<AlertDialogDescription>
						Create a copy of this event. You can shift the dates if necessary.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<div className="space-y-4 py-4">
					<div className="space-y-2">
						<Label htmlFor="day-offset">Day offset</Label>
						<Input
							id="day-offset"
							type="number"
							value={dayOffset}
							onChange={(e) => {
								onDayOffsetChange(Number.parseInt(e.target.value, 10) || 0);
							}}
							placeholder="0"
						/>
						<p className="text-muted-foreground text-xs">
							0 = same date, 7 = one week later, -7 = one week earlier
						</p>
					</div>
				</div>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction onClick={onDuplicate} disabled={isPending}>
						{isPending ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Duplicating...
							</>
						) : (
							"Duplicate"
						)}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export const Route = createFileRoute("/calendars/$calendarId/events/$eventId")({
	component: EditEventComponent,
	head: () => ({
		meta: [
			{ title: "Edit event - Calendraft" },
			{ name: "robots", content: "noindex, nofollow" },
		],
	}),
});

function EditEventComponent() {
	const { calendarId, eventId } = Route.useParams();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [serverValidationErrors, setServerValidationErrors] = useState<
		ValidationErrors | undefined
	>();
	const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
	const [dayOffset, setDayOffset] = useState(0);

	const { data: event, isLoading } = useQuery({
		...trpc.event.getById.queryOptions({ id: eventId }),
		enabled: !!eventId,
	});

	const { data: calendar } = useQuery({
		...trpc.calendar.getById.queryOptions({ id: calendarId }),
	});

	const duplicateMutation = useMutation(
		trpc.event.duplicate.mutationOptions({
			onSuccess: (duplicatedEvent) => {
				void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.event.all });
				void queryClient.invalidateQueries({
					queryKey: QUERY_KEYS.calendar.byId(calendarId),
				});
				toast.success("Event duplicated successfully");
				setDuplicateDialogOpen(false);
				// Navigate to the new event
				navigate({
					to: `/calendars/${calendarId}/events/${duplicatedEvent.id}`,
				});
			},
			onError: (error: unknown) => {
				const message =
					error instanceof Error ? error.message : "Error during duplication";
				toast.error(message);
			},
		}),
	);

	const handleDuplicate = () => {
		duplicateMutation.mutate({
			id: eventId,
			dayOffset,
		});
	};

	const updateMutation = useMutation(
		trpc.event.update.mutationOptions({
			onSuccess: () => {
				void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.event.all });
				void queryClient.invalidateQueries({
					queryKey: QUERY_KEYS.calendar.byId(calendarId),
				});
				void queryClient.invalidateQueries({
					queryKey: QUERY_KEYS.dashboard.all,
				});
				toast.success("Event updated successfully");
				navigate({ to: `/calendars/${calendarId}` });
			},
			onError: (error: unknown) => {
				handleTRPCMutationError(error, {
					onValidationError: (errors) => {
						setServerValidationErrors(errors);
						toast.error(getFirstValidationError(errors));
					},
					onGenericError: (message) => {
						toast.error(message);
					},
				});
			},
		}),
	);

	const handleSubmit = (data: EventFormData) => {
		// Clear server validation errors on new submit
		setServerValidationErrors(undefined);
		updateMutation.mutate({
			id: eventId,
			...transformEventFormDataForUpdate(data),
		});
	};

	if (isLoading) {
		return <LoadingState />;
	}

	if (!event) {
		return <NotFoundState />;
	}

	const initialData = transformEventToFormData(event);

	return (
		<div className="relative min-h-[calc(100vh-4rem)]">
			{/* Subtle background */}
			<div className="-z-10 pointer-events-none absolute inset-0">
				<div className="gradient-mesh absolute inset-0 opacity-25" />
			</div>

			<div className="container mx-auto max-w-4xl space-y-4 px-4 py-6 sm:py-10">
				<div className="flex items-center justify-between">
					<Breadcrumb
						items={[
							{
								label: calendar?.name || "Calendar",
								href: `/calendars/${calendarId}`,
							},
							{ label: event?.title || "Event" },
						]}
					/>
					<Button
						variant="outline"
						size="sm"
						onClick={() => setDuplicateDialogOpen(true)}
					>
						<Copy className="mr-2 h-4 w-4" />
						Duplicate
					</Button>
				</div>
				<EventFormExtended
					mode="edit"
					initialData={initialData}
					onSubmit={handleSubmit}
					onCancel={() => navigate({ to: `/calendars/${calendarId}` })}
					isSubmitting={updateMutation.isPending}
					calendarId={calendarId}
					initialValidationErrors={serverValidationErrors}
				/>

				<DuplicateDialog
					open={duplicateDialogOpen}
					onOpenChange={setDuplicateDialogOpen}
					dayOffset={dayOffset}
					onDayOffsetChange={setDayOffset}
					onDuplicate={handleDuplicate}
					isPending={duplicateMutation.isPending}
				/>
			</div>
		</div>
	);
}
