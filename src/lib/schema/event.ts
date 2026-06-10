import * as z from "zod";

// iCalendar STATUS values (a subset). Google/Graph expose the same states.
export const EVENT_STATUSES = ["CONFIRMED", "TENTATIVE", "CANCELLED"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

// A small label palette. We persist the stable `id` (which maps cleanly onto
// Google's colorId in a future sync); the UI resolves it to `value` for display.
export const EVENT_COLORS = [
  { id: "blue", value: "#3b82f6" },
  { id: "green", value: "#22c55e" },
  { id: "red", value: "#ef4444" },
  { id: "amber", value: "#f59e0b" },
  { id: "violet", value: "#8b5cf6" },
] as const;
export type EventColorId = (typeof EVENT_COLORS)[number]["id"];
export const EVENT_COLOR_IDS = EVENT_COLORS.map((c) => c.id) as [
  EventColorId,
  ...EventColorId[],
];

export function colorValue(id: string | null | undefined): string {
  return EVENT_COLORS.find((c) => c.id === id)?.value ?? EVENT_COLORS[0].value;
}

// Accepts any string Date.parse can read (we send `Date#toISOString()` from the
// client). Kept as a validated string; the action constructs the Date.
const isoInstant = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), "Invalid date/time");

/**
 * What the event dialog submits to the create/update actions. The client
 * resolves the date+time form fields into absolute instants (interpreted in the
 * browser's local zone) so wall-clock → UTC conversion happens where the zone is
 * actually known; `end` is exclusive, matching how we store it.
 */
export const eventInputSchema = z
  .object({
    summary: z.string().trim().min(1, "Title is required").max(200),
    description: z.string().trim().max(5000).optional(),
    location: z.string().trim().max(500).optional(),
    allDay: z.boolean(),
    start: isoInstant,
    end: isoInstant,
    timeZone: z.string().min(1).max(100),
    status: z.enum(EVENT_STATUSES).default("CONFIRMED"),
    color: z.enum(EVENT_COLOR_IDS).default("blue"),
  })
  .refine((v) => Date.parse(v.end) > Date.parse(v.start), {
    message: "End must be after start",
    path: ["end"],
  });

export type EventInput = z.infer<typeof eventInputSchema>;

/**
 * The serializable shape returned to the client (Prisma Dates rendered as ISO
 * strings). The calendar UI parses `start`/`end` back into Dates for layout.
 */
export type CalendarEvent = {
  id: string;
  uid: string;
  summary: string;
  description: string | null;
  location: string | null;
  start: string;
  end: string;
  allDay: boolean;
  timeZone: string;
  status: EventStatus;
  color: string | null;
};
