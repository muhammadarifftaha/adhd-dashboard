import {
  differenceInCalendarDays,
  parseISO,
  startOfDay,
} from "date-fns";

import type { CalendarEvent } from "@lib/schema/event";

/* ── pixel scale ──────────────────────────────────────────────────────── */

/**
 * Vertical budget for one hour of the day grid, in px. This is the single knob
 * the Today view uses to size its 24h-tall scroll content (`HOUR_HEIGHT * 24`).
 * Bump it for a roomier grid; everything below derives from it, so minute
 * precision stays intact at any scale.
 */
export const HOUR_HEIGHT = 60;

/** Minutes in a full day. `end` of a midnight-to-midnight span maps here. */
export const MINUTES_PER_DAY = 24 * 60; // 1440

/** Px per minute — the conversion factor between minute-of-day and px offset. */
export const PX_PER_MINUTE = HOUR_HEIGHT / 60;

/** Total height of the 24h grid content, in px. */
export const DAY_HEIGHT = HOUR_HEIGHT * 24;

/** Click targets snap to this granularity when creating an event from the grid. */
export const SNAP_MINUTES = 10;

/**
 * Floor on a rendered event's height, in px. Sub-`SNAP_MINUTES` events would
 * otherwise collapse to a sliver that's impossible to click; we pad them out
 * (their *time* is unchanged — only the drawn box grows).
 */
export const MIN_EVENT_HEIGHT = 14;

/* ── px ⇄ minute conversions ──────────────────────────────────────────── */

/** Vertical px offset of a minute-of-day within the grid. */
export function minutesToY(minuteOfDay: number): number {
  return minuteOfDay * PX_PER_MINUTE;
}

/** Minute-of-day at a given vertical px offset within the grid. */
export function yToMinutes(y: number): number {
  return y / PX_PER_MINUTE;
}

/**
 * Round a minute-of-day to the nearest `SNAP_MINUTES`, clamped to a valid
 * start time of `[0, 1439]` (the last minute a same-day event can begin). Used
 * to turn a raw grid click into a tidy preset start time for the add dialog.
 */
export function snapMinute(minuteOfDay: number): number {
  const snapped = Math.round(minuteOfDay / SNAP_MINUTES) * SNAP_MINUTES;
  return Math.min(MINUTES_PER_DAY - 1, Math.max(0, snapped));
}

/** Convenience: snap a click's vertical px offset straight to a start minute. */
export function snapY(y: number): number {
  return snapMinute(yToMinutes(y));
}

/**
 * A Date at wall-clock `minuteOfDay` on `referenceDay`. Setting hours/minutes
 * directly (rather than adding elapsed minutes to midnight) is wall-clock-correct
 * across a DST change, so a snapped grid click maps to the time the user actually
 * pointed at — and matches how `eventToBlock` projects events back onto the grid.
 */
export function dateAtMinute(referenceDay: Date, minuteOfDay: number): Date {
  const d = new Date(referenceDay);
  d.setHours(Math.floor(minuteOfDay / 60), minuteOfDay % 60, 0, 0);
  return d;
}

/* ── splitting events for a day ───────────────────────────────────────── */

/**
 * Does an event intersect the calendar day starting at `dayStart`? `end` is
 * exclusive (iCal/Google convention), so an event ending exactly at midnight
 * does NOT bleed into the next day.
 */
function occursOnDay(event: CalendarEvent, dayStart: Date, dayEnd: Date): boolean {
  const start = parseISO(event.start);
  const end = parseISO(event.end);
  return start < dayEnd && end > dayStart;
}

/**
 * Partition the events that touch `referenceDay` into all-day vs timed. All-day
 * events are surfaced separately (rendered in a header strip, never on the time
 * grid); only `timed` feeds `layoutDay`.
 */
export function splitDayEvents(
  events: CalendarEvent[],
  referenceDay: Date,
): { allDay: CalendarEvent[]; timed: CalendarEvent[] } {
  const dayStart = startOfDay(referenceDay);
  const dayEnd = startOfDay(addOneDay(dayStart));

  const allDay: CalendarEvent[] = [];
  const timed: CalendarEvent[] = [];

  for (const event of events) {
    if (!occursOnDay(event, dayStart, dayEnd)) continue;
    (event.allDay ? allDay : timed).push(event);
  }

  return { allDay, timed };
}

/** `startOfDay` + 24h, robust across the DST-affected day boundary. */
function addOneDay(dayStart: Date): Date {
  return new Date(dayStart.getTime() + MINUTES_PER_DAY * 60 * 1000);
}

/* ── single-event geometry ────────────────────────────────────────────── */

/** A timed event's box on the grid, plus its clamped minute bounds. */
export type EventBlock = {
  topPx: number;
  heightPx: number;
  startMin: number; // minute-of-day, clamped to [0, 1440]
  endMin: number; // minute-of-day, clamped to [0, 1440]
};

/**
 * Wall-clock minute-of-day in [0, 1440] of `date`, projected onto `referenceDay`.
 * Events on an earlier/later calendar day clamp to the top (0) / bottom (1440).
 *
 * Deliberately wall-clock (`getHours()*60 + getMinutes()`), NOT real-elapsed
 * minutes from midnight: the grid's hour rows, gridlines, now-line, and click
 * math are all wall-clock, so using elapsed minutes here would drift event blocks
 * up to an hour off their own gridlines on DST-transition days. The calendar-day
 * comparison mirrors the DST-safe approach in the sibling `layout.ts`.
 */
