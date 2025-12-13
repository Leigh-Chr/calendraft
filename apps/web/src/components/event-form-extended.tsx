import { useIsMobile } from "@calendraft/react-utils";
import type { ValidationErrors } from "@calendraft/schemas";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
	Bell,
	Code,
	FileText,
	HelpCircle,
	Link2,
	Loader2,
	MapPin,
	Repeat,
	Settings,
	Users,
	X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AdditionalInfoSection } from "@/components/event-form/additional-info-section";
import { AlarmsSection } from "@/components/event-form/alarms-section";
import { AttendeesSection } from "@/components/event-form/attendees-section";
import { BasicInfoSection } from "@/components/event-form/basic-info-section";
import { CollapsibleSection } from "@/components/event-form/collapsible-section";
import { ExpertModeSection } from "@/components/event-form/expert-mode-section";
import { LocationSection } from "@/components/event-form/location-section";
import { MetadataSection } from "@/components/event-form/metadata-section";
import { RecurrenceSection } from "@/components/event-form/recurrence-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SelectItem } from "@/components/ui/select";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAlarmTriggers } from "@/hooks/use-alarm-triggers";
import { formatDuration } from "@/lib/alarm-parser";
import { parseDateArray } from "@/lib/date-parser";
import { deepEqual } from "@/lib/deep-equal";
import type {
	AlarmFormData,
	AttendeeFormData,
	EventFormData,
} from "@/lib/event-form-types";
import {
	hasValidationErrors,
	validateEndDate,
	validateEventForm,
	validateGeoCoordinates,
	validateStartDate,
} from "@/lib/event-form-validation-zod";
import { initializeFormData } from "@/lib/form-initializer";
import { trpc } from "@/utils/trpc";

// Re-export types for backward compatibility
export type {
	AlarmFormData,
	AttendeeFormData,
	EventFormData,
} from "@/lib/event-form-types";

interface EventFormProps {
	initialData?: Partial<EventFormData>;
	onSubmit: (data: EventFormData) => void;
	onCancel: () => void;
	isSubmitting: boolean;
	mode: "create" | "edit";
	calendarId?: string; // For RELATED-TO select
	showAllSections?: boolean;
	fromQuickCreate?: boolean;
	onReturnToQuickCreate?: () => void;
	initialValidationErrors?: ValidationErrors;
}

// Component to list events for RELATED-TO select
function RelatedToEventList({
	calendarId,
	currentEventId,
}: {
	calendarId: string;
	currentEventId?: string;
}) {
	const { data: eventsData } = useQuery({
		...trpc.event.list.queryOptions({
			calendarId,
			sortBy: "date",
		}),
	});

	const events = eventsData?.events || [];

	if (!events || events.length === 0) {
		return null;
	}

	return (
		<>
			{events
				.filter((event) => event.uid !== currentEventId && event.uid) // Filter out current event and events without UID
				.map((event) => (
					<SelectItem key={event.uid || event.id} value={event.uid || event.id}>
						{event.title} -{" "}
						{format(new Date(event.startDate), "yyyy-MM-dd HH:mm")}
					</SelectItem>
				))}
		</>
	);
}

// Helper to initialize expanded sections based on initial data
function initializeExpandedSections(
	initialData?: Partial<EventFormData>,
	showAllSectionsProp = false,
): Set<string> {
	const sections = new Set<string>(["basic"]);
	if (initialData?.rrule || initialData?.rdate || initialData?.exdate) {
		sections.add("recurrence");
	}
	if (showAllSectionsProp) {
		sections.add("advanced");
		sections.add("geo");
		sections.add("metadata");
		sections.add("additional");
	}
	return sections;
}

// Hook to initialize form state
function useEventFormState(
	initialData?: Partial<EventFormData>,
	showAllSectionsProp = false,
	initialValidationErrors?: ValidationErrors,
) {
	const [formData, setFormData] = useState<EventFormData>(() =>
		initializeFormData(initialData),
	);
	const [expandedSections, setExpandedSections] = useState<Set<string>>(() =>
		initializeExpandedSections(initialData, showAllSectionsProp),
	);
	const [rdateList, setRdateList] = useState<Date[]>([]);
	const [exdateList, setExdateList] = useState<Date[]>([]);
	const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
		initialValidationErrors || {},
	);
	const [hasModifications, setHasModifications] = useState(false);
	const [initialFormData, setInitialFormData] = useState<EventFormData | null>(
		null,
	);
	const [expertMode, setExpertMode] = useState(false);

	return {
		formData,
		setFormData,
		expandedSections,
		setExpandedSections,
		rdateList,
		setRdateList,
		exdateList,
		setExdateList,
		validationErrors,
		setValidationErrors,
		hasModifications,
		setHasModifications,
		initialFormData,
		setInitialFormData,
		expertMode,
		setExpertMode,
	};
}

