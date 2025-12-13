/**
 * Error Boundary component for React
 * Catches JavaScript errors anywhere in the child component tree
 */

import { AlertCircle } from "lucide-react";
import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { logger } from "@/lib/logger";

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		// Log error for debugging
		logger.error("Error Boundary caught an error", error, { errorInfo });
	}

	handleReset = () => {
		this.setState({ hasError: false, error: null });
	};

	override render() {
		if (this.state.hasError) {
			// Use custom fallback if provided
			if (this.props.fallback) {
				return this.props.fallback;
			}

			// Default error UI
			return (
				<div className="container mx-auto max-w-2xl px-4 py-10">
					<Card className="border-destructive/50 bg-destructive/5">
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-destructive">
								<AlertCircle className="h-5 w-5" aria-hidden="true" />
								An error occurred
							</CardTitle>
							<CardDescription>
								An unexpected error occurred. Please try again.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							{this.state.error && (
								<div className="rounded-lg border border-destructive/20 bg-card p-3 text-sm">
									<p className="font-medium text-destructive">
										{this.state.error.message || "Unknown error"}
									</p>
								</div>
							)}

							<div className="flex gap-2">
								<Button onClick={this.handleReset} variant="default">
									Try again
								</Button>
								<Button
									onClick={() => window.location.reload()}
									variant="outline"
								>
									Reload page
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			);
		}

		return this.props.children;
	}
}
