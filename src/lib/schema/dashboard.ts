import * as z from "zod";

// The widgets the dashboard can render. The grid keys cards by these ids, and
// the persistence layer rejects anything outside this set so stored layout data
// can't smuggle in unknown items.
export const WIDGET_IDS = ["calendar", "today", "quickCapture", "tasks"] as const;
export type WidgetId = (typeof WIDGET_IDS)[number];
const WIDGET_ID_SET = new Set<string>(WIDGET_IDS);

// Minimum size (in grid units) each widget may be resized to. Re-applied on load
// so a hand-edited DB row can never relax a widget below a usable size.
export const WIDGET_CONSTRAINTS: Record<WidgetId, { minW: number; minH: number }> = {
  calendar: { minW: 4, minH: 5 },
  today: { minW: 3, minH: 2 },
  quickCapture: { minW: 3, minH: 2 },
  tasks: { minW: 3, minH: 2 },
};

// A single placed widget — the subset of react-grid-layout's LayoutItem we
// persist. Bounds are generous but finite so a crafted payload can't store
// absurd values (RGL clamps to the live column count per breakpoint at render).
const layoutItemSchema = z.object({
  i: z.string().max(64),
  x: z.number().int().min(0).max(50),
  y: z.number().int().min(0).max(1000),
  w: z.number().int().min(1).max(12),
  h: z.number().int().min(1).max(100),
  minW: z.number().int().min(1).max(12).optional(),
  minH: z.number().int().min(1).max(100).optional(),
  maxW: z.number().int().min(1).max(12).optional(),
  maxH: z.number().int().min(1).max(100).optional(),
});
export type DashboardLayoutItem = z.infer<typeof layoutItemSchema>;

// What we store on UserSettings.dashboardLayout: one Layout per breakpoint the
// user has touched, e.g. { lg: [...], md: [...] }.
export const dashboardLayoutsSchema = z.record(z.string(), z.array(layoutItemSchema));
export type DashboardLayouts = z.infer<typeof dashboardLayoutsSchema>;

// Default desktop arrangement. Only `lg` is defined — react-grid-layout derives
// the smaller breakpoints from it, so this is also the seed for a brand-new user.
export const DEFAULT_LAYOUTS: DashboardLayouts = {
  lg: [
    { i: "calendar", x: 0, y: 0, w: 6, h: 6, minW: 4, minH: 5 },
    { i: "today", x: 6, y: 0, w: 6, h: 3, minW: 3, minH: 2 },
    { i: "quickCapture", x: 6, y: 3, w: 6, h: 3, minW: 3, minH: 2 },
    { i: "tasks", x: 0, y: 6, w: 6, h: 3, minW: 3, minH: 2 },
  ],
};

// Drop unknown widgets and re-pin each item's size constraints from the registry.
// Shared by the save path (sanitize client input) and the load path.
function sanitize(layouts: DashboardLayouts): DashboardLayouts {
  const out: DashboardLayouts = {};
  for (const [breakpoint, items] of Object.entries(layouts)) {
    out[breakpoint] = items
      .filter((item) => WIDGET_ID_SET.has(item.i))
      .map((item) => ({ ...item, ...WIDGET_CONSTRAINTS[item.i as WidgetId] }));
  }
  return out;
}

/**
 * Validate and clean a layouts payload coming from the client before it is
 * persisted. Returns `null` if the shape is invalid (caller should reject).
 */
export function parseDashboardLayouts(raw: unknown): DashboardLayouts | null {
  const parsed = dashboardLayoutsSchema.safeParse(raw);
  return parsed.success ? sanitize(parsed.data) : null;
}

/**
 * Turn whatever is stored in the DB (untyped JSON, possibly null or stale) into
 * a usable layouts object for the grid: falls back to defaults on invalid data,
 * and guarantees every current widget is placed on the `lg` breakpoint so newly
 * added widgets still appear for users who saved an older arrangement.
 */
export function normalizeDashboardLayouts(raw: unknown): DashboardLayouts {
  const parsed = dashboardLayoutsSchema.safeParse(raw);
  if (!parsed.success) return DEFAULT_LAYOUTS;

  const layouts = sanitize(parsed.data);
  const lg = layouts.lg ?? [];
  const present = new Set(lg.map((item) => item.i));
  const missing = DEFAULT_LAYOUTS.lg!.filter((item) => !present.has(item.i));
  layouts.lg = [...lg, ...missing];

  return layouts;
}
