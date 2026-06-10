import {
  differenceInCalendarDays,
  parseISO,
  startOfDay,
  subMilliseconds,
} from "date-fns";

import type { CalendarEvent } from "@lib/schema/event";

/**
 * One event's slice within a single week row. A multi-week event produces one
 * segment per week it touches; `continuesLeft`/`continuesRight` tell the UI to
 * render a flat (notched) edge where the bar runs off into an adjacent week.
 */
export type EventSegment = {
  event: CalendarEvent;
  startCol: number; // 0–6, column where the bar starts in this week
  endCol: number; // 0–6 inclusive, column where it ends in this week
  lane: number; // 0-based vertical stacking position
  continuesLeft: boolean;
  continuesRight: boolean;
};

/** Split a flat list of grid days into weeks of 7. */
export function chunkWeeks(days: Date[]): Date[][] {
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

/**
 * The last calendar day an event visibly occupies. `end` is exclusive (iCal /
 * Google convention), so the last day is the day containing the final instant
 * (`end − 1ms`). Clamped to never precede the start day.
 */
export function eventLastDay(event: CalendarEvent): Date {
  const start = startOfDay(parseISO(event.start));
  const last = startOfDay(subMilliseconds(parseISO(event.end), 1));
  return last < start ? start : last;
}

function eventFirstDay(event: CalendarEvent): Date {
  return startOfDay(parseISO(event.start));
}

/** Do two inclusive column intervals overlap? */
function overlaps(a: EventSegment, startCol: number, endCol: number): boolean {
  return a.startCol <= endCol && startCol <= a.endCol;
}

/**
 * Place every event that touches `weekDays` into non-overlapping lanes.
 *
 * Longer/earlier events are laid out first (a stable interval-graph greedy
 * coloring) so multi-day bars settle into the top lanes and shorter events fill
 * the gaps — the same visual ordering Google Calendar uses.
 */
export function layoutWeek(
  weekDays: Date[],
  events: CalendarEvent[],
): EventSegment[] {
  const weekStart = startOfDay(weekDays[0]);
  const lastDayOfWeek = startOfDay(weekDays[weekDays.length - 1]);

  const candidates = events
    .map((event) => {
      const first = eventFirstDay(event);
      const last = eventLastDay(event);

      // Day-granular overlap with this week.
      if (first > lastDayOfWeek || last < weekStart) return null;

      const rawStart = differenceInCalendarDays(first, weekStart);
      const rawEnd = differenceInCalendarDays(last, weekStart);

      return {
        event,
        startCol: Math.max(0, rawStart),
        endCol: Math.min(6, rawEnd),
        continuesLeft: rawStart < 0,
        continuesRight: rawEnd > 6,
        // sort keys
        _span: rawEnd - rawStart,
        _start: parseISO(event.start).getTime(),
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null)
    // Longer bars first, then earlier start, then title for a stable order.
    .sort(
      (a, b) =>
        b._span - a._span ||
        a._start - b._start ||
        a.event.summary.localeCompare(b.event.summary),
    );

  const placed: EventSegment[] = [];
  const laneEnds: EventSegment[][] = []; // segments already placed, per lane

  for (const c of candidates) {
    let lane = 0;
    while (
      laneEnds[lane]?.some((seg) => overlaps(seg, c.startCol, c.endCol))
    ) {
      lane++;
    }
    const segment: EventSegment = {
      event: c.event,
      startCol: c.startCol,
      endCol: c.endCol,
      lane,
      continuesLeft: c.continuesLeft,
      continuesRight: c.continuesRight,
    };
    (laneEnds[lane] ??= []).push(segment);
    placed.push(segment);
  }

  return placed;
}

/** Highest lane index used in a set of segments (for sizing a week row). */
export function laneCount(segments: EventSegment[]): number {
  return segments.reduce((max, s) => Math.max(max, s.lane + 1), 0);
}
