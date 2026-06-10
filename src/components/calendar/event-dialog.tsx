"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { addDays, format, parseISO } from "date-fns";
import { Clock, Loader2Icon, MapPin, Pencil, Trash2 } from "lucide-react";

import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { Textarea } from "@components/ui/textarea";
import { Checkbox } from "@components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@components/ui/field";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/ui/dialog";
import { cn } from "@lib/utils";
import {
  EVENT_COLORS,
  EVENT_COLOR_IDS,
  colorValue,
  type CalendarEvent,
  type EventColorId,
} from "@lib/schema/event";
import { eventLastDay } from "@lib/calendar/layout";
import { createEvent, deleteEvent, updateEvent } from "@components/calendar/actions";

// Drives the dialog from the calendar: a clicked day opens "create", a clicked
// event opens "view" (which can switch to editing in place).
export type EventDialogState =
  | { mode: "closed" }
  | { mode: "create"; date: Date }
  | { mode: "view"; event: CalendarEvent };

type Props = {
  state: EventDialogState;
  onClose: () => void;
  onSaved: (event: CalendarEvent) => void;
  onDeleted: (id: string) => void;
};

/* ── form ─────────────────────────────────────────────────────────────── */

type FormValues = {
  summary: string;
  allDay: boolean;
  startDate: string; // yyyy-MM-dd
  startTime: string; // HH:mm
  endDate: string;
  endTime: string;
  location: string;
  description: string;
  color: EventColorId;
};

// Resolve the wall-clock form fields into absolute instants in the browser's
// local zone. `end` is exclusive: an all-day event's end is midnight of the day
// AFTER the chosen last day (the iCal/Google convention we store).
function formToInstants(v: FormValues): { start: Date; end: Date } {
  if (v.allDay) {
    return {
      start: new Date(`${v.startDate}T00:00:00`),
      end: addDays(new Date(`${v.endDate}T00:00:00`), 1),
    };
  }
  return {
    start: new Date(`${v.startDate}T${v.startTime || "00:00"}:00`),
    end: new Date(`${v.endDate}T${v.endTime || "00:00"}:00`),
  };
}

const formSchema = z
  .object({
    summary: z.string().trim().min(1, "Title is required").max(200),
    allDay: z.boolean(),
    startDate: z.string().min(1, "Required"),
    startTime: z.string(),
    endDate: z.string().min(1, "Required"),
    endTime: z.string(),
    location: z.string().max(500),
    description: z.string().max(5000),
    color: z.enum(EVENT_COLOR_IDS),
  })
  .superRefine((v, ctx) => {
    if (!v.allDay) {
      if (!v.startTime)
        ctx.addIssue({ code: "custom", message: "Required", path: ["startTime"] });
      if (!v.endTime)
        ctx.addIssue({ code: "custom", message: "Required", path: ["endTime"] });
    }
    const { start, end } = formToInstants(v);
    if (end.getTime() <= start.getTime()) {
      ctx.addIssue({
        code: "custom",
        message: "End must be after start",
        path: [v.allDay ? "endDate" : "endTime"],
      });
    }
  });

function toFormValues(state: EventDialogState): FormValues {
  const blank: FormValues = {
    summary: "",
    allDay: false,
    startDate: "",
    startTime: "09:00",
    endDate: "",
    endTime: "10:00",
    location: "",
    description: "",
    color: "blue",
  };

  if (state.mode === "create") {
    const day = format(state.date, "yyyy-MM-dd");
    return { ...blank, startDate: day, endDate: day };
  }
  if (state.mode === "view") {
    const { event } = state;
    const start = parseISO(event.start);
    return {
      summary: event.summary,
      allDay: event.allDay,
      startDate: format(start, "yyyy-MM-dd"),
      startTime: format(start, "HH:mm"),
      // For all-day events show the inclusive last day, not the exclusive end.
      endDate: format(event.allDay ? eventLastDay(event) : parseISO(event.end), "yyyy-MM-dd"),
      endTime: format(parseISO(event.end), "HH:mm"),
      location: event.location ?? "",
      description: event.description ?? "",
      color: (event.color as EventColorId) ?? "blue",
    };
  }
  return blank;
}

/* ── view-mode formatting ─────────────────────────────────────────────── */

function formatWhen(event: CalendarEvent): string {
  const start = parseISO(event.start);
  if (event.allDay) {
    const last = eventLastDay(event);
    return format(start, "EEE, MMM d") === format(last, "EEE, MMM d")
      ? format(start, "EEE, MMM d, yyyy")
      : `${format(start, "MMM d")} – ${format(last, "MMM d, yyyy")}`;
  }
  const end = parseISO(event.end);
  const sameDay = format(start, "yyyy-MM-dd") === format(end, "yyyy-MM-dd");
  return sameDay
    ? `${format(start, "EEE, MMM d · h:mm a")} – ${format(end, "h:mm a")}`
    : `${format(start, "MMM d, h:mm a")} – ${format(end, "MMM d, h:mm a")}`;
}

/* ── component ────────────────────────────────────────────────────────── */

