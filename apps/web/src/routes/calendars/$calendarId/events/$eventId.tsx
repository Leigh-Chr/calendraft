import type { ValidationErrors } from "@calendraft/schemas";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";
import { Breadcrumb } from "@/components/breadcrumb";
import {
	type EventFormData,
	EventFormExtended,
} from "@/components/event-form-extended";
import { transformEventFormDataForUpdate } from "@/lib/event-form-transform";
import {
	getFirstValidationError,
	handleTRPCMutationError,
} from "@/lib/parse-trpc-errors";
import { QUERY_KEYS } from "@/lib/query-keys";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/calendars/$calendarId/events/$eventId")({
	component: EditEventComponent,
});

function EditEventComponent() {
	const { calendarId, eventId } = Route.useParams();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [serverValidationErrors, setServerValidationErrors] = useState<
		ValidationErrors | undefined
	>();

	const { data: event, isLoading } = useQuery({
		...trpc.event.getById.queryOptions({ id: eventId }),
		enabled: !!eventId,
	});

	const { data: calendar } = useQuery({
		...trpc.calendar.getById.queryOptions({ id: calendarId }),
	});

	const updateMutation = useMutation(
		trpc.event.update.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: QUERY_KEYS.event.all });
				queryClient.invalidateQueries({
					queryKey: QUERY_KEYS.calendar.byId(calendarId),
				});
				toast.success("Événement modifié avec succès");
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
		return (
			<div className="container mx-auto max-w-2xl px-4 py-10">
				<div className="text-center">Chargement...</div>
			</div>
		);
	}

	if (!event) {
		return (
			<div className="container mx-auto max-w-2xl px-4 py-10">
				<div className="text-center">Événement non trouvé</div>
			</div>
		);
	}

	// Transform normalized categories and resources to comma-separated strings
	const categoriesStr = Array.isArray(event.categories)
		? event.categories.map((c) => c.category).join(",")
		: typeof event.categories === "string"
			? event.categories
			: "";

	const resourcesStr = Array.isArray(event.resources)
		? event.resources.map((r) => r.resource).join(",")
		: typeof event.resources === "string"
			? event.resources
			: "";

	// Transform normalized recurrence dates to JSON strings
	const rdates = Array.isArray(event.recurrenceDates)
		? event.recurrenceDates
				.filter((rd) => rd.type === "RDATE")
				.map((rd) => rd.date)
		: [];
	const exdates = Array.isArray(event.recurrenceDates)
		? event.recurrenceDates
				.filter((rd) => rd.type === "EXDATE")
				.map((rd) => rd.date)
		: [];
	const rdateStr =
		rdates.length > 0
			? JSON.stringify(rdates.map((d) => new Date(d).toISOString()))
			: "";
	const exdateStr =
		exdates.length > 0
			? JSON.stringify(exdates.map((d) => new Date(d).toISOString()))
			: "";

	const initialData: Partial<EventFormData> = {
		title: event.title,
		startDate: format(new Date(event.startDate), "yyyy-MM-dd'T'HH:mm"),
		endDate: format(new Date(event.endDate), "yyyy-MM-dd'T'HH:mm"),
		description: event.description || "",
		location: event.location || "",
		status: event.status || undefined,
		priority: event.priority ?? undefined,
		categories: categoriesStr,
		url: event.url || "",
		class: event.class || undefined,
		comment: event.comment || "",
		contact: event.contact || "",
		resources: resourcesStr,
		sequence: event.sequence ?? 0,
		transp: event.transp || undefined,
		rrule: event.rrule || "",
		rdate: rdateStr,
		exdate: exdateStr,
		geoLatitude: event.geoLatitude ?? undefined,
		geoLongitude: event.geoLongitude ?? undefined,
		organizerName: event.organizerName || "",
		organizerEmail: event.organizerEmail || "",
		uid: event.uid || "",
		recurrenceId: event.recurrenceId || "",
		relatedTo: event.relatedTo || "",
		color: event.color || "",
		attendees: event.attendees?.map((a) => ({
			name: a.name || undefined,
			email: a.email,
			role: a.role || undefined,
			status: a.status || undefined,
			rsvp: a.rsvp ?? false,
		})),
		alarms: event.alarms?.map((a) => ({
			trigger: a.trigger,
			action: a.action,
			summary: a.summary || undefined,
			description: a.description || undefined,
			duration: a.duration || undefined,
			repeat: a.repeat ?? undefined,
		})),
	};

	return (
		<div className="container mx-auto max-w-4xl space-y-4 px-4 py-10">
			<Breadcrumb
				items={[
					{
						label: calendar?.name || "Calendrier",
						href: `/calendars/${calendarId}`,
					},
					{ label: event?.title || "Événement" },
				]}
			/>
			<EventFormExtended
				mode="edit"
				initialData={initialData}
				onSubmit={handleSubmit}
				onCancel={() => navigate({ to: `/calendars/${calendarId}` })}
				isSubmitting={updateMutation.isPending}
				calendarId={calendarId}
				initialValidationErrors={serverValidationErrors}
			/>
		</div>
	);
}
