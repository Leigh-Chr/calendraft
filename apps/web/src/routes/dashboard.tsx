import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
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

export const Route = createFileRoute("/dashboard")({
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
				search: { mode: "signin", redirect: "/dashboard" },
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
			<CardFooter>
				<Button variant="outline" className="w-full" asChild>
					<Link to="/calendars">View my calendars</Link>
				</Button>
			</CardFooter>
		</Card>
	);
}

// Sub-component: Plan Card
function PlanCard() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Your plan</CardTitle>
				<CardDescription>Free and generous access</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div>
					<Badge variant="default" className="text-base">
						Free
					</Badge>
				</div>
				<p className="text-muted-foreground text-sm">
					As an authenticated user, you benefit from very generous limits: 100
					calendars and 2000 events per calendar.
				</p>
			</CardContent>
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

			<div className="container mx-auto max-w-6xl px-4 py-10">
				<div className="mb-8">
					<h1 className="mb-2 text-heading-1">My account</h1>
					<p className="text-muted-foreground">
						Hello {session.data?.user.name?.split(" ")[0] || "there"} 👋
					</p>
				</div>

				<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
					<PlanCard />
					<UsageCard usage={usage} />
					<ProfileCard
						userName={session.data?.user.name}
						userEmail={session.data?.user.email}
					/>
				</div>
			</div>
		</div>
	);
}
