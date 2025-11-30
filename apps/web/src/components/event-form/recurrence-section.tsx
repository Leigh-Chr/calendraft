import { CalendarPlus, CalendarX, Repeat } from "lucide-react";
import { DateListPicker } from "@/components/date-list-picker";
import { RecurrenceBuilder } from "@/components/recurrence-builder";
import { Label } from "@/components/ui/label";
import { stringifyDateArray } from "@/lib/date-parser";
import type { EventFormData } from "@/lib/event-form-types";

interface RecurrenceSectionProps {
	formData: EventFormData;
	onChange: (data: Partial<EventFormData>) => void;
	rdateList: Date[];
	exdateList: Date[];
	onRdateChange: (dates: Date[]) => void;
	onExdateChange: (dates: Date[]) => void;
	isSubmitting: boolean;
}

/**
 * Section for event recurrence settings (RRULE, RDATE, EXDATE)
 */
export function RecurrenceSection({
	formData,
	onChange,
	rdateList,
	exdateList,
	onRdateChange,
	onExdateChange,
	isSubmitting,
}: RecurrenceSectionProps) {
	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<Label className="flex items-center gap-2">
					<Repeat className="h-4 w-4 text-muted-foreground" />
					Règle de récurrence
				</Label>
				<RecurrenceBuilder
					rrule={formData.rrule || ""}
					onChange={(rrule) => onChange({ rrule })}
					disabled={isSubmitting}
					startDate={
						formData.startDate ? new Date(formData.startDate) : undefined
					}
				/>
				<p className="text-muted-foreground text-xs">
					Définissez comment l'événement se répète (quotidien, hebdomadaire,
					mensuel, etc.). Laissez vide pour un événement unique.
				</p>
			</div>
			{formData.rrule?.trim() ? (
				<>
					<div className="space-y-2">
						<div className="mb-2 flex items-center gap-2">
							<CalendarPlus className="h-4 w-4 text-muted-foreground" />
							<Label>Dates additionnelles</Label>
						</div>
						<DateListPicker
							dates={rdateList}
							onChange={(dates) => {
								onRdateChange(dates);
								onChange({ rdate: stringifyDateArray(dates) });
							}}
							disabled={isSubmitting}
							label=""
							placeholder="Ajouter une date additionnelle"
						/>
						<p className="text-muted-foreground text-xs">
							Ajoutez des dates supplémentaires où l'événement doit avoir lieu,
							en plus de celles définies par la règle de récurrence. Utile pour
							ajouter des occurrences exceptionnelles.
						</p>
					</div>
					<div className="space-y-2">
						<div className="mb-2 flex items-center gap-2">
							<CalendarX className="h-4 w-4 text-muted-foreground" />
							<Label>Dates d'exception</Label>
						</div>
						<DateListPicker
							dates={exdateList}
							onChange={(dates) => {
								onExdateChange(dates);
								onChange({ exdate: stringifyDateArray(dates) });
							}}
							disabled={isSubmitting}
							label=""
							placeholder="Ajouter une date d'exception"
						/>
						<p className="text-muted-foreground text-xs">
							Excluez des dates spécifiques de la récurrence. Par exemple, si
							votre événement se répète tous les lundis mais que vous voulez
							exclure un lundi particulier.
						</p>
					</div>
				</>
			) : (
				<div className="flex items-start gap-3 rounded-md border border-muted bg-muted/50 p-4">
					<Repeat className="mt-0.5 h-5 w-5 flex-shrink-0 text-muted-foreground" />
					<p className="text-muted-foreground text-sm">
						Les dates additionnelles et d'exception ne sont disponibles que
						lorsqu'une règle de récurrence est définie. Définissez d'abord une
						règle de récurrence ci-dessus.
					</p>
				</div>
			)}
		</div>
	);
}
