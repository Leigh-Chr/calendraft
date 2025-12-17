import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface InsightCardProps {
	title: string;
	icon: LucideIcon;
	children: React.ReactNode;
}

export function InsightCard({ title, icon: Icon, children }: InsightCardProps) {
	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="flex items-center gap-2 text-base">
					<Icon className="h-4 w-4 text-primary" />
					{title}
				</CardTitle>
			</CardHeader>
			<CardContent>{children}</CardContent>
		</Card>
	);
}

export function InsightStat({
	value,
	label,
	sublabel,
}: {
	value: string | number;
	label: string;
	sublabel?: string;
}) {
	return (
		<div className="space-y-1">
			<p className="font-bold text-2xl">{value}</p>
			<p className="text-muted-foreground text-sm">{label}</p>
			{sublabel && <p className="text-muted-foreground text-xs">{sublabel}</p>}
		</div>
	);
}

export function InsightList({
	items,
}: {
	items: { label: string; value: string | number }[];
}) {
	return (
		<ul className="space-y-1.5">
			{items.map((item) => (
				<li key={item.label} className="flex justify-between text-sm">
					<span className="text-muted-foreground">{item.label}</span>
					<span className="font-medium">{item.value}</span>
				</li>
			))}
		</ul>
	);
}
