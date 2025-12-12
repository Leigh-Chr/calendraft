import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

const BASE_URL = "https://calendraft.app";

export const Route = createFileRoute("/404")({
	component: NotFoundPage,
	head: () => ({
		meta: [
			{ title: "Page Not Found - Calendraft" },
			{
				name: "description",
				content: "The page you're looking for doesn't exist.",
			},
			{ name: "robots", content: "noindex, follow" },
		],
		links: [{ rel: "canonical", href: `${BASE_URL}/404` }],
	}),
});

function NotFoundPage() {
	return (
		<div className="relative min-h-screen">
			<div className="-z-10 pointer-events-none absolute inset-0">
				<div className="gradient-mesh absolute inset-0 opacity-20" />
			</div>

			<div className="container mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 py-10">
				<Card className="w-full">
					<CardHeader className="text-center">
						<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
							<AlertCircle className="h-8 w-8 text-destructive" />
						</div>
						<CardTitle className="text-heading-1">Page Not Found</CardTitle>
						<CardDescription>
							The page you're looking for doesn't exist or has been moved.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4 text-center">
						<p className="text-muted-foreground text-sm">
							You may have typed the wrong address or the page may have been
							removed.
						</p>
						<div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
							<Button asChild size="lg">
								<Link to="/">
									<Home className="mr-2 h-4 w-4" />
									Back to Home
								</Link>
							</Button>
							<Button asChild variant="outline" size="lg">
								<Link to="/calendars">Go to Calendars</Link>
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
