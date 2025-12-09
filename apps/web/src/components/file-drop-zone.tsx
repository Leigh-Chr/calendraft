/**
 * FileDropZone - Enhanced drag & drop zone for files
 * Supports drag & drop and click to select
 */

import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import {
	AlertCircle,
	Calendar,
	CheckCircle2,
	FileUp,
	Loader2,
	X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ParsedEvent {
	title: string;
	startDate: Date;
	endDate: Date;
	location?: string;
}

interface FileDropZoneProps {
	accept?: string;
	maxSizeMB?: number;
	onFileSelect: (file: File) => void;
	onPreviewParsed?: (events: ParsedEvent[]) => void;
	disabled?: boolean;
	className?: string;
}

type DropState = "idle" | "drag-over" | "processing" | "success" | "error";

// Parse ICS date format (e.g., 20240115T140000Z or 20240115)
function parseIcsDateString(dateStr: string): Date {
	const clean = dateStr.replace(/[^0-9T]/g, "");
	if (clean.length >= 8) {
		const year = Number.parseInt(clean.substring(0, 4), 10);
		const month = Number.parseInt(clean.substring(4, 6), 10) - 1;
		const day = Number.parseInt(clean.substring(6, 8), 10);
		const hours =
			clean.length >= 11 ? Number.parseInt(clean.substring(9, 11), 10) : 0;
		const minutes =
			clean.length >= 13 ? Number.parseInt(clean.substring(11, 13), 10) : 0;
		return new Date(year, month, day, hours, minutes);
	}
	return new Date();
}

// Parse a single ICS line and update the event object
function parseIcsEventLine(line: string, event: Partial<ParsedEvent>): void {
	if (line.startsWith("SUMMARY:")) {
		event.title = line.substring(8);
	} else if (line.startsWith("LOCATION:")) {
		event.location = line.substring(9);
	} else if (line.startsWith("DTSTART")) {
		const dateStr = line.split(":")[1];
		if (dateStr) {
			event.startDate = parseIcsDateString(dateStr);
		}
	} else if (line.startsWith("DTEND")) {
		const dateStr = line.split(":")[1];
		if (dateStr) {
			event.endDate = parseIcsDateString(dateStr);
		}
	}
}

// Check if event has required fields
function isCompleteEvent(event: Partial<ParsedEvent>): event is ParsedEvent {
	return Boolean(event.title && event.startDate);
}

// Parse ICS content for preview
function parseIcsContent(content: string): ParsedEvent[] {
	const events: ParsedEvent[] = [];
	const lines = content.split("\n");
	let currentEvent: Partial<ParsedEvent> | null = null;

	for (const line of lines) {
		const trimmed = line.trim();

		if (trimmed === "BEGIN:VEVENT") {
			currentEvent = {};
		} else if (trimmed === "END:VEVENT" && currentEvent) {
			if (isCompleteEvent(currentEvent)) {
				events.push({
					title: currentEvent.title,
					startDate: currentEvent.startDate,
					endDate: currentEvent.endDate || currentEvent.startDate,
					location: currentEvent.location,
				});
			}
			currentEvent = null;
		} else if (currentEvent) {
			parseIcsEventLine(trimmed, currentEvent);
		}
	}

	return events.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

// File validation result
interface FileValidation {
	valid: boolean;
	error?: string;
}

// Validate file extension and size
function validateFile(file: File, maxSizeMB: number): FileValidation {
	const extension = file.name.split(".").pop()?.toLowerCase();
	if (extension !== "ics") {
		return { valid: false, error: "File must be in .ics format" };
	}

	const maxSizeBytes = maxSizeMB * 1024 * 1024;
	if (file.size > maxSizeBytes) {
		return {
			valid: false,
			error: `File too large (max ${maxSizeMB}MB). Size: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
		};
	}

	return { valid: true };
}

// State-specific content components
function ProcessingContent() {
	return (
		<>
			<Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
			<p className="font-medium text-body-large">Reading file...</p>
		</>
	);
}

function SuccessContent({
	file,
	eventCount,
	onReset,
}: {
	file: File;
	eventCount: number;
	onReset: () => void;
}) {
	return (
		<>
			<CheckCircle2 className="mb-4 h-12 w-12 text-green-500" />
			<p className="font-medium text-body-large">{file.name}</p>
			<p className="mt-1 text-muted-foreground text-sm">
				{eventCount} event{eventCount !== 1 ? "s" : ""} detected
			</p>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={(e) => {
					e.stopPropagation();
					onReset();
				}}
				className="mt-4"
			>
				<X className="mr-2 h-4 w-4" />
				Change file
			</Button>
		</>
	);
}

function ErrorContent({
	error,
	onReset,
}: {
	error: string;
	onReset: () => void;
}) {
	return (
		<>
			<AlertCircle className="mb-4 h-12 w-12 text-destructive" />
			<p className="font-medium text-body-large text-destructive">{error}</p>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={(e) => {
					e.stopPropagation();
					onReset();
				}}
				className="mt-4"
			>
				Retry
			</Button>
		</>
	);
}

function IdleContent({
	isDragOver,
	maxSizeMB,
}: {
	isDragOver: boolean;
	maxSizeMB: number;
}) {
	return (
		<>
			<FileUp
				className={cn(
					"mb-4 h-12 w-12 transition-transform",
					isDragOver ? "scale-110 text-primary" : "text-muted-foreground",
				)}
			/>
			<p className="font-medium text-body-large">
				{isDragOver ? "Drop your file here" : "Drag your .ics file here"}
			</p>
			<p className="mt-1 text-muted-foreground text-sm">or click to browse</p>
			<p className="mt-4 text-muted-foreground/60 text-xs">
				Maximum size: {maxSizeMB}MB
			</p>
		</>
	);
}

function EventPreviewItem({ event }: { event: ParsedEvent }) {
	return (
		<div className="flex items-start gap-3 px-4 py-3">
			<Calendar className="h-4 w-4 shrink-0 text-primary" />
			<div className="min-w-0 flex-1">
				<p className="truncate font-medium">{event.title}</p>
				<p className="text-muted-foreground text-sm">
					{format(event.startDate, "EEEE d MMMM yyyy", { locale: enUS })}
					{" • "}
					{format(event.startDate, "HH:mm")} - {format(event.endDate, "HH:mm")}
				</p>
				{event.location && (
					<p className="truncate text-muted-foreground text-xs">
						📍 {event.location}
					</p>
				)}
			</div>
		</div>
	);
}

function EventsPreview({ events }: { events: ParsedEvent[] }) {
	if (events.length === 0) return null;

	return (
		<div className="rounded-lg border bg-card">
			<div className="border-b px-4 py-3">
				<h3 className="font-medium">Event preview</h3>
			</div>
			<div className="max-h-64 divide-y overflow-y-auto">
				{events.slice(0, 10).map((event, index) => (
					<EventPreviewItem key={`${event.title}-${index}`} event={event} />
				))}
				{events.length > 10 && (
					<div className="px-4 py-3 text-center text-muted-foreground text-sm">
						+ {events.length - 10} more events
					</div>
				)}
			</div>
		</div>
	);
}

// Render drop zone content based on state
function DropZoneContent({
	state,
	file,
	previewEvents,
	error,
	maxSizeMB,
	onReset,
}: {
	state: DropState;
	file: File | null;
	previewEvents: ParsedEvent[];
	error: string | null;
	maxSizeMB: number;
	onReset: () => void;
}) {
	if (state === "processing") {
		return <ProcessingContent />;
	}
	if (state === "success" && file) {
		return (
			<SuccessContent
				file={file}
				eventCount={previewEvents.length}
				onReset={onReset}
			/>
		);
	}
	if (state === "error" && error) {
		return <ErrorContent error={error} onReset={onReset} />;
	}
	return (
		<IdleContent isDragOver={state === "drag-over"} maxSizeMB={maxSizeMB} />
	);
}

export function FileDropZone({
	accept = ".ics",
	maxSizeMB = 5,
	onFileSelect,
	onPreviewParsed,
	disabled = false,
	className,
}: FileDropZoneProps) {
	const [state, setState] = useState<DropState>("idle");
	const [file, setFile] = useState<File | null>(null);
	const [previewEvents, setPreviewEvents] = useState<ParsedEvent[]>([]);
	const [error, setError] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const dragCountRef = useRef(0);

	// Process file
	const processFile = useCallback(
		async (selectedFile: File) => {
			setError(null);

			// Validate file
			const validation = validateFile(selectedFile, maxSizeMB);
			if (!validation.valid) {
				setError(validation.error || "Invalid file");
				setState("error");
				return;
			}

			setState("processing");
			setFile(selectedFile);

			try {
				const content = await selectedFile.text();
				const events = parseIcsContent(content);
				setPreviewEvents(events);
				onPreviewParsed?.(events);
				onFileSelect(selectedFile);
				setState("success");
			} catch {
				setError("Error reading file");
				setState("error");
			}
		},
		[maxSizeMB, onFileSelect, onPreviewParsed],
	);

	// Drag handlers
	const handleDragEnter = useCallback(
		(e: React.DragEvent<HTMLButtonElement>) => {
			e.preventDefault();
			e.stopPropagation();
			if (disabled) return;

			dragCountRef.current++;
			if (e.dataTransfer.types.includes("Files")) {
				setState("drag-over");
			}
		},
		[disabled],
	);

	const handleDragLeave = useCallback(
		(e: React.DragEvent<HTMLButtonElement>) => {
			e.preventDefault();
			e.stopPropagation();
			if (disabled) return;

			dragCountRef.current--;
			if (dragCountRef.current === 0) {
				setState((prev) => (prev === "drag-over" ? "idle" : prev));
			}
		},
		[disabled],
	);

	const handleDragOver = useCallback(
		(e: React.DragEvent<HTMLButtonElement>) => {
			e.preventDefault();
			e.stopPropagation();
			if (disabled) return;
		},
		[disabled],
	);

	const handleDrop = useCallback(
		(e: React.DragEvent<HTMLButtonElement>) => {
			e.preventDefault();
			e.stopPropagation();
			dragCountRef.current = 0;

			if (disabled) return;

			const droppedFile = e.dataTransfer.files[0];
			if (droppedFile) {
				processFile(droppedFile);
			} else {
				setState("idle");
			}
		},
		[disabled, processFile],
	);

	// Click to select
	const handleClick = useCallback(() => {
		if (!disabled) {
			inputRef.current?.click();
		}
	}, [disabled]);

	const handleInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const selectedFile = e.target.files?.[0];
			if (selectedFile) {
				processFile(selectedFile);
			}
		},
		[processFile],
	);

	// Reset
	const handleReset = useCallback(() => {
		setFile(null);
		setPreviewEvents([]);
		setError(null);
		setState("idle");
		if (inputRef.current) {
			inputRef.current.value = "";
		}
	}, []);

	// Reset drag counter on unmount
	useEffect(() => {
		return () => {
			dragCountRef.current = 0;
		};
	}, []);

	const buttonClassName = cn(
		"relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200",
		"cursor-pointer hover:border-primary/50 hover:bg-primary/5",
		"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
		state === "idle" && "border-muted-foreground/25",
		state === "drag-over" && "scale-[1.02] border-primary bg-primary/10",
		state === "processing" && "border-primary/50 bg-primary/5",
		state === "success" && "border-green-500/50 bg-green-500/5",
		state === "error" && "border-destructive/50 bg-destructive/5",
		disabled && "cursor-not-allowed opacity-50",
	);

	return (
		<div className={cn("space-y-4", className)}>
			<button
				type="button"
				onDragEnter={handleDragEnter}
				onDragLeave={handleDragLeave}
				onDragOver={handleDragOver}
				onDrop={handleDrop}
				onClick={handleClick}
				disabled={disabled}
				className={buttonClassName}
			>
				<input
					ref={inputRef}
					type="file"
					accept={accept}
					onChange={handleInputChange}
					disabled={disabled}
					className="hidden"
					aria-label="Select a file"
				/>
				<DropZoneContent
					state={state}
					file={file}
					previewEvents={previewEvents}
					error={error}
					maxSizeMB={maxSizeMB}
					onReset={handleReset}
				/>
			</button>

			{state === "success" && <EventsPreview events={previewEvents} />}
		</div>
	);
}
