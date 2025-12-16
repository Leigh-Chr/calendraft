/**
 * Recoverable Error Boundary component
 * Automatically attempts recovery after errors with exponential backoff
 * Best practice: Use multiple error boundaries for different parts of the app
 */

import * as Sentry from "@sentry/react";
import { AlertCircle, RefreshCw } from "lucide-react";
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
	/** Maximum number of auto-recovery attempts before forcing reload */
	maxRecoveryAttempts?: number;
	/** Component name for better error tracking */
	componentName?: string;
}

interface State {
	hasError: boolean;
	error: Error | null;
	errorCount: number;
	isRecovering: boolean;
}

export class RecoverableErrorBoundary extends Component<Props, State> {
	private recoveryTimeoutId: number | null = null;

	constructor(props: Props) {
		super(props);
		this.state = {
			hasError: false,
			error: null,
			errorCount: 0,
			isRecovering: false,
		};
	}

	static getDerivedStateFromError(error: Error): Partial<State> {
		return { hasError: true, error };
	}

	override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		// Log error with context
		const context = this.props.componentName
			? { component: this.props.componentName }
			: undefined;
		logger.error("Error Boundary caught an error", error, {
			errorInfo,
			...context,
		});

		// Send to Sentry with React context
		Sentry.captureException(error, {
			contexts: {
				react: {
					componentStack: errorInfo.componentStack,
				},
			},
			tags: context,
		});

		// Auto-recovery attempt after delay (exponential backoff)
		const errorCount = this.state.errorCount + 1;
		const delay = Math.min(1000 * 2 ** (errorCount - 1), 10000); // Max 10s

		this.setState({ isRecovering: true });

		this.recoveryTimeoutId = window.setTimeout(() => {
			this.setState({
				hasError: false,
				error: null,
				errorCount,
				isRecovering: false,
			});
		}, delay);
	}

	override componentWillUnmount() {
		if (this.recoveryTimeoutId !== null) {
			clearTimeout(this.recoveryTimeoutId);
		}
	}

	handleReset = () => {
		this.setState({
			hasError: false,
			error: null,
			errorCount: 0,
			isRecovering: false,
		});
	};

	handleForceReload = () => {
		window.location.reload();
	};

	override render() {
		if (this.state.hasError) {
			const maxAttempts = this.props.maxRecoveryAttempts ?? 3;

			// Too many errors - force reload
			if (this.state.errorCount > maxAttempts) {
				return (
					<div className="container mx-auto max-w-2xl px-4 py-10">
						<Card className="border-destructive/50 bg-destructive/5">
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-destructive">
									<AlertCircle className="h-5 w-5" aria-hidden="true" />
									Multiple errors occurred
								</CardTitle>
								<CardDescription>
									The application encountered multiple errors. Please reload the
									page.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<Button onClick={this.handleForceReload} variant="default">
									Reload page
								</Button>
							</CardContent>
						</Card>
					</div>
				);
			}

			// Use custom fallback if provided
			if (this.props.fallback) {
				return this.props.fallback;
			}

			// Default error UI with recovery status
			return (
				<div className="container mx-auto max-w-2xl px-4 py-10">
					<Card className="border-destructive/50 bg-destructive/5">
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-destructive">
								<AlertCircle className="h-5 w-5" aria-hidden="true" />
								An error occurred
							</CardTitle>
							<CardDescription>
								{this.state.isRecovering
									? "Attempting to recover automatically..."
									: "An unexpected error occurred. Please try again."}
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							{this.state.error && !this.state.isRecovering && (
								<div className="rounded-lg border border-destructive/20 bg-card p-3 text-sm">
									<p className="font-medium text-destructive">
										{this.state.error.message || "Unknown error"}
									</p>
								</div>
							)}

							{this.state.isRecovering && (
								<div className="flex items-center gap-2 text-muted-foreground text-sm">
									<RefreshCw className="h-4 w-4 animate-spin" />
									Recovering...
								</div>
							)}

							{!this.state.isRecovering && (
								<div className="flex gap-2">
									<Button onClick={this.handleReset} variant="default">
										Try again
									</Button>
									<Button onClick={this.handleForceReload} variant="outline">
										Reload page
									</Button>
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			);
		}

		return this.props.children;
	}
}
