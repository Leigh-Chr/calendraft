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
import { useCallback, useEffect, useState } from "react";
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
import type { EventListItem } from "@/lib/event-types";
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

	const events: EventListItem[] = eventsData?.events || [];

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
						{format(new Date(event.startDate), "dd/MM/yyyy HH:mm")}
					</SelectItem>
				))}
		</>
	);
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
	const [formData, setFormData] = useState<EventFormData>(() =>
		initializeFormData(initialData),
	);

	// Initialize expanded sections: always open "basic", open "recurrence" if it exists
	// "advanced" section (containing geo, metadata, additional, expert) is closed by default
	const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
		const sections = new Set<string>(["basic"]);
		if (initialData?.rrule || initialData?.rdate || initialData?.exdate) {
			sections.add("recurrence");
		}
		// If showAllSectionsProp is true, open the advanced section
		if (showAllSectionsProp) {
			sections.add("advanced");
			sections.add("geo");
			sections.add("metadata");
			sections.add("additional");
		}
		return sections;
	});

	// Use hook for alarm triggers management
	const alarmTriggers = useAlarmTriggers(formData.alarms);

	// State for RDATE/EXDATE (Date arrays)
	const [rdateList, setRdateList] = useState<Date[]>([]);
	const [exdateList, setExdateList] = useState<Date[]>([]);

	// State for validation errors
	const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
		initialValidationErrors || {},
	);

	// State to track if form has been modified
	const [hasModifications, setHasModifications] = useState(false);
	const [initialFormData, setInitialFormData] = useState<EventFormData | null>(
		null,
	);

	// State for expert mode
	const [expertMode, setExpertMode] = useState(false);

	useEffect(() => {
		if (initialData) {
			const newFormData = initializeFormData(initialData);
			setFormData(newFormData);
			setInitialFormData(newFormData);

			// Parse RDATE/EXDATE from JSON strings
			const rdates = parseDateArray(initialData.rdate, "RDATE");
			if (rdates.length === 0 && initialData.rdate) {
				toast.error(
					"Format de dates invalide pour les dates additionnelles (RDATE)",
				);
			}
			setRdateList(rdates);

			const exdates = parseDateArray(initialData.exdate, "EXDATE");
			if (exdates.length === 0 && initialData.exdate) {
				toast.error(
					"Format de dates invalide pour les dates d'exception (EXDATE)",
				);
			}
			setExdateList(exdates);
		}
	}, [initialData]);

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
	}, [initialValidationErrors]);

	// Track modifications with optimized comparison
	useEffect(() => {
		if (initialFormData) {
			const modified = !deepEqual(formData, initialFormData);
			setHasModifications(modified);
		}
	}, [formData, initialFormData]);

	// Prevent data loss on page unload
	useEffect(() => {
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			if (hasModifications && mode === "edit") {
				e.preventDefault();
				e.returnValue =
					"Vous avez des modifications non enregistrées. Êtes-vous sûr de vouloir quitter ?";
				return e.returnValue;
			}
		};

		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
		};
	}, [hasModifications, mode]);

	const toggleSection = useCallback(
		(section: string) => {
			const newExpanded = new Set(expandedSections);
			if (newExpanded.has(section)) {
				newExpanded.delete(section);
			} else {
				newExpanded.add(section);
			}
			setExpandedSections(newExpanded);
		},
		[expandedSections],
	);

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
					? "Veuillez corriger les emails invalides des participants"
					: null,
			() => errors.geoLatitude || null,
			() => errors.geoLongitude || null,
			() =>
				errors.alarms && Object.keys(errors.alarms).length > 0
					? "Veuillez corriger les erreurs dans les alertes"
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

	const showFirstValidationError = (errors: ValidationErrors) => {
		const firstError = getFirstError(errors);
		if (firstError) {
			toast.error(firstError);
		}
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		// Validate form data
		const errors = validateEventForm(formData);

		if (hasValidationErrors(errors)) {
			setValidationErrors(errors);
			showFirstValidationError(errors);
			return;
		}

		// Clear validation errors and submit
		setValidationErrors({});
		setHasModifications(false);
		onSubmit(formData);
	};

	const addAttendee = useCallback(() => {
		setFormData((prev) => ({
			...prev,
			attendees: [...(prev.attendees || []), { email: "", rsvp: false }],
		}));
	}, []);

	const removeAttendee = useCallback((index: number) => {
		setFormData((prev) => ({
			...prev,
			attendees: prev.attendees?.filter((_, i) => i !== index) || [],
		}));
	}, []);

	const updateAttendee = useCallback(
		(index: number, data: Partial<AttendeeFormData>) => {
			setFormData((prev) => {
				const updated =
					prev.attendees?.map((a, i) =>
						i === index ? { ...a, ...data } : a,
					) || [];
				return { ...prev, attendees: updated };
			});
		},
		[],
	);

	const addAlarm = useCallback(() => {
		setFormData((prev) => ({
			...prev,
			alarms: [
				...(prev.alarms || []),
				{ trigger: "-PT15M", action: "DISPLAY" },
			],
		}));
	}, []);

	const removeAlarm = useCallback((index: number) => {
		setFormData((prev) => ({
			...prev,
			alarms: prev.alarms?.filter((_, i) => i !== index) || [],
		}));
	}, []);

	const updateAlarm = useCallback(
		(index: number, data: Partial<AlarmFormData>) => {
			setFormData((prev) => {
				const updated =
					prev.alarms?.map((a, i) => (i === index ? { ...a, ...data } : a)) ||
					[];
				return { ...prev, alarms: updated };
			});
		},
		[],
	);

	const updateAlarmTrigger = useCallback(
		(
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
		},
		[updateAlarm, formData.startDate],
	);

	return (
		<TooltipProvider>
			<Card>
				<CardHeader>
					<div className="flex items-start justify-between">
						<div className="space-y-1.5">
							<CardTitle className="flex items-center gap-2">
								{mode === "create"
									? "Créer un événement"
									: "Modifier l'événement"}
								{hasModifications && mode === "edit" && (
									<Badge variant="outline" className="text-xs">
										Modifications non enregistrées
									</Badge>
								)}
							</CardTitle>
							<CardDescription>
								Remplissez les informations de votre événement. Les champs
								marqués d'un astérisque (*) sont obligatoires.
							</CardDescription>
							{fromQuickCreate && (
								<div className="flex items-center gap-2 pt-2 text-muted-foreground text-sm">
									<span>⚡ Création rapide</span>
									<span>→</span>
									<span>📋 Options avancées</span>
									{onReturnToQuickCreate && (
										<Button
											type="button"
											variant="link"
											size="sm"
											onClick={onReturnToQuickCreate}
											className="h-auto p-0 text-sm"
										>
											← Retour
										</Button>
									)}
								</div>
							)}
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-8">
						{/* Section 1: Informations essentielles */}
						<CollapsibleSection
							id="basic"
							title="Informations essentielles"
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
											: "Le titre est requis";
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

						{/* Section 2: Récurrence */}
						<CollapsibleSection
							id="recurrence"
							title="Récurrence"
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

						{/* Section 4: Participants et organisateur */}
						<CollapsibleSection
							id="people"
							title="Participants et organisateur"
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

						{/* Section 5: Alertes et notifications */}
						<CollapsibleSection
							id="alarms"
							title="Alertes et notifications"
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

						{/* Section: Options avancées (fermée par défaut) */}
						<CollapsibleSection
							id="advanced"
							title="Options avancées"
							description="Localisation précise, organisation, visibilité, informations complémentaires et mode expert."
							isExpanded={expandedSections.has("advanced")}
							onToggle={() => toggleSection("advanced")}
							icon={Settings}
						>
							<div className="space-y-6">
								{/* Section 3: Localisation avancée */}
								<CollapsibleSection
									id="geo"
									title="Localisation avancée"
									description="Coordonnées géographiques précises pour le lieu de l'événement."
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

								{/* Section 6: Métadonnées et organisation */}
								<CollapsibleSection
									id="metadata"
									title="Organisation et visibilité"
									description="Statut, priorité, catégories, couleur, visibilité et disponibilité de l'événement."
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

								{/* Section 7: Informations complémentaires */}
								<CollapsibleSection
									id="additional"
									title="Informations complémentaires"
									description="URL, ressources nécessaires et autres détails."
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
											<span>Mode Expert</span>
											<HelpCircle className="h-4 w-4" />
										</button>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => setExpertMode(!expertMode)}
											disabled={isSubmitting}
										>
											{expertMode ? "Masquer" : "Afficher"}
										</Button>
									</div>
									{expertMode && (
										<CollapsibleSection
											id="expert"
											title="Propriétés ICS avancées"
											description="Champs techniques pour les utilisateurs avancés (UID, RECURRENCE-ID, etc.)."
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

						<div className="flex gap-2 pt-4">
							<Button
								type="submit"
								disabled={!formData.title.trim() || isSubmitting}
								className="flex-1"
							>
								{isSubmitting ? (
									<>
										<Loader2 className="h-4 w-4 animate-spin" />
										{mode === "create" ? "Création..." : "Modification..."}
									</>
								) : mode === "create" ? (
									<>
										<FileText className="h-4 w-4" />
										Créer
									</>
								) : (
									<>
										<FileText className="h-4 w-4" />
										Enregistrer
									</>
								)}
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={onCancel}
								disabled={isSubmitting}
							>
								<X className="h-4 w-4" />
								Annuler
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</TooltipProvider>
	);
}
