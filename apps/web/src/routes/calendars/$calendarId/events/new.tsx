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
import { TemplateSelector } from "@/components/template-selector";
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
			{ title: "New event - Calendraft" },
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

	// Template data state - when a template is selected, this overrides search params
	const [templateData, setTemplateData] = useState<{
		title: string;
		startDate: string;
		endDate: string;
		description?: string;
		location?: string;
		categories?: string;
		rrule?: string;
		color?: string;
	} | null>(null);

	const createMutation = useMutation(
		trpc.event.create.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: QUERY_KEYS.event.all });
				queryClient.invalidateQueries({
					queryKey: QUERY_KEYS.calendar.byId(calendarId),
				});
				toast.success("Event created successfully");
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

	// React Compiler will automatically memoize this callback
	const handleTemplateSelect = (data: {
		title: string;
		startDate: string;
		endDate: string;
		description?: string;
		location?: string;
		categories?: string;
		rrule?: string;
		color?: string;
	}) => {
		setTemplateData(data);
		toast.success(`Template "${data.title}" applied`);
	};

	// Build initial data from template or search params
	const initialData = templateData
		? {
				title: templateData.title,
				startDate: templateData.startDate,
				endDate: templateData.endDate,
				description: templateData.description || "",
				location: templateData.location || "",
				categories: templateData.categories || "",
				rrule: templateData.rrule || "",
				color: templateData.color || "",
			}
		: search?.start && search?.end
			? {
					startDate: search.start,
					endDate: search.end,
				}
			: undefined;

	const { data: calendar } = useQuery({
		...trpc.calendar.getById.queryOptions({ id: calendarId }),
	});

	return (
		<div className="relative min-h-[calc(100vh-4rem)]">
			{/* Subtle background */}
			<div className="-z-10 pointer-events-none absolute inset-0">
				<div className="gradient-mesh absolute inset-0 opacity-25" />
			</div>

			<div className="container mx-auto max-w-4xl space-y-6 px-4 py-6 sm:py-10">
				<Breadcrumb
					items={[
						{
							label: calendar?.name || "Calendar",
							href: `/calendars/${calendarId}`,
						},
						{ label: "New event" },
					]}
				/>

				{/* Template selector - only show if no template is selected yet */}
				{!templateData && <TemplateSelector onSelect={handleTemplateSelect} />}

				<EventFormExtended
					key={templateData ? templateData.title : "default"}
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
		</div>
	);
}
