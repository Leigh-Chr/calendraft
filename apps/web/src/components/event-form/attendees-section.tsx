import {
	AlertCircle,
	HelpCircle,
	User,
	UserPlus,
	Users,
	X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AttendeeFormData, EventFormData } from "@/lib/event-form-types";
import { FIELD_LIMITS } from "@/lib/field-limits";
import { validateEmail } from "@/lib/validation";

interface AttendeesSectionProps {
	formData: EventFormData;
	onChange: (data: Partial<EventFormData>) => void;
	onAttendeeChange: (index: number, data: Partial<AttendeeFormData>) => void;
	onAddAttendee: () => void;
	onRemoveAttendee: (index: number) => void;
	validationErrors: {
		organizerEmail?: string;
		attendeeEmails?: Record<number, string>;
	};
	onValidationErrorChange: (errors: {
		organizerEmail?: string;
		attendeeEmails?: Record<number, string>;
	}) => void;
	isSubmitting: boolean;
}

/**
 * Section for event attendees and organizer
 */
export function AttendeesSection({
	formData,
	onChange,
	onAttendeeChange,
	onAddAttendee,
	onRemoveAttendee,
	validationErrors,
	onValidationErrorChange,
	isSubmitting,
}: AttendeesSectionProps) {
	const handleOrganizerEmailChange = (value: string) => {
		onChange({ organizerEmail: value });
		// Clear error on change
		if (validationErrors.organizerEmail) {
			onValidationErrorChange({
				...validationErrors,
				organizerEmail: undefined,
			});
		}
		// Real-time validation
		if (value) {
			const error = validateEmail(value);
			if (error) {
				onValidationErrorChange({ ...validationErrors, organizerEmail: error });
			}
		}
	};

	const handleAttendeeEmailChange = (index: number, value: string) => {
		onAttendeeChange(index, { email: value });
		// Clear error on change
		if (validationErrors.attendeeEmails?.[index]) {
			const newAttendeeEmails = { ...validationErrors.attendeeEmails };
			delete newAttendeeEmails[index];
			onValidationErrorChange({
				...validationErrors,
				attendeeEmails:
					Object.keys(newAttendeeEmails).length > 0
						? newAttendeeEmails
						: undefined,
			});
		}
		// Real-time validation
		if (value) {
			const error = validateEmail(value);
			if (error) {
				onValidationErrorChange({
					...validationErrors,
					attendeeEmails: {
						...validationErrors.attendeeEmails,
						[index]: error,
					},
				});
			}
		}
	};

	return (
		<div className="space-y-6">
			{/* Organizer */}
			<div className="space-y-4">
				<h4 className="mb-2 flex items-center gap-2 font-medium text-sm">
					<User className="h-4 w-4 text-muted-foreground" />
					Organisateur
				</h4>
				<div className="space-y-2">
					<Label htmlFor="organizerName">Nom de l'organisateur</Label>
					<Input
						id="organizerName"
						value={formData.organizerName || ""}
						onChange={(e) => onChange({ organizerName: e.target.value })}
						disabled={isSubmitting}
						maxLength={FIELD_LIMITS.NAME}
						placeholder="Ex: Jean Dupont"
					/>
					<p className="text-muted-foreground text-xs">
						Nom de la personne qui organise cet événement. Optionnel mais
						recommandé pour les événements avec participants.
					</p>
				</div>
				<div className="space-y-2">
					<div className="flex items-center gap-2">
						<Label htmlFor="organizerEmail">Email de l'organisateur</Label>
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<HelpCircle className="h-4 w-4 cursor-help text-muted-foreground" />
								</TooltipTrigger>
								<TooltipContent>
									<p>Email de la personne qui organise l'événement</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>
					<Input
						id="organizerEmail"
						type="email"
						value={formData.organizerEmail || ""}
						onChange={(e) => handleOrganizerEmailChange(e.target.value)}
						disabled={isSubmitting}
						className={
							validationErrors.organizerEmail ? "border-destructive" : ""
						}
						aria-invalid={validationErrors.organizerEmail ? "true" : "false"}
						aria-describedby={
							validationErrors.organizerEmail
								? "organizerEmail-error"
								: undefined
						}
						maxLength={FIELD_LIMITS.EMAIL}
					/>
					{validationErrors.organizerEmail && (
						<p
							id="organizerEmail-error"
							className="flex items-center gap-1 text-destructive text-xs"
							role="alert"
						>
							<AlertCircle className="h-3 w-3" aria-hidden="true" />
							{validationErrors.organizerEmail}
						</p>
					)}
				</div>
			</div>

			{/* Attendees */}
			<div className="space-y-4">
				<div className="mb-2 flex items-center justify-between">
					<h4 className="flex items-center gap-2 font-medium text-sm">
						<Users className="h-4 w-4 text-muted-foreground" />
						Participants ({formData.attendees?.length || 0})
					</h4>
				</div>
				{(!formData.attendees || formData.attendees.length === 0) && (
					<div className="flex items-start gap-3 rounded-md border border-muted bg-muted/50 p-4">
						<Users className="mt-0.5 h-5 w-5 flex-shrink-0 text-muted-foreground" />
						<p className="text-muted-foreground text-sm">
							Aucun participant pour le moment. Cliquez sur "Ajouter un
							participant" ci-dessous pour inviter des personnes à cet
							événement.
						</p>
					</div>
				)}
				{formData.attendees?.map((attendee, index) => (
					<Card
						key={attendee.email || `attendee-${index}`}
						className="border-muted p-4"
					>
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<h4 className="flex items-center gap-2 font-medium">
									<User className="h-4 w-4 text-muted-foreground" />
									Participant {index + 1}
								</h4>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => onRemoveAttendee(index)}
									disabled={isSubmitting}
									aria-label={`Supprimer le participant ${index + 1}`}
								>
									<X className="h-4 w-4" />
									Supprimer
								</Button>
							</div>
							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
								<div className="space-y-2">
									<Label htmlFor={`attendee-name-${index}`}>Nom</Label>
									<Input
										id={`attendee-name-${index}`}
										value={attendee.name || ""}
										onChange={(e) =>
											onAttendeeChange(index, { name: e.target.value })
										}
										disabled={isSubmitting}
										maxLength={FIELD_LIMITS.NAME}
										placeholder="Ex: Marie Martin"
									/>
									<p className="text-muted-foreground text-xs">
										Nom du participant. Optionnel mais recommandé pour faciliter
										l'identification.
									</p>
								</div>
								<div className="space-y-2">
									<Label htmlFor={`attendee-email-${index}`}>
										Email *<span className="sr-only">requis</span>
									</Label>
									<Input
										id={`attendee-email-${index}`}
										type="email"
										value={attendee.email}
										onChange={(e) =>
											handleAttendeeEmailChange(index, e.target.value)
										}
										required
										disabled={isSubmitting}
										className={
											validationErrors.attendeeEmails?.[index]
												? "border-destructive"
												: ""
										}
										aria-required="true"
										aria-invalid={
											validationErrors.attendeeEmails?.[index]
												? "true"
												: "false"
										}
										aria-describedby={
											validationErrors.attendeeEmails?.[index]
												? `attendee-email-${index}-error`
												: undefined
										}
										maxLength={FIELD_LIMITS.EMAIL}
									/>
									{validationErrors.attendeeEmails?.[index] && (
										<p
											id={`attendee-email-${index}-error`}
											className="flex items-center gap-1 text-destructive text-xs"
											role="alert"
										>
											<AlertCircle className="h-3 w-3" aria-hidden="true" />
											{validationErrors.attendeeEmails[index]}
										</p>
									)}
								</div>
							</div>
							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
								<div className="space-y-2">
									<Label htmlFor={`attendee-role-${index}`}>Rôle</Label>
									<Select
										value={attendee.role || "none"}
										onValueChange={(value) =>
											onAttendeeChange(index, {
												role: value === "none" ? undefined : value,
											})
										}
										disabled={isSubmitting}
									>
										<SelectTrigger
											id={`attendee-role-${index}`}
											aria-label={`Rôle du participant ${index + 1}`}
										>
											<SelectValue placeholder="Non défini" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="none">Non défini</SelectItem>
											<SelectItem value="CHAIR">
												Président (anime la réunion)
											</SelectItem>
											<SelectItem value="REQ_PARTICIPANT">
												Requis (doit être présent)
											</SelectItem>
											<SelectItem value="OPT_PARTICIPANT">
												Optionnel (peut être présent)
											</SelectItem>
											<SelectItem value="NON_PARTICIPANT">
												Non participant (observateur)
											</SelectItem>
										</SelectContent>
									</Select>
									<p className="text-muted-foreground text-xs">
										Rôle du participant dans l'événement. Indique son importance
										et sa fonction.
									</p>
								</div>
								<div className="space-y-2">
									<Label htmlFor={`attendee-status-${index}`}>Statut</Label>
									<Select
										value={attendee.status || "none"}
										onValueChange={(value) =>
											onAttendeeChange(index, {
												status: value === "none" ? undefined : value,
											})
										}
										disabled={isSubmitting}
									>
										<SelectTrigger
											id={`attendee-status-${index}`}
											aria-label={`Statut du participant ${index + 1}`}
										>
											<SelectValue placeholder="Non défini" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="none">Non défini</SelectItem>
											<SelectItem value="NEEDS_ACTION">
												Action requise (en attente de réponse)
											</SelectItem>
											<SelectItem value="ACCEPTED">
												Accepté (participera)
											</SelectItem>
											<SelectItem value="DECLINED">
												Refusé (ne participera pas)
											</SelectItem>
											<SelectItem value="TENTATIVE">
												Tentatif (peut-être)
											</SelectItem>
											<SelectItem value="DELEGATED">
												Délégué (a délégué à quelqu'un d'autre)
											</SelectItem>
										</SelectContent>
									</Select>
									<p className="text-muted-foreground text-xs">
										Statut de réponse du participant à l'invitation.
									</p>
								</div>
							</div>
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<div className="space-y-0.5">
										<Label
											htmlFor={`rsvp-${index}`}
											className="cursor-pointer font-normal text-sm"
										>
											Demander une réponse (RSVP)
										</Label>
										<p className="text-muted-foreground text-xs">
											Activez pour recevoir une confirmation de participation de
											ce participant.
										</p>
									</div>
									<Switch
										id={`rsvp-${index}`}
										checked={attendee.rsvp || false}
										onCheckedChange={(checked) =>
											onAttendeeChange(index, { rsvp: checked })
										}
										disabled={isSubmitting}
										aria-label="Demander une réponse RSVP"
									/>
								</div>
							</div>
						</div>
					</Card>
				))}
				<Button
					type="button"
					variant="outline"
					onClick={onAddAttendee}
					disabled={isSubmitting}
				>
					<UserPlus className="h-4 w-4" />
					Ajouter un participant
				</Button>
			</div>
		</div>
	);
}
