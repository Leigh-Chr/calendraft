import { Link } from "@tanstack/react-router";
import {
	ChevronDown,
	ChevronUp,
	Link as LinkIcon,
	Package,
	Users,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SharingStatsProps {
	activeLinks: number;
	linkAccessThisMonth: number;
	activeBundles: number;
	bundleAccessThisMonth: number;
	sharedGroups: number;
	groupMembers: number;
	pendingInvitations: number;
}

function StatBlock({
	icon: Icon,
	title,
	value,
	sublabel,
	link,
}: {
	icon: React.ComponentType<{ className?: string }>;
	title: string;
	value: number;
	sublabel?: string;
	link?: string;
}) {
	return (
		<div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
			<div className="rounded-md bg-background p-2">
				<Icon className="h-4 w-4 text-muted-foreground" />
			</div>
			<div className="flex-1">
				<p className="font-medium text-sm">{title}</p>
				<p className="font-bold text-lg">{value}</p>
				{sublabel && (
					<p className="text-muted-foreground text-xs">{sublabel}</p>
				)}
			</div>
			{link && (
				<Button variant="ghost" size="sm" asChild>
					<Link to={link}>Manage</Link>
				</Button>
			)}
		</div>
	);
}

export function SharingStats({
	activeLinks,
	linkAccessThisMonth,
	activeBundles,
	bundleAccessThisMonth,
	sharedGroups,
	groupMembers,
	pendingInvitations,
}: SharingStatsProps) {
	const [isExpanded, setIsExpanded] = useState(true);

	const hasAnySharing =
		activeLinks > 0 ||
		activeBundles > 0 ||
		sharedGroups > 0 ||
		pendingInvitations > 0;

	// Don't show the card at all if there's no sharing
	if (!hasAnySharing) {
		return null;
	}

	return (
		<Card>
			<CardHeader
				className="cursor-pointer select-none"
				onClick={() => setIsExpanded(!isExpanded)}
			>
				<CardTitle className="flex items-center justify-between text-lg">
					<div className="flex items-center gap-2">
						<LinkIcon className="h-5 w-5" />
						Sharing & collaboration
					</div>
					<Button variant="ghost" size="icon" className="h-8 w-8">
						{isExpanded ? (
							<ChevronUp className="h-4 w-4" />
						) : (
							<ChevronDown className="h-4 w-4" />
						)}
					</Button>
				</CardTitle>
			</CardHeader>
			<div
				className={cn(
					"overflow-hidden transition-all duration-200",
					isExpanded ? "max-h-[500px]" : "max-h-0",
				)}
			>
				<CardContent className="space-y-3 pt-0">
					<StatBlock
						icon={LinkIcon}
						title="Share links"
						value={activeLinks}
						sublabel={`${linkAccessThisMonth} accesses this month`}
						link="/calendars"
					/>
					<StatBlock
						icon={Package}
						title="Bundles"
						value={activeBundles}
						sublabel={`${bundleAccessThisMonth} accesses this month`}
						link="/calendars"
					/>
					<StatBlock
						icon={Users}
						title="Shared groups"
						value={sharedGroups}
						sublabel={`${groupMembers} members${pendingInvitations > 0 ? ` · ${pendingInvitations} pending` : ""}`}
						link="/calendars"
					/>
				</CardContent>
			</div>
		</Card>
	);
}
