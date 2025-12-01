import { Link, useLocation } from "@tanstack/react-router";
import { Calendar, HelpCircle, Menu } from "lucide-react";
import { useTour } from "@/components/tour";
import { resetTourCompletion } from "@/hooks/use-calendraft-tour";
import { TOUR_STEP_IDS } from "@/lib/tour-constants";
import { ModeToggle } from "./mode-toggle";
import { Button } from "./ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "./ui/tooltip";
import UserMenu from "./user-menu";

export default function Header() {
	const location = useLocation();
	const { startTour, setIsTourCompleted } = useTour();
	const isLandingPage = location.pathname === "/";

	const appLinks = [
		{ to: "/calendars", label: "Mes calendriers" },
		{ to: "/pricing", label: "Tarifs" },
	] as const;

	const handleRestartTour = () => {
		resetTourCompletion();
		setIsTourCompleted(false);
		startTour();
	};

	return (
		<header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
			<div className="container flex items-center justify-between px-4 py-3">
				<Link
					to="/"
					className="flex items-center gap-2 rounded-md font-semibold text-lg transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
					aria-label="Calendraft - Accueil"
				>
					<Calendar className="size-5 text-primary" aria-hidden="true" />
					<span>Calendraft</span>
				</Link>

				{isLandingPage ? (
					<>
						{/* Desktop navigation */}
						<nav
							className="hidden items-center gap-8 sm:flex"
							aria-label="Navigation principale"
						>
							<Link
								to="/calendars"
								className="rounded-sm font-medium text-muted-foreground text-sm transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
							>
								Mes calendriers
							</Link>
							<Link
								to="/pricing"
								className="rounded-sm font-medium text-muted-foreground text-sm transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
							>
								Tarifs
							</Link>
							<Link
								to="/login"
								search={{ mode: "signin" }}
								className="rounded-sm font-medium text-muted-foreground text-sm transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
							>
								Connexion
							</Link>
							<Button size="sm" asChild>
								<Link to="/calendars/new">Commencer</Link>
							</Button>
						</nav>

						{/* Mobile menu */}
						<div className="flex items-center gap-2 sm:hidden">
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="ghost" size="icon" aria-label="Menu">
										<Menu className="size-5" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="w-48">
									<DropdownMenuItem asChild>
										<Link to="/calendars">Mes calendriers</Link>
									</DropdownMenuItem>
									<DropdownMenuItem asChild>
										<Link to="/calendars/import">Importer un .ics</Link>
									</DropdownMenuItem>
									<DropdownMenuItem asChild>
										<Link to="/pricing">Tarifs</Link>
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem asChild>
										<Link to="/login" search={{ mode: "signin" }}>
											Connexion
										</Link>
									</DropdownMenuItem>
									<DropdownMenuItem asChild>
										<Link to="/login" search={{ mode: "signup" }}>
											Créer un compte
										</Link>
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</>
				) : (
					// App navigation
					<nav className="flex items-center gap-6" aria-label="Navigation">
						{appLinks.map(({ to, label }) => (
							<Link
								key={to}
								to={to}
								className="rounded-sm font-medium text-muted-foreground text-sm transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
							>
								{label}
							</Link>
						))}
					</nav>
				)}

				<div className="flex items-center gap-2">
					{!isLandingPage && (
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										id={TOUR_STEP_IDS.HELP_BUTTON}
										variant="ghost"
										size="icon"
										onClick={handleRestartTour}
										aria-label="Relancer le tour guidé"
									>
										<HelpCircle className="size-5" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>Relancer le tour guidé</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					)}
					<ModeToggle />
					{!isLandingPage && <UserMenu />}
					{isLandingPage && (
						<div className="hidden sm:block">
							<UserMenu />
						</div>
					)}
				</div>
			</div>
		</header>
	);
}
