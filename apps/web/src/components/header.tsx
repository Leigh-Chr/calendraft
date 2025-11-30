import { Link } from "@tanstack/react-router";
import { Calendar } from "lucide-react";
import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export default function Header() {
	const links = [
		{ to: "/", label: "Accueil" },
		{ to: "/calendars", label: "Mes calendriers" },
	] as const;

	return (
		<header className="border-b">
			<div className="container flex items-center justify-between px-4 py-3">
				<Link
					to="/"
					className="flex items-center gap-2 font-semibold text-lg transition-colors hover:text-primary"
				>
					<Calendar className="h-5 w-5" />
					Calendraft
				</Link>
				<nav className="flex items-center gap-6">
					{links.map(({ to, label }) => {
						return (
							<Link
								key={to}
								to={to}
								className="font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
							>
								{label}
							</Link>
						);
					})}
				</nav>
				<div className="flex items-center gap-2">
					<ModeToggle />
					<UserMenu />
				</div>
			</div>
		</header>
	);
}
