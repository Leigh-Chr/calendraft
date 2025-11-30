import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { successSearchSchema } from "@/lib/search-params";

export const Route = createFileRoute("/success")({
	component: SuccessPage,
	validateSearch: zodValidator(successSearchSchema),
});

function SuccessPage() {
	const { checkout_id } = Route.useSearch();

	return (
		<div className="container mx-auto px-4 py-8">
			<h1>Payment Successful!</h1>
			{checkout_id && <p>Checkout ID: {checkout_id}</p>}
		</div>
	);
}
