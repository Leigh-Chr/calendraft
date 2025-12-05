/**
 * Component to prompt anonymous users to create an account
 * Subtle, value-focused design that doesn't overwhelm
 */

import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { Calendar, Cloud, Smartphone, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useIsAuthenticated } from "@/hooks/use-storage";
import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";

interface AccountPromptProps {
	variant?: "banner" | "card";
	showUsage?: boolean;
	dismissible?: boolean;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complex component with multiple conditional branches
export function AccountPrompt({
	variant = "banner",
	showUsage = true,
	dismissible = true,
}: AccountPromptProps) {
	const navigate = useNavigate();
	const location = useLocation();
	const isAuthenticated = useIsAuthenticated();
	const [isDismissed, setIsDismissed] = useState(false);

	// Only show for anonymous users
	const { data: usage } = useQuery({
		...trpc.calendar.getUsage.queryOptions(),
		enabled: !isAuthenticated && showUsage,
	});

	if (isAuthenticated || isDismissed) {
		return null;
	}

	const isNearLimit =
		usage &&
		(usage.calendarCount >= usage.maxCalendars * 0.8 ||
			Object.values(usage.eventCounts).some(
				(count) => count >= usage.maxEventsPerCalendar * 0.8,
			));

	const handleSignup = () => {
		navigate({
			to: "/login",
			search: { mode: "signup", redirect: location.pathname },
		});
	};

	if (variant === "banner") {
		return (
			<div
				className={cn(
					"mb-4 flex items-center justify-between gap-4 rounded-lg border px-4 py-3",
					isNearLimit
						? "border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-900/10"
						: "border-border bg-muted/30",
				)}
			>
				<div className="flex items-center gap-3">
					<div
						className={cn(
							"flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
							isNearLimit
								? "bg-amber-100 dark:bg-amber-900/30"
								: "bg-primary/10",
						)}
					>
						<Cloud
							className={cn(
								"h-4 w-4",
								isNearLimit
									? "text-amber-600 dark:text-amber-400"
									: "text-primary",
							)}
						/>
					</div>
					<div className="min-w-0">
						<p className="font-medium text-sm">
							{isNearLimit ? (
								<>
									You're approaching the limit ({usage?.calendarCount}/
									{usage?.maxCalendars} calendars)
								</>
							) : (
								"Sync your calendars across all your devices"
							)}
						</p>
						<p className="text-muted-foreground text-xs">
							{isNearLimit
								? "Create a free account for up to 100 calendars"
								: "Data saved in the cloud, accessible everywhere"}
						</p>
					</div>
				</div>

				<div className="flex shrink-0 items-center gap-2">
					<Button size="sm" onClick={handleSignup}>
						Create an account
					</Button>
					{dismissible && (
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8 text-muted-foreground"
							onClick={() => setIsDismissed(true)}
							aria-label="Close"
						>
							<X className="h-4 w-4" />
						</Button>
					)}
				</div>
			</div>
		);
	}

	// Card variant - more detailed
	return (
		<Card className="mb-4">
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between">
					<div>
						<CardTitle className="text-lg">Save your calendars</CardTitle>
						<CardDescription>
							Create a free account to never lose your data
						</CardDescription>
					</div>
					{dismissible && (
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8 shrink-0 text-muted-foreground"
							onClick={() => setIsDismissed(true)}
							aria-label="Close"
						>
							<X className="h-4 w-4" />
						</Button>
					)}
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Usage indicator - only if near limit */}
				{isNearLimit && usage && (
					<div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/50 dark:bg-amber-900/10">
						<p className="font-medium text-amber-700 text-sm dark:text-amber-400">
							{usage.calendarCount}/{usage.maxCalendars} calendars used
						</p>
					</div>
				)}

				{/* Benefits - compact grid */}
				<div className="grid grid-cols-3 gap-3">
					<BenefitItem icon={Cloud} label="Cloud backup" />
					<BenefitItem icon={Smartphone} label="Multi-device" />
					<BenefitItem icon={Calendar} label="100 calendars" />
				</div>

				<Button className="w-full" onClick={handleSignup}>
					Create a free account
				</Button>
			</CardContent>
		</Card>
	);
}

function BenefitItem({
	icon: Icon,
	label,
}: {
	icon: React.ComponentType<{ className?: string }>;
	label: string;
}) {
	return (
		<div className="flex flex-col items-center gap-1.5 rounded-lg bg-muted/50 p-3 text-center">
			<Icon className="h-4 w-4 text-primary" />
			<span className="text-muted-foreground text-xs">{label}</span>
		</div>
	);
}
