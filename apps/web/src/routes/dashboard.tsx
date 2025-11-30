import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/dashboard")({
	component: RouteComponent,
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (!session.data) {
			redirect({
				to: "/login",
				search: { mode: "signin", redirect: "/dashboard" },
				throw: true,
			});
		}
		return { session };
	},
});

function RouteComponent() {
	const { session } = Route.useRouteContext();
	const navigate = useNavigate();
	const privateData = useQuery(trpc.privateData.queryOptions());

	return (
		<div className="container mx-auto max-w-4xl px-4 py-10">
			<h1 className="mb-6 font-bold text-3xl">Tableau de bord</h1>

			<div className="grid gap-4 md:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Profil utilisateur</CardTitle>
						<CardDescription>Informations de votre compte</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="mb-2">
							<strong>Nom :</strong> {session.data?.user.name}
						</p>
						<p>
							<strong>Email :</strong> {session.data?.user.email}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Accès API</CardTitle>
						<CardDescription>Statut de connexion au backend</CardDescription>
					</CardHeader>
					<CardContent>
						<p>{privateData.data?.message || "Chargement..."}</p>
					</CardContent>
				</Card>
			</div>

			<div className="mt-6">
				<Button onClick={() => navigate({ to: "/calendars" })}>
					Voir mes calendriers
				</Button>
			</div>
		</div>
	);
}
