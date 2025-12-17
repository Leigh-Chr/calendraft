import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ExportDataButton } from "@/components/export-data-button";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/account")({
	component: RouteComponent,
	head: () => ({
		meta: [
			{ title: "My account - Calendraft" },
			{ name: "robots", content: "noindex, nofollow" },
		],
	}),
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (!session.data) {
			redirect({
				to: "/login",
				search: { mode: "signin", redirect: "/account" },
				throw: true,
			});
		}
		return { session };
	},
});

// Type for usage data
interface UsageInfo {
	calendarCount: number;
	maxCalendars: number;
	maxEventsPerCalendar: number;
}

// Sub-component: Usage Card
function UsageCard({ usage }: { usage: UsageInfo | null | undefined }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Usage</CardTitle>
				<CardDescription>Your usage statistics</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{usage ? (
					<UsageDetails usage={usage} />
				) : (
					<p className="text-muted-foreground text-sm">Loading...</p>
				)}
			</CardContent>
		</Card>
	);
}

// Sub-component: Usage Details with progress bar
function UsageDetails({ usage }: { usage: UsageInfo }) {
	const calendarPercentage = Math.round(
		(usage.calendarCount / usage.maxCalendars) * 100,
	);

	return (
		<>
			<div className="space-y-2">
				<div className="flex items-center justify-between text-sm">
					<span className="text-muted-foreground">Calendars</span>
					<span className="font-medium">
						{usage.calendarCount} / {usage.maxCalendars}
					</span>
				</div>
				<Progress value={calendarPercentage} className="h-2" />
			</div>
			<div className="space-y-2">
				<div className="flex items-center justify-between text-sm">
					<span className="text-muted-foreground">Events per calendar</span>
					<span className="font-medium">
						Max {usage.maxEventsPerCalendar.toLocaleString("en-US")}
					</span>
				</div>
			</div>
		</>
	);
}

// Sub-component: Profile Card
function ProfileCard({
	userName,
	userEmail,
}: {
	userName?: string;
	userEmail?: string;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Profile</CardTitle>
				<CardDescription>Your account information</CardDescription>
			</CardHeader>
			<CardContent className="space-y-2">
				<p className="text-sm">
					<strong>Name:</strong> {userName}
				</p>
				<p className="text-sm">
					<strong>Email:</strong> {userEmail}
				</p>
			</CardContent>
			<CardFooter className="flex flex-col gap-2">
				<Button variant="outline" className="w-full" asChild>
					<Link to="/edit-profile">Edit profile</Link>
				</Button>
				<Button variant="outline" className="w-full" asChild>
					<Link to="/change-password">Change password</Link>
				</Button>
				<ExportDataButton />
			</CardFooter>
		</Card>
	);
}

// Sub-component: Danger Zone Card
function DangerZoneCard() {
	return (
		<Card className="border-destructive/50">
			<CardHeader>
				<CardTitle className="text-destructive">Danger Zone</CardTitle>
				<CardDescription>Irreversible and destructive actions</CardDescription>
			</CardHeader>
			<CardContent>
				<p className="text-muted-foreground text-sm">
					Once you delete your account, there is no going back. Please be
					certain.
				</p>
			</CardContent>
			<CardFooter>
				<Button variant="destructive" className="w-full" asChild>
					<Link to="/delete-account">Delete account</Link>
				</Button>
			</CardFooter>
		</Card>
	);
}

function RouteComponent() {
	const { session } = Route.useRouteContext();
	const usageQuery = useQuery(trpc.user.getUsage.queryOptions());

	const usage = usageQuery.data?.usage;

	return (
		<div className="relative min-h-[calc(100vh-4rem)]">
			{/* Subtle background */}
			<div className="-z-10 pointer-events-none absolute inset-0">
				<div className="gradient-mesh absolute inset-0 opacity-40" />
			</div>

			<div className="container mx-auto max-w-6xl px-4 py-6 sm:py-10">
				<div className="mb-8">
					<h1 className="mb-2 text-heading-1">My account</h1>
					<p className="text-muted-foreground">
						Hello {session.data?.user.name?.split(" ")[0] || "there"} 👋
					</p>
				</div>

				<div className="grid gap-6 md:grid-cols-2">
					<UsageCard usage={usage} />
					<ProfileCard
						userName={session.data?.user.name}
						userEmail={session.data?.user.email}
					/>
				</div>

				{/* Danger Zone */}
				<div className="mt-8">
					<DangerZoneCard />
				</div>
			</div>
		</div>
	);
}
