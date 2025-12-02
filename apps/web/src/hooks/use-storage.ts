/**
 * Unified storage hook for authenticated and anonymous users
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { handleTRPCError } from "@/lib/error-handler";
import { QUERY_KEYS } from "@/lib/query-keys";
import { trpc } from "@/utils/trpc";

/**
 * Hook to check if user is authenticated
 */
export function useIsAuthenticated() {
	const session = authClient.useSession();
	return !!session.data;
}

/**
 * Hook to get calendars (works for both authenticated and anonymous users)
 * Note: Anonymous users' calendars are stored server-side, not in localStorage
 */
export function useCalendars() {
	// Use tRPC for both authenticated and anonymous users
	// The anonymous ID is sent via header in trpc.ts
	const trpcCalendars = useQuery({
		...trpc.calendar.list.queryOptions(undefined),
		enabled: true, // Always enabled - works for both authenticated and anonymous
	});

	return {
		calendars: trpcCalendars.data || [],
		isLoading: trpcCalendars.isLoading,
		isError: trpcCalendars.isError,
	};
}

/**
 * Hook to get a single calendar
 */
export function useCalendar(calendarId: string | undefined) {
	const trpcCalendar = useQuery({
		...trpc.calendar.getById.queryOptions({ id: calendarId ?? "" }),
		enabled: !!calendarId,
	});

	// For anonymous users, we use tRPC with anonymous header
	return {
		calendar: trpcCalendar.data,
		isLoading: trpcCalendar.isLoading,
		isError: trpcCalendar.isError,
	};
}

/**
 * Hook to create a calendar
 */
export function useCreateCalendar() {
	const queryClient = useQueryClient();

	const mutation = useMutation(
		trpc.calendar.create.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: QUERY_KEYS.calendar.list });
			},
			onError: (error) => {
				handleTRPCError(error, {
					fallbackTitle: "Erreur lors de la création du calendrier",
					fallbackDescription:
						"Impossible de créer le calendrier. Veuillez réessayer.",
				});
			},
		}),
	);

	return {
		createCalendar: mutation.mutate,
		isCreating: mutation.isPending,
	};
}

/**
 * Hook to update a calendar
 */
export function useUpdateCalendar() {
	const queryClient = useQueryClient();

	const mutation = useMutation(
		trpc.calendar.update.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: QUERY_KEYS.calendar.list });
				queryClient.invalidateQueries({ queryKey: QUERY_KEYS.calendar.all });
				toast.success("Calendrier mis à jour");
			},
			onError: (error) => {
				handleTRPCError(error, {
					fallbackTitle: "Erreur lors de la mise à jour",
					fallbackDescription:
						"Impossible de mettre à jour le calendrier. Veuillez réessayer.",
				});
			},
		}),
	);

	return {
		updateCalendar: mutation.mutate,
		isUpdating: mutation.isPending,
	};
}

/**
 * Hook to delete a calendar
 */
export function useDeleteCalendar() {
	const queryClient = useQueryClient();

	const mutation = useMutation(
		trpc.calendar.delete.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: QUERY_KEYS.calendar.list });
				toast.success("Calendrier supprimé");
			},
			onError: (error) => {
				handleTRPCError(error, {
					fallbackTitle: "Erreur lors de la suppression",
					fallbackDescription:
						"Impossible de supprimer le calendrier. Veuillez réessayer.",
				});
			},
		}),
	);

	return {
		deleteCalendar: mutation.mutate,
		isDeleting: mutation.isPending,
	};
}