export default function EventDialog({ state, onClose, onSaved, onDeleted }: Props) {
  const open = state.mode !== "closed";
  const existing = state.mode === "view" ? state.event : null;

  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: toFormValues(state),
  });

  // Re-seed the form and reset transient UI each time the dialog target changes.
  useEffect(() => {
    reset(toFormValues(state));
    setEditing(state.mode === "create");
    setConfirmingDelete(false);
  }, [state, reset]);

  const showForm = state.mode === "create" || editing;

  const onSubmit = async (values: FormValues) => {
    const { start, end } = formToInstants(values);
    const input = {
      summary: values.summary,
      description: values.description || undefined,
      location: values.location || undefined,
      allDay: values.allDay,
      start: start.toISOString(),
      end: end.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      status: "CONFIRMED" as const,
      color: values.color,
    };

    const result = existing
      ? await updateEvent(existing.id, input)
      : await createEvent(input);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success(existing ? "Event updated." : "Event created.");
    onSaved(result.event);
  };

  const onDelete = async () => {
    if (!existing) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setIsDeleting(true);
    const result = await deleteEvent(existing.id);
    setIsDeleting(false);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Event deleted.");
    onDeleted(existing.id);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        {showForm ? (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>{existing ? "Edit event" : "New event"}</DialogTitle>
              <DialogDescription>
                {existing
                  ? "Update the details of this event."
                  : "Add an event to your calendar."}
              </DialogDescription>
            </DialogHeader>

            <Controller
              name="summary"
              control={control}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Title</FieldLabel>
                  <Input
                    id={field.name}
                    {...field}
                    placeholder="Add a title"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="allDay"
              control={control}
              render={({ field }) => (
                <Field orientation="horizontal" className="items-center gap-2">
                  <Checkbox
                    id={field.name}
                    name={field.name}
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                  />
                  <FieldLabel htmlFor={field.name} className="font-normal">
                    All day
                  </FieldLabel>
                </Field>
              )}
            />

            <Controller
              name="allDay"
              control={control}
              render={({ field: allDayField }) => (
                <div className="grid grid-cols-2 gap-3">
                  <Controller
                    name="startDate"
                    control={control}
                    render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel htmlFor={field.name}>Starts</FieldLabel>
                        <Input id={field.name} type="date" {...field} aria-invalid={fieldState.invalid} />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                  {!allDayField.value && (
                    <Controller
                      name="startTime"
                      control={control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel htmlFor={field.name}>Start time</FieldLabel>
                          <Input id={field.name} type="time" {...field} aria-invalid={fieldState.invalid} />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                  )}
                  <Controller
                    name="endDate"
                    control={control}
                    render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel htmlFor={field.name}>Ends</FieldLabel>
                        <Input id={field.name} type="date" {...field} aria-invalid={fieldState.invalid} />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                  {!allDayField.value && (
                    <Controller
                      name="endTime"
                      control={control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel htmlFor={field.name}>End time</FieldLabel>
                          <Input id={field.name} type="time" {...field} aria-invalid={fieldState.invalid} />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                  )}
                </div>
              )}
            />

            <Controller
              name="location"
              control={control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Location</FieldLabel>
                  <Input id={field.name} {...field} placeholder="Optional" />
                </Field>
              )}
            />

            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Notes</FieldLabel>
                  <Textarea id={field.name} {...field} placeholder="Optional" />
                </Field>
              )}
            />

            <Controller
              name="color"
              control={control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>Color</FieldLabel>
                  <div className="flex gap-2">
                    {EVENT_COLORS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        aria-label={c.id}
                        aria-pressed={field.value === c.id}
                        onClick={() => field.onChange(c.id)}
                        className={cn(
                          "size-6 rounded-full ring-2 ring-offset-2 ring-offset-background transition-all",
                          field.value === c.id ? "ring-foreground" : "ring-transparent",
                        )}
                        style={{ backgroundColor: c.value }}
                      />
                    ))}
                  </div>
                </Field>
              )}
            />

            <DialogFooter>
              {existing ? (
                <Button
                  type="button"
                  variant={confirmingDelete ? "destructive" : "outline"}
                  onClick={onDelete}
                  disabled={isDeleting}
                  className="mr-auto"
                >
                  {isDeleting ? <Loader2Icon className="animate-spin" /> : <Trash2 />}
                  {confirmingDelete ? "Confirm delete" : "Delete"}
                </Button>
              ) : null}
              <DialogClose render={<Button type="button" variant="outline">Cancel</Button>} />
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2Icon className="animate-spin" />}
                {isSubmitting ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        ) : existing ? (
          <div className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: colorValue(existing.color) }}
                />
                {existing.summary}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-1.5">
                <Clock className="size-3.5" />
                {formatWhen(existing)}
              </DialogDescription>
            </DialogHeader>

            {existing.location && (
              <p className="flex items-center gap-1.5 text-sm">
                <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
                {existing.location}
              </p>
            )}
            {existing.description && (
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                {existing.description}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant={confirmingDelete ? "destructive" : "outline"}
                onClick={onDelete}
                disabled={isDeleting}
                className="mr-auto"
              >
                {isDeleting ? <Loader2Icon className="animate-spin" /> : <Trash2 />}
                {confirmingDelete ? "Confirm delete" : "Delete"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setEditing(true)}>
                <Pencil />
                Edit
              </Button>
              <DialogClose render={<Button type="button">Close</Button>} />
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
