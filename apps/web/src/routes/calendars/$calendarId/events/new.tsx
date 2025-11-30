import type { ValidationErrors } from "@calendraft/schemas";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	createFileRoute,
	stripSearchParams,
	useNavigate,
} from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { useState } from "react";
import { toast } from "sonner";
import { Breadcrumb } from "@/components/breadcrumb";
import {
	type EventFormData,
	EventFormExtended,
} from "@/components/event-form-extended";
import { transformEventFormDataToAPI } from "@/lib/event-form-transform";
import {
	getFirstValidationError,
	handleTRPCMutationError,
} from "@/lib/parse-trpc-errors";
import { QUERY_KEYS } from "@/lib/query-keys";
import { newEventDefaults, newEventSearchSchema } from "@/lib/search-params";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/calendars/$calendarId/events/new")({
	component: NewEventComponent,
	validateSearch: zodValidator(newEventSearchSchema),
	search: {
		middlewares: [stripSearchParams(newEventDefaults)],
	},
	head: () => ({
		meta: [
			{ title: "Nouvel événement - Calendraft" },
			{ name: "robots", content: "noindex, nofollow" },
		],
	}),
});

function NewEventComponent() {
	const { calendarId } = Route.useParams();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const search = Route.useSearch();

	const [serverValidationErrors, setServerValidationErrors] = useState<
		ValidationErrors | undefined
	>();

	const createMutation = useMutation(
		trpc.event.create.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: QUERY_KEYS.event.all });
				queryClient.invalidateQueries({
					queryKey: QUERY_KEYS.calendar.byId(calendarId),
				});
				toast.success("Événement créé avec succès");
				navigate({ to: `/calendars/${calendarId}` });
			},
			onError: (error: unknown) => {
				handleTRPCMutationError(error, {
					onValidationError: (errors) => {
						setServerValidationErrors(errors);
						// Show toast with first error
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
		createMutation.mutate(transformEventFormDataToAPI(data, calendarId));
	};

	const initialData =
		search?.start && search?.end
			? {
					startDate: search.start,
					endDate: search.end,
				}
			: undefined;

	const { data: calendar } = useQuery({
		...trpc.calendar.getById.queryOptions({ id: calendarId }),
	});

	return (
		<div className="container mx-auto max-w-4xl space-y-4 px-4 py-10">
			<Breadcrumb
				items={[
					{
						label: calendar?.name || "Calendrier",
						href: `/calendars/${calendarId}`,
					},
					{ label: "Nouvel événement" },
				]}
			/>

			<EventFormExtended
				mode="create"
				initialData={initialData}
				onSubmit={handleSubmit}
				onCancel={() => navigate({ to: `/calendars/${calendarId}` })}
				isSubmitting={createMutation.isPending}
				calendarId={calendarId}
				showAllSections={false}
				initialValidationErrors={serverValidationErrors}
			/>
		</div>
	);
}