export function EventFormExtended({
	initialData,
	onSubmit,
	onCancel,
	isSubmitting,
	mode,
	calendarId,
	showAllSections: showAllSectionsProp = false,
	fromQuickCreate = false,
	onReturnToQuickCreate,
	initialValidationErrors,
}: EventFormProps) {
	const {
		formData,
		setFormData,
		expandedSections,
		setExpandedSections,
		rdateList,
		setRdateList,
		exdateList,
		setExdateList,
		validationErrors,
		setValidationErrors,
		hasModifications,
		setHasModifications,
		initialFormData,
		setInitialFormData,
		expertMode,
		setExpertMode,
	} = useEventFormState(
		initialData,
		showAllSectionsProp,
		initialValidationErrors,
	);

	// Use hook for alarm triggers management
	const alarmTriggers = useAlarmTriggers(formData.alarms);

	// Mobile progress indicator
	const isMobile = useIsMobile();
	const formRef = useRef<HTMLFormElement>(null);
	const [currentSection, setCurrentSection] = useState(1);
	const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());

	// Track visible section for mobile progress indicator
	useEffect(() => {
		if (!isMobile || !formRef.current) return;

		const observer = new IntersectionObserver(
			(entries) => {
				// Find the section that's most visible
				let maxVisible = 0;
				let currentSectionId = "basic";

				entries.forEach((entry) => {
					if (entry.isIntersecting && entry.intersectionRatio > maxVisible) {
						maxVisible = entry.intersectionRatio;
						currentSectionId =
							entry.target.getAttribute("data-section-id") || "basic";
					}
				});

				// Map section ID to number
				const sectionMap: Record<string, number> = {
					basic: 1,
					recurrence: 2,
					people: 3,
					alarms: 4,
					advanced: 5,
				};

				const sectionNumber = sectionMap[currentSectionId];
				if (sectionNumber !== undefined) {
					setCurrentSection(sectionNumber);
				}
			},
			{
				threshold: [0, 0.25, 0.5, 0.75, 1],
				rootMargin: "-100px 0px -50% 0px",
			},
		);

		// Small delay to ensure refs are set
		const timeoutId = setTimeout(() => {
			// Observe all section containers
			sectionRefs.current.forEach((ref) => {
				if (ref) observer.observe(ref);
			});
		}, 100);

		return () => {
			clearTimeout(timeoutId);
			observer.disconnect();
		};
	}, [isMobile]);

	const setSectionRef = (id: string) => (el: HTMLDivElement | null) => {
		if (el) {
			sectionRefs.current.set(id, el);
		} else {
			sectionRefs.current.delete(id);
		}
	};

	useEffect(() => {
		if (initialData) {
			const newFormData = initializeFormData(initialData);
			setFormData(newFormData);
			setInitialFormData(newFormData);

			// Parse RDATE/EXDATE from JSON strings
			const rdates = parseDateArray(initialData.rdate, "RDATE");
			if (rdates.length === 0 && initialData.rdate) {
				toast.error("Invalid date format for additional dates (RDATE)");
			}
			setRdateList(rdates);

			const exdates = parseDateArray(initialData.exdate, "EXDATE");
			if (exdates.length === 0 && initialData.exdate) {
				toast.error("Invalid date format for exception dates (EXDATE)");
			}
			setExdateList(exdates);
		}
	}, [
		initialData,
		setRdateList,
		setExdateList,
		setInitialFormData,
		setFormData,
	]);

	// Update validation errors when initialValidationErrors changes
	useEffect(() => {
		if (initialValidationErrors) {
			setValidationErrors(initialValidationErrors);
			// Expand relevant sections if there are errors
			if (
				initialValidationErrors.endDate ||
				initialValidationErrors.startDate
			) {
				setExpandedSections((prev) => new Set(prev).add("basic"));
			}
			if (initialValidationErrors.alarms) {
				setExpandedSections((prev) => new Set(prev).add("alarms"));
			}
		}
	}, [initialValidationErrors, setExpandedSections, setValidationErrors]);

	// Track modifications with optimized comparison
	useEffect(() => {
		if (initialFormData) {
			const modified = !deepEqual(formData, initialFormData);
			setHasModifications(modified);
		}
	}, [formData, initialFormData, setHasModifications]);

	// Prevent data loss on page unload
	useEffect(() => {
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			if (hasModifications && mode === "edit") {
				e.preventDefault();
				e.returnValue =
					"You have unsaved changes. Are you sure you want to leave?";
				return e.returnValue;
			}
		};

		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
		};
	}, [hasModifications, mode]);

	// Auto-scroll to input on focus (mobile keyboard avoidance)
	useEffect(() => {
		if (!isMobile) return;

		const handleFocus = (e: FocusEvent) => {
			const target = e.target as HTMLElement;
			if (
				(target.tagName === "INPUT" || target.tagName === "TEXTAREA") &&
				formRef.current?.contains(target)
			) {
				// Delay to allow keyboard to open
				setTimeout(() => {
					target.scrollIntoView({
						behavior: "smooth",
						block: "center",
						inline: "nearest",
					});
				}, 300);
			}
		};

		document.addEventListener("focusin", handleFocus);
		return () => {
			document.removeEventListener("focusin", handleFocus);
		};
	}, [isMobile]);

	// React Compiler will automatically memoize these callbacks
	const toggleSection = (section: string) => {
		const newExpanded = new Set(expandedSections);
		if (newExpanded.has(section)) {
			newExpanded.delete(section);
		} else {
			newExpanded.add(section);
		}
		setExpandedSections(newExpanded);
	};

	const getFirstError = (errors: ValidationErrors): string | null => {
		// Priority order for error display
		const errorChecks: Array<() => string | null> = [
			() => errors.title || null,
			() => errors.startDate || null,
			() => errors.endDate || null,
			() => errors.dates || null,
			() => errors.url || null,
			() => errors.organizerEmail || null,
			() =>
				errors.attendeeEmails && Object.keys(errors.attendeeEmails).length > 0
					? "Please correct invalid attendee emails"
					: null,
			() => errors.geoLatitude || null,
			() => errors.geoLongitude || null,
			() =>
				errors.alarms && Object.keys(errors.alarms).length > 0
					? "Please correct errors in alerts"
					: null,
			() => errors.uid || null,
			() => errors.recurrenceId || null,
			() => errors.relatedTo || null,
		];

		for (const check of errorChecks) {
			const error = check();
			if (error) return error;
		}
		return null;
	};

	/**
	 * Get the ID of the first field with an error for scrolling
	 */
	// Helper to get first attendee email error field ID
	const getFirstAttendeeErrorFieldId = (
		attendeeEmails: ValidationErrors["attendeeEmails"],
	): string | null => {
		if (!attendeeEmails || Object.keys(attendeeEmails).length === 0) {
			return null;
		}
		const firstIndexStr = Object.keys(attendeeEmails)[0];
		return firstIndexStr ? `attendee-email-${firstIndexStr}` : null;
	};

	// Helper to get alarm error field name from alarm error object
	const getAlarmErrorFieldName = (
		alarmError: unknown,
		indexStr: string,
	): string => {
		if (typeof alarmError === "object" && alarmError !== null) {
			if ("duration" in alarmError && alarmError.duration) {
				return `alarm-duration-${indexStr}`;
			}
			if ("trigger" in alarmError && alarmError.trigger) {
				return `alarm-trigger-${indexStr}`;
			}
		}
		return `alarm-duration-${indexStr}`; // Fallback to duration
	};

	// Helper to get first alarm error field ID
	const getFirstAlarmErrorFieldId = (
		alarms: ValidationErrors["alarms"],
	): string | null => {
		if (!alarms || Object.keys(alarms).length === 0) {
			return null;
		}
		const firstIndexStr = Object.keys(alarms)[0];
		if (!firstIndexStr) {
			return null;
		}
		const firstIndex = Number.parseInt(firstIndexStr, 10);
		if (Number.isNaN(firstIndex)) {
			return null;
		}
		const alarmError = alarms[firstIndex as unknown as number];
		return getAlarmErrorFieldName(alarmError, firstIndexStr);
	};

	const getFirstErrorFieldId = (errors: ValidationErrors): string | null => {
		// Check top-level errors first
		const topLevelFields: Array<keyof ValidationErrors> = [
			"title",
			"startDate",
			"endDate",
			"url",
			"organizerEmail",
			"geoLatitude",
			"geoLongitude",
			"uid",
			"recurrenceId",
			"relatedTo",
		];
		for (const field of topLevelFields) {
			if (errors[field]) {
				return field;
			}
		}

		// Check nested errors
		const attendeeError = getFirstAttendeeErrorFieldId(errors.attendeeEmails);
		if (attendeeError) {
			return attendeeError;
		}

		const alarmError = getFirstAlarmErrorFieldId(errors.alarms);
		if (alarmError) {
			return alarmError;
		}

		return null;
	};

	const showFirstValidationError = (errors: ValidationErrors) => {
		const firstError = getFirstError(errors);
		if (firstError) {
			toast.error(firstError);
		}
	};

	// Helper to determine which section to expand based on field ID
	const getSectionForFieldId = (fieldId: string): string | null => {
		if (
			fieldId === "startDate" ||
			fieldId === "endDate" ||
			fieldId === "title"
		) {
			return "basic";
		}
		if (fieldId.startsWith("attendee-email-")) {
			return "people";
		}
		if (fieldId.startsWith("alarm-")) {
			return "alarms";
		}
		if (fieldId === "geoLatitude" || fieldId === "geoLongitude") {
			return "geo";
		}
		return null;
	};

	// Helper to scroll to and focus an element
	const scrollToElement = (element: HTMLElement) => {
		element.scrollIntoView({
			behavior: "smooth",
			block: "center",
			inline: "nearest",
		});
		// Focus on the element for better accessibility
		if (
			element instanceof HTMLInputElement ||
			element instanceof HTMLTextAreaElement
		) {
			element.focus();
		}
	};

	/**
	 * Scroll to the first field with a validation error
	 */
	const scrollToFirstError = (errors: ValidationErrors) => {
		const fieldId = getFirstErrorFieldId(errors);
		if (!fieldId) return;

		// Small delay to ensure DOM is updated
		setTimeout(() => {
			const element = document.getElementById(fieldId);
			if (!element) return;

			// Expand the section if it's collapsed
			const section = getSectionForFieldId(fieldId);
			if (section) {
				setExpandedSections((prev) => new Set(prev).add(section));
			}

			// Scroll to the element after section expansion
			setTimeout(() => {
				scrollToElement(element);
			}, 100);
		}, 100);
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		// Validate form data
		const errors = validateEventForm(formData);

		if (hasValidationErrors(errors)) {
			setValidationErrors(errors);
			showFirstValidationError(errors);
			// Scroll to first error field
			scrollToFirstError(errors);
			return;
		}

		// Clear validation errors and submit
		setValidationErrors({});
		setHasModifications(false);
		onSubmit(formData);
	};

	const addAttendee = () => {
		setFormData((prev) => ({
			...prev,
			attendees: [...(prev.attendees || []), { email: "", rsvp: false }],
		}));
	};

	const removeAttendee = (index: number) => {
		setFormData((prev) => ({
			...prev,
			attendees: prev.attendees?.filter((_, i) => i !== index) || [],
		}));
	};

	const updateAttendee = (index: number, data: Partial<AttendeeFormData>) => {
		setFormData((prev) => {
			const updated =
				prev.attendees?.map((a, i) => (i === index ? { ...a, ...data } : a)) ||
				[];
			return { ...prev, attendees: updated };
		});
	};

	const addAlarm = () => {
		setFormData((prev) => ({
			...prev,
			alarms: [
				...(prev.alarms || []),
				{ trigger: "-PT15M", action: "DISPLAY" },
			],
		}));
	};

	const removeAlarm = (index: number) => {
		setFormData((prev) => ({
			...prev,
			alarms: prev.alarms?.filter((_, i) => i !== index) || [],
		}));
	};

	const updateAlarm = (index: number, data: Partial<AlarmFormData>) => {
		setFormData((prev) => {
			const updated =
				prev.alarms?.map((a, i) => (i === index ? { ...a, ...data } : a)) || [];
			return { ...prev, alarms: updated };
		});
	};

	const updateAlarmTrigger = (
		index: number,
		when: "before" | "at" | "after",
		value: number,
		unit: "minutes" | "hours" | "days",
	) => {
		// For "at" triggers, we need to use the event start date as absolute time
		// For now, we'll use an empty string or a special format
		// The ICS format for "at" is an absolute date-time
		if (when === "at") {
			// Use the event start date as absolute time trigger
			// Format: YYYYMMDDTHHmmssZ
			if (formData.startDate) {
				const startDate = new Date(formData.startDate);
				const year = startDate.getUTCFullYear();
				const month = String(startDate.getUTCMonth() + 1).padStart(2, "0");
				const day = String(startDate.getUTCDate()).padStart(2, "0");
				const hours = String(startDate.getUTCHours()).padStart(2, "0");
				const minutes = String(startDate.getUTCMinutes()).padStart(2, "0");
				const seconds = String(startDate.getUTCSeconds()).padStart(2, "0");
				const triggerStr = `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
				updateAlarm(index, { trigger: triggerStr });
			} else {
				// If no start date, use empty string (will be set when start date is available)
				updateAlarm(index, { trigger: "" });
			}
		} else {
			const triggerStr = formatDuration(when, value, unit);
			if (triggerStr) {
				updateAlarm(index, { trigger: triggerStr });
			}
		}
	};

	const totalSections = 5;

	return (
		<TooltipProvider>
			<Card>
				<CardHeader>
					<div className="flex items-start justify-between">
						<div className="space-y-2">
							<CardTitle className="flex items-center gap-2">
								{mode === "create" ? "Create an event" : "Edit event"}
								{hasModifications && mode === "edit" && (
									<Badge variant="outline" className="text-xs">
										Unsaved changes
									</Badge>
								)}
							</CardTitle>
							<CardDescription>
								Fill in your event information. Fields marked with an asterisk
								(*) are required.
							</CardDescription>
							{fromQuickCreate && (
								<div className="flex items-center gap-2 pt-2 text-muted-foreground text-sm">
									<span>⚡ Quick creation</span>
									<span>→</span>
									<span>📋 Advanced options</span>
									{onReturnToQuickCreate && (
										<Button
											type="button"
											variant="link"
											size="sm"
											onClick={onReturnToQuickCreate}
											className="h-auto p-0 text-sm"
										>
											← Back
										</Button>
									)}
								</div>
							)}
						</div>
					</div>
				</CardHeader>
				{/* Mobile progress indicator */}
				{isMobile && (
					<div className="sticky top-0 z-10 border-b bg-card/95 px-6 py-3 backdrop-blur-sm sm:hidden">
						<div className="mb-2 flex items-center justify-between text-xs">
							<span className="text-muted-foreground">
								Section {currentSection} of {totalSections}
							</span>
							<span className="font-medium">
								{Math.round((currentSection / totalSections) * 100)}%
							</span>
						</div>
						<Progress
							value={(currentSection / totalSections) * 100}
							className="h-1.5"
						/>
					</div>
				)}
				<CardContent>
					<form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
						{/* Section 1: Essential information */}
						<div ref={setSectionRef("basic")} data-section-id="basic">
							<CollapsibleSection
								id="basic"
								title="Essential information"
								isExpanded={expandedSections.has("basic")}
								onToggle={() => toggleSection("basic")}
								icon={FileText}
							>
								<BasicInfoSection
									formData={formData}
									onChange={(data: Partial<EventFormData>) => {
										setFormData({ ...formData, ...data });
										// Real-time validation
										if (data.title !== undefined) {
											const titleError = data.title.trim()
												? undefined
												: "Title is required";
											setValidationErrors((prev) => ({
												...prev,
												title: titleError,
											}));
										}
										if (
											data.startDate !== undefined ||
											data.endDate !== undefined
										) {
											const newData = { ...formData, ...data };
											const startError = validateStartDate(
												newData.startDate,
												newData.endDate,
											);
											const endError = validateEndDate(
												newData.endDate,
												newData.startDate,
											);
											setValidationErrors((prev) => ({
												...prev,
												startDate: startError,
												endDate: endError,
												dates:
													startError || endError
														? startError || endError
														: undefined,
											}));
										}
									}}
									validationErrors={{
										title: validationErrors.title,
										startDate: validationErrors.startDate,
										endDate: validationErrors.endDate,
									}}
									onValidationErrorChange={(errors) => {
										setValidationErrors((prev) => ({ ...prev, ...errors }));
									}}
									isSubmitting={isSubmitting}
								/>
							</CollapsibleSection>
						</div>

						{/* Section 2: Recurrence */}
						<div ref={setSectionRef("recurrence")} data-section-id="recurrence">
							<CollapsibleSection
								id="recurrence"
								title="Recurrence"
								isExpanded={expandedSections.has("recurrence")}
								onToggle={() => toggleSection("recurrence")}
								icon={Repeat}
							>
								<RecurrenceSection
									formData={formData}
									onChange={(data: Partial<EventFormData>) =>
										setFormData({ ...formData, ...data })
									}
									rdateList={rdateList}
									exdateList={exdateList}
									onRdateChange={setRdateList}
									onExdateChange={setExdateList}
									isSubmitting={isSubmitting}
								/>
							</CollapsibleSection>
						</div>

						{/* Section 3: Participants and organizer */}
						<div ref={setSectionRef("people")} data-section-id="people">
							<CollapsibleSection
								id="people"
								title="Attendees and organizer"
								isExpanded={expandedSections.has("people")}
								onToggle={() => toggleSection("people")}
								icon={Users}
							>
								<AttendeesSection
									formData={formData}
									onChange={(data: Partial<EventFormData>) =>
										setFormData({ ...formData, ...data })
									}
									onAttendeeChange={updateAttendee}
									onAddAttendee={addAttendee}
									onRemoveAttendee={removeAttendee}
									validationErrors={validationErrors}
									onValidationErrorChange={setValidationErrors}
									isSubmitting={isSubmitting}
								/>
							</CollapsibleSection>
						</div>

						{/* Section 4: Alerts and notifications */}
						<div ref={setSectionRef("alarms")} data-section-id="alarms">
							<CollapsibleSection
								id="alarms"
								title="Alerts and notifications"
								isExpanded={expandedSections.has("alarms")}
								onToggle={() => toggleSection("alarms")}
								badge={formData.alarms?.length || 0}
								icon={Bell}
							>
								<AlarmsSection
									alarms={formData.alarms}
									alarmTriggers={alarmTriggers}
									onAlarmChange={updateAlarm}
									onAlarmTriggerChange={updateAlarmTrigger}
									onAddAlarm={addAlarm}
									onRemoveAlarm={removeAlarm}
									validationErrors={validationErrors.alarms}
									onValidationErrorChange={(errors) => {
										setValidationErrors((prev) => ({
											...prev,
											alarms: errors,
										}));
									}}
									isSubmitting={isSubmitting}
								/>
							</CollapsibleSection>
						</div>

						{/* Section 5: Advanced options (closed by default) */}
						<div ref={setSectionRef("advanced")} data-section-id="advanced">
							<CollapsibleSection
								id="advanced"
								title="Advanced options"
								description="Precise location, organization, visibility, additional information, and expert mode."
								isExpanded={expandedSections.has("advanced")}
								onToggle={() => toggleSection("advanced")}
								icon={Settings}
							>
								<div className="space-y-6">
									{/* Section 3: Advanced location */}
									<CollapsibleSection
										id="geo"
										title="Advanced location"
										description="Precise geographic coordinates for the event location."
										isExpanded={expandedSections.has("geo")}
										onToggle={() => toggleSection("geo")}
										icon={MapPin}
									>
										<LocationSection
											formData={formData}
											onChange={(data: Partial<EventFormData>) => {
												setFormData({ ...formData, ...data });
												// Real-time validation for coordinates
												if (
													data.geoLatitude !== undefined ||
													data.geoLongitude !== undefined
												) {
													const newData = { ...formData, ...data };
													const geoErrors = validateGeoCoordinates(
														newData.geoLatitude,
														newData.geoLongitude,
													);
													setValidationErrors((prev) => ({
														...prev,
														geoLatitude: geoErrors?.geoLatitude,
														geoLongitude: geoErrors?.geoLongitude,
													}));
												}
											}}
											validationErrors={{
												geoLatitude: validationErrors.geoLatitude,
												geoLongitude: validationErrors.geoLongitude,
											}}
											onValidationErrorChange={(errors) => {
												setValidationErrors((prev) => ({ ...prev, ...errors }));
											}}
											isSubmitting={isSubmitting}
										/>
									</CollapsibleSection>

									{/* Section 6: Organization and visibility */}
									<CollapsibleSection
										id="metadata"
										title="Organization and visibility"
										description="Status, priority, categories, color, visibility, and event availability."
										isExpanded={expandedSections.has("metadata")}
										onToggle={() => toggleSection("metadata")}
										icon={Settings}
									>
										<MetadataSection
											formData={formData}
											onChange={(data: Partial<EventFormData>) =>
												setFormData({ ...formData, ...data })
											}
											isSubmitting={isSubmitting}
										/>
									</CollapsibleSection>

									{/* Section 7: Additional information */}
									<CollapsibleSection
										id="additional"
										title="Additional information"
										description="URL, required resources, and other details."
										isExpanded={expandedSections.has("additional")}
										onToggle={() => toggleSection("additional")}
										icon={Link2}
									>
										<AdditionalInfoSection
											formData={formData}
											onChange={(data: Partial<EventFormData>) =>
												setFormData({ ...formData, ...data })
											}
											validationErrors={validationErrors}
											onValidationErrorChange={setValidationErrors}
											isSubmitting={isSubmitting}
										/>
									</CollapsibleSection>

									{/* Section 8: Mode Expert */}
									<div className="space-y-4">
										<div className="flex items-center justify-between">
											<button
												type="button"
												onClick={() => {
													setExpertMode(!expertMode);
													if (!expertMode) {
														setExpandedSections(
															(prev) => new Set([...prev, "expert"]),
														);
													}
												}}
												className="flex items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground"
											>
												<span>Expert Mode</span>
												<HelpCircle className="h-4 w-4" />
											</button>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() => setExpertMode(!expertMode)}
												disabled={isSubmitting}
											>
												{expertMode ? "Hide" : "Show"}
											</Button>
										</div>
										{expertMode && (
											<CollapsibleSection
												id="expert"
												title="Advanced ICS properties"
												description="Technical fields for advanced users (UID, RECURRENCE-ID, etc.)."
												isExpanded={expandedSections.has("expert")}
												onToggle={() => toggleSection("expert")}
												icon={Code}
											>
												<ExpertModeSection
													formData={formData}
													onChange={(data: Partial<EventFormData>) =>
														setFormData({ ...formData, ...data })
													}
													calendarId={calendarId}
													currentEventId={initialData?.uid}
													isSubmitting={isSubmitting}
													relatedToEventList={
														calendarId ? (
															<RelatedToEventList
																calendarId={calendarId}
																currentEventId={initialData?.uid}
															/>
														) : undefined
													}
													validationErrors={{
														uid: validationErrors.uid,
														recurrenceId: validationErrors.recurrenceId,
														relatedTo: validationErrors.relatedTo,
													}}
													onValidationErrorChange={(errors) => {
														setValidationErrors((prev) => ({
															...prev,
															...errors,
														}));
													}}
												/>
											</CollapsibleSection>
										)}
									</div>
								</div>
							</CollapsibleSection>
						</div>

						{/* Boutons sticky sur mobile */}
						<div className="-mx-6 -mb-6 sticky bottom-0 z-10 border-t bg-card/95 p-4 backdrop-blur-sm sm:static sm:mx-0 sm:mb-0 sm:border-t-0 sm:bg-transparent sm:pt-4 sm:backdrop-blur-0">
							<div className="flex gap-2">
								<Button
									type="submit"
									disabled={!formData.title.trim() || isSubmitting}
									className="min-h-[44px] flex-1 sm:min-h-0"
								>
									{isSubmitting ? (
										<>
											<Loader2 className="h-4 w-4 animate-spin" />
											{mode === "create" ? "Creating..." : "Updating..."}
										</>
									) : mode === "create" ? (
										<>
											<FileText className="h-4 w-4" />
											Create
										</>
									) : (
										<>
											<FileText className="h-4 w-4" />
											Save
										</>
									)}
								</Button>
								<Button
									type="button"
									variant="outline"
									onClick={onCancel}
									disabled={isSubmitting}
									className="min-h-[44px] sm:min-h-0"
								>
									<X className="h-4 w-4" />
									Cancel
								</Button>
							</div>
						</div>
					</form>
				</CardContent>
			</Card>
		</TooltipProvider>
	);
}
