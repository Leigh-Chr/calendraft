import { Link } from "@tanstack/react-router";
import { Github, Heart } from "lucide-react";

export function Footer() {
	const currentYear = new Date().getFullYear();

	return (
		<footer className="border-t bg-muted/30">
			<div className="container mx-auto px-4 py-8">
				<div className="grid grid-cols-1 gap-8 md:grid-cols-3">
					{/* Brand section */}
					<div className="space-y-3">
						<h3 className="font-semibold text-base">Calendraft</h3>
						<p className="text-muted-foreground text-sm">
							Free, open-source calendar management. Import, create, edit, and
							merge your calendars—no complexity, no vendor lock-in.
						</p>
						<p className="mt-3 text-muted-foreground text-xs">
							Enjoying Calendraft?{" "}
							<a
								href="https://ko-fi.com/leigh_chr"
								target="_blank"
								rel="noopener noreferrer"
								className="font-medium text-primary hover:underline"
							>
								Support the project
							</a>
						</p>
					</div>

					{/* Links section */}
					<div className="space-y-3">
						<h3 className="font-semibold text-base">Resources</h3>
						<ul className="space-y-2">
							<li>
								<Link
									to="/calendars"
									className="text-muted-foreground text-sm transition-colors hover:text-foreground"
								>
									My Calendars
								</Link>
							</li>
							<li>
								<Link
									to="/calendars/new"
									className="text-muted-foreground text-sm transition-colors hover:text-foreground"
								>
									Create Calendar
								</Link>
							</li>
							<li>
								<Link
									to="/calendars/import"
									className="text-muted-foreground text-sm transition-colors hover:text-foreground"
								>
									Import Calendar
								</Link>
							</li>
						</ul>
					</div>

					{/* Legal & Social section */}
					<div className="space-y-3">
						<h3 className="font-semibold text-base">Legal & Links</h3>
						<ul className="space-y-2">
							<li>
								<a
									href="https://github.com/Leigh-Chr/calendraft"
									target="_blank"
									rel="noopener noreferrer"
									className="flex items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground"
								>
									<Github className="h-4 w-4" />
									GitHub
								</a>
							</li>
							<li>
								<a
									href="https://ko-fi.com/leigh_chr"
									target="_blank"
									rel="noopener noreferrer"
									className="flex items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-primary"
								>
									<Heart className="h-4 w-4 fill-current text-primary/70" />
									Support on Ko-fi
								</a>
							</li>
							<li>
								<a
									href="https://github.com/Leigh-Chr/calendraft/blob/main/LICENSE"
									target="_blank"
									rel="noopener noreferrer"
									className="text-muted-foreground text-sm transition-colors hover:text-foreground"
								>
									License
								</a>
							</li>
						</ul>
					</div>
				</div>

				{/* Copyright */}
				<div className="mt-8 border-t pt-6 text-center">
					<p className="text-muted-foreground text-sm">
						© {currentYear} Calendraft. Open source and free to use.
					</p>
				</div>
			</div>
		</footer>
	);
}
