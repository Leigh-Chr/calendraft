import { Link, useLocation } from "@tanstack/react-router";
import { Calendar, Menu } from "lucide-react";
import { ModeToggle } from "./mode-toggle";
import { Button } from "./ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import UserMenu from "./user-menu";

export default function Header() {
	const location = useLocation();
	const isLandingPage = location.pathname === "/";

	const appLinks = [{ to: "/calendars", label: "My calendars" }] as const;

	return (
		<header className="header-glow sticky top-0 z-50 border-b bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
			<div className="container flex items-center justify-between px-4 py-3">
				<Link
					to="/"
					className="logo-animated group flex items-center gap-2.5 rounded-md font-semibold text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
					aria-label="Calendraft - Home"
				>
					<div className="relative">
						<Calendar
							className="logo-icon size-5 text-primary"
							aria-hidden="true"
						/>
						<div className="absolute inset-0 rounded-full bg-primary/20 opacity-0 blur-md transition-opacity group-hover:opacity-100" />
					</div>
					<span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
						Calendraft
					</span>
				</Link>

				{isLandingPage ? (
					<>
						{/* Desktop navigation */}
						<nav
							className="hidden items-center gap-8 sm:flex"
							aria-label="Main navigation"
						>
							<Link
								to="/calendars"
								className="rounded-sm font-medium text-muted-foreground text-sm transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
							>
								My calendars
							</Link>
							<Link
								to="/login"
								search={{ mode: "signin" }}
								className="rounded-sm font-medium text-muted-foreground text-sm transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
							>
								Sign in
							</Link>
							<Button size="sm" asChild>
								<Link to="/calendars/new">Get started</Link>
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
										<Link to="/calendars">My calendars</Link>
									</DropdownMenuItem>
									<DropdownMenuItem asChild>
										<Link to="/calendars/import">Import a .ics</Link>
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem asChild>
										<Link to="/login" search={{ mode: "signin" }}>
											Sign in
										</Link>
									</DropdownMenuItem>
									<DropdownMenuItem asChild>
										<Link to="/login" search={{ mode: "signup" }}>
											Create an account
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