function dayMinuteOfDay(date: Date, referenceDay: Date): number {
  const delta = differenceInCalendarDays(date, referenceDay);
  if (delta < 0) return 0;
  if (delta > 0) return MINUTES_PER_DAY;
  return date.getHours() * 60 + date.getMinutes();
}

/**
 * Project a timed event onto `referenceDay`'s grid. Minute bounds are clamped to
 * the visible day so an event spanning midnight starts at the top (0) and/or
 * runs to the bottom (1440). `heightPx` is floored at `MIN_EVENT_HEIGHT` so very
 * short events stay clickable, and `topPx` is nudged up if needed so the floored
 * box never spills past the bottom edge of the grid.
 */
export function eventToBlock(
  event: CalendarEvent,
  referenceDay: Date,
): EventBlock {
  const startMin = dayMinuteOfDay(parseISO(event.start), referenceDay);
  const endMin = dayMinuteOfDay(parseISO(event.end), referenceDay);

  const rawHeightPx = minutesToY(Math.max(0, endMin - startMin));
  const heightPx = Math.max(MIN_EVENT_HEIGHT, rawHeightPx);
  // Keep the floored box on the grid: a sub-MIN_EVENT_HEIGHT event near midnight
  // would otherwise draw a few px past DAY_HEIGHT.
  const topPx = Math.min(minutesToY(startMin), DAY_HEIGHT - heightPx);

  return { topPx, heightPx, startMin, endMin };
}

/* ── overlap lane packing ─────────────────────────────────────────────── */

/**
 * One timed event placed into a side-by-side column. `columnCount` is the width
 * of the *cluster* this event belongs to, so the UI can render each block at
 * `left = columnIndex / columnCount` and `width = 1 / columnCount` and have
 * concurrent events tile the day's width exactly.
 */
export type EventPlacement = {
  event: CalendarEvent;
  startMin: number;
  endMin: number;
  columnIndex: number; // 0-based column within the cluster
  columnCount: number; // total columns in the cluster (cluster width)
  /** `columnIndex / columnCount` as a percentage, for convenience. */
  leftPct: number;
  /** `1 / columnCount` as a percentage, for convenience. */
  widthPct: number;
};

type Candidate = {
  event: CalendarEvent;
  startMin: number;
  endMin: number;
  column: number;
};

/** Do two half-open minute intervals overlap? Touching edges don't count. */
function intervalsOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Pack a day's TIMED events into side-by-side columns so concurrent events sit
 * next to each other instead of stacking on top of one another.
 *
 * The approach mirrors the month grid's lane packing (`layoutWeek`): a stable
 * interval-graph greedy coloring. Events are swept in start order; each is
 * dropped into the lowest free column. To keep blocks from spreading thinner
 * than they need to, columns are scoped to *clusters* of transitively
 * overlapping events — a non-overlapping event after a wide pile-up resets to a
 * full-width single column. Each cluster's width is the max column count it
 * reached, and every member is widened to that count.
 */
export function layoutDay(
  events: CalendarEvent[],
  referenceDay: Date,
): EventPlacement[] {
  // Resolve each event to clamped day-minute bounds, dropping zero-length spans
  // (nothing to draw), then sweep in start order. Ties break on the longer
  // event first, then title, for a stable, deterministic layout.
  const sorted = events
    .map((event) => {
      const { startMin, endMin } = eventToBlock(event, referenceDay);
      return { event, startMin, endMin };
    })
    .filter((c) => c.endMin > c.startMin)
    .sort(
      (a, b) =>
        a.startMin - b.startMin ||
        b.endMin - a.endMin ||
        a.event.summary.localeCompare(b.event.summary),
    );

  const placements: EventPlacement[] = [];

  // Build up a cluster: a set of transitively-overlapping events that share a
  // column grid. We flush it (assigning every member the cluster's width) when
  // the next event starts after everything seen so far has ended.
  let cluster: Candidate[] = [];
  let clusterEnd = -1; // latest end minute across the open cluster
  let columns = 0; // columns currently in use within the open cluster

  const flush = () => {
    if (cluster.length === 0) return;
    for (const c of cluster) {
      placements.push({
        event: c.event,
        startMin: c.startMin,
        endMin: c.endMin,
        columnIndex: c.column,
        columnCount: columns,
        leftPct: (c.column / columns) * 100,
        widthPct: (1 / columns) * 100,
      });
    }
    cluster = [];
    clusterEnd = -1;
    columns = 0;
  };

  for (const next of sorted) {
    // A gap with no open event closes the current cluster.
    if (cluster.length > 0 && next.startMin >= clusterEnd) flush();

    // Greedily take the lowest column index not occupied by a still-open member
    // of this cluster (i.e. one whose interval overlaps `next`).
    const taken = new Set<number>();
    for (const c of cluster) {
      if (intervalsOverlap(c.startMin, c.endMin, next.startMin, next.endMin)) {
        taken.add(c.column);
      }
    }
    let column = 0;
    while (taken.has(column)) column++;

    cluster.push({
      event: next.event,
      startMin: next.startMin,
      endMin: next.endMin,
      column,
    });
    columns = Math.max(columns, column + 1);
    clusterEnd = Math.max(clusterEnd, next.endMin);
  }

  flush();

  return placements;
}
