import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";

export default function UserMenu() {
	const navigate = useNavigate();
	const location = useLocation();
	const { data: session, isPending } = authClient.useSession();

	if (isPending) {
		return <Skeleton className="h-9 w-24" />;
	}

	if (!session) {
		return (
			<Button variant="outline" asChild>
				<Link
					to="/login"
					search={{ mode: "signin", redirect: location.pathname }}
				>
					Sign in
				</Link>
			</Button>
		);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline">{session.user.name}</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuLabel>My account</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem disabled>{session.user.email}</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<Link to="/dashboard" className="flex items-center gap-2">
						<Settings className="h-4 w-4" />
						Account settings
					</Link>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					onClick={() => {
						authClient.signOut({
							fetchOptions: {
								onSuccess: () => {
									// Rediriger vers /calendars si on est sur une page protégée, sinon rester sur la page actuelle
									const currentPath = location.pathname;
									if (
										currentPath.startsWith("/dashboard") ||
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
					Se déconnecter
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
