import { useIsMobile } from "@calendraft/react-utils";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Calendar, Menu } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { ModeToggle } from "./mode-toggle";
import { Button } from "./ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import UserMenu from "./user-menu";

export default function Header() {
	const location = useLocation();
	const navigate = useNavigate();
	const isLandingPage = location.pathname === "/";
	const isMobile = useIsMobile();
	const { data: session } = authClient.useSession();

	const appLinks = [
		{ to: "/calendars", label: "My calendars" },
		{ to: "/dashboard", label: "Dashboard" },
	] as const;

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
									<Button
										variant="ghost"
										size="icon"
										className="min-h-[44px] sm:min-h-0"
										aria-label="Menu"
									>
										<Menu className="size-5" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent
									align="end"
									mobileAlign="start"
									className="w-48"
								>
									<DropdownMenuItem asChild>
										<Link to="/calendars">My calendars</Link>
									</DropdownMenuItem>
									<DropdownMenuItem asChild>
										<Link to="/calendars/import">Import a .ics</Link>
									</DropdownMenuItem>
									{session && (
										<>
											<DropdownMenuSeparator />
											<DropdownMenuLabel>Account</DropdownMenuLabel>
											<DropdownMenuItem disabled>
												{session.user.email}
											</DropdownMenuItem>
											<DropdownMenuItem
												onClick={() => {
													authClient.signOut({
														fetchOptions: {
															onSuccess: () => {
																// Rediriger vers /calendars si on est sur une page protégée, sinon rester sur la page actuelle
																const currentPath = location.pathname;
																if (
																	currentPath.startsWith("/account") ||
																	currentPath.startsWith("/calendars")
																) {
																	navigate({ to: "/calendars" });
																} else if (currentPath === "/") {
																	// Rester sur la page d'accueil
																	navigate({ to: "/" });
																} else {
																	// Pour les autres pages (login, etc.), aller à l'accueil
																	navigate({ to: "/" });
																}
															},
														},
													});
												}}
												className="text-destructive focus:text-destructive"
											>
												Sign out
											</DropdownMenuItem>
										</>
									)}
									{!session && (
										<>
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
										</>
									)}
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</>
				) : (
					<>
						{/* Desktop navigation */}
						<nav
							className={cn("flex items-center gap-6", isMobile && "hidden")}
							aria-label="Navigation"
						>
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

						{/* Mobile menu for app */}
						{isMobile && (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="ghost"
										size="icon"
										className="min-h-[44px] sm:min-h-0"
										aria-label="Menu"
									>
										<Menu className="size-5" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent
									align="end"
									mobileAlign="start"
									className="w-48"
								>
									<DropdownMenuItem asChild>
										<Link to="/calendars">My calendars</Link>
									</DropdownMenuItem>
									<DropdownMenuItem asChild>
										<Link to="/dashboard">Dashboard</Link>
									</DropdownMenuItem>
									<DropdownMenuItem asChild>
										<Link to="/calendars/import">Import a .ics</Link>
									</DropdownMenuItem>
									<DropdownMenuItem asChild>
										<Link to="/calendars/new">New calendar</Link>
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						)}
					</>
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
