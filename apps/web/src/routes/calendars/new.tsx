import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertCircle, Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { ColorPicker } from "@/components/ui/color-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useServerStatus } from "@/hooks/use-server-status";
import { useCreateCalendar } from "@/hooks/use-storage";
import { handleTRPCError } from "@/lib/error-handler";

const BASE_URL = "https://calendraft.app";

export const Route = createFileRoute("/calendars/new")({
	component: NewCalendarComponent,
	head: () => ({
		meta: [
			{ title: "Create a calendar - Calendraft" },
			{
				name: "description",
				content:
					"Create a new blank ICS calendar in seconds. Then add your events and export them to Google Calendar, Apple Calendar, or Outlook.",
			},
			{ property: "og:title", content: "Create a calendar - Calendraft" },
			{
				property: "og:description",
				content: "Create a new blank ICS calendar in seconds.",
			},
			{ property: "og:url", content: `${BASE_URL}/calendars/new` },
		],
		links: [{ rel: "canonical", href: `${BASE_URL}/calendars/new` }],
	}),
	errorComponent: ({ error }) => {
		if (import.meta.env.DEV) {
			console.error("Route error:", error);
		}
		return (
			<div className="container mx-auto max-w-2xl px-4 py-10">
				<Card className="border-destructive/50 bg-destructive/5">
					<CardHeader>
						<CardTitle className="text-destructive">Loading error</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground">
							{error?.message || "An error occurred"}
						</p>
					</CardContent>
				</Card>
			</div>
		);
	},
});

function NewCalendarComponent() {
	const navigate = useNavigate();
	const [name, setName] = useState("");
	const [color, setColor] = useState<string | null>("#3B82F6");
	const { createCalendar, isCreating } = useCreateCalendar();
	const { isOffline, isChecking } = useServerStatus();

	const handleCreate = () => {
		// Validation
		if (!name.trim()) {
			toast.error("Calendar name cannot be empty");
			return;
		}

		// Check server status
		if (isOffline) {
			toast.error("Backend server unavailable", {
				description:
					"Please start the backend server with 'bun run dev:server'",
				duration: 10000,
			});
			return;
		}

		// Create calendar
		createCalendar(
			{ name: name.trim(), color },
			{
				onSuccess: (calendar) => {
					toast.success("Calendar created successfully!");
					navigate({ to: `/calendars/${calendar.id}` });
				},
				onError: (error) => {
					handleTRPCError(error, {
						fallbackTitle: "Error during creation",
						fallbackDescription:
							"Unable to create the calendar. Please try again.",
					});
				},
			},
		);
	};

	return (
		<div className="relative min-h-[calc(100vh-4rem)]">
			{/* Subtle background */}
			<div className="-z-10 pointer-events-none absolute inset-0">
				<div className="gradient-mesh absolute inset-0 opacity-30" />
			</div>

			<div className="container mx-auto max-w-2xl px-4 py-10">
				<Card className="card-glow">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Plus className="h-5 w-5" />
							Create a new calendar
						</CardTitle>
						<CardDescription>
							Create an empty calendar to start adding events
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{isOffline && (
							<div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-destructive text-sm">
								<AlertCircle className="h-4 w-4" />
								<span>
									The backend server is not accessible. Check that it is
									started.
								</span>
							</div>
						)}
						{isChecking && (
							<div className="flex items-center gap-2 rounded-lg border p-3 text-muted-foreground text-sm">
								<Loader2 className="h-4 w-4 animate-spin" />
								<span>Checking server connection...</span>
							</div>
						)}
						<div className="space-y-2">
							<Label htmlFor="name">Calendar name</Label>
							<Input
								id="name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="My calendar"
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										handleCreate();
									}
								}}
								disabled={isCreating}
							/>
						</div>

						<ColorPicker
							value={color}
							onChange={setColor}
							disabled={isCreating}
							label="Calendar color"
						/>

						<div className="flex gap-2">
							<Button
								onClick={handleCreate}
								disabled={!name.trim() || isCreating}
								className="interactive-glow flex-1"
							>
								{isCreating ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Creating...
									</>
								) : (
									"Create"
								)}
							</Button>
							<Button
								variant="outline"
								onClick={() => navigate({ to: "/" })}
								disabled={isCreating}
							>
								Cancel
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
