import { useLocation, useRouter } from "@tanstack/react-router";
import { ChevronRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
	label: string;
	href?: string;
}

interface BreadcrumbProps {
	items: BreadcrumbItem[];
	className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
	const router = useRouter();
	const location = useLocation();

	const handleClick = (href?: string) => {
		if (href && href !== location.pathname) {
			// Use router.history for dynamic breadcrumb navigation
			// This avoids unsafe type assertions while preserving SPA behavior
			router.history.push(href);
		}
	};

	return (
		<nav
			aria-label="Breadcrumb"
			className={cn("flex items-center space-x-2 text-sm", className)}
		>
			<Button
				variant="ghost"
				size="sm"
				onClick={() => handleClick("/calendars")}
				className="h-8 px-2"
				aria-label="Accueil"
			>
				<Home className="h-4 w-4" />
			</Button>
			{items.map((item, index) => (
				<div
					key={item.href || `${item.label}-${index}`}
					className="flex items-center space-x-2"
				>
					<ChevronRight className="h-4 w-4 text-muted-foreground" />
					{item.href ? (
						<Button
							variant="ghost"
							size="sm"
							onClick={() => handleClick(item.href)}
							className="h-8 px-2 text-muted-foreground hover:text-foreground"
						>
							{item.label}
						</Button>
					) : (
						<span className="font-medium text-foreground">{item.label}</span>
					)}
				</div>
			))}
		</nav>
	);
}
