"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { addDays, format, isToday, parseISO, startOfDay } from "date-fns";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react";

import { Button } from "@components/ui/button";
import { cn } from "@lib/utils";
import { colorValue, type CalendarEvent } from "@lib/schema/event";
import { listEvents } from "@components/calendar/actions";
import EventDialog, {
  type EventDialogState,
} from "@components/calendar/event-dialog";
import {
  DAY_HEIGHT,
  HOUR_HEIGHT,
  dateAtMinute,
  eventToBlock,
  layoutDay,
  minutesToY,
  snapMinute,
  snapY,
  splitDayEvents,
} from "@lib/calendar/day-layout";

// 0–23, used both for the zebra-striped hour rows and the left-gutter labels.
const HOURS = Array.from({ length: 24 }, (_, h) => h);

// 0–143: the 10-minute slots across the day (matching the click snap). Drawn as
// a finer sub-grid — lighter :10/:20/:30/:40/:50 lines plus a second alternating
// tint — layered over the hourly zebra.
const TEN_MIN_SLOTS = Array.from({ length: 144 }, (_, i) => i);

// "9 AM", "12 PM", "11 PM" — the gutter label for an hour-of-day.
function hourLabel(hour: number): string {
  // Any date works; we only format the hour. Build it off a stable midnight so
  // there's no DST surprise in the label itself.
  return format(new Date(2000, 0, 1, hour), "h a");
}

// Compact start–end range for an event block, e.g. "9:00 AM – 10:30 AM". The
// start keeps its own meridiem so cross-boundary ranges (e.g. "11:00 PM – 12:30
// AM") aren't misread.
function blockTimeLabel(event: CalendarEvent): string {
  return `${format(parseISO(event.start), "h:mm a")} – ${format(parseISO(event.end), "h:mm a")}`;
}

// Minute-of-day (0–1439) from a Date, in the browser's local zone.
function minuteOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export default function TodayWidget() {
  // `today` is the real current day (anchors the "Today" button and the
  // now-line); `day` is the day currently on screen, navigable via prev/next.
  const today = useMemo(() => startOfDay(new Date()), []);
  const [day, setDay] = useState(today);
  const dayStart = day.getTime();
  const viewingToday = isToday(day);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [dialog, setDialog] = useState<EventDialogState>({ mode: "closed" });

  // Minute-of-day for the "now" line; re-ticked each minute.
  const [nowMinute, setNowMinute] = useState(() => minuteOfDay(new Date()));

  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const didAutoScroll = useRef(false);

  /* ── load the displayed day's events ─────────────────────────────────── */
  // Same stale-request-counter guard as calendar.tsx: a slow response from a
  // superseded load can't clobber a newer one.
  const requestId = useRef(0);
  useEffect(() => {
    const id = ++requestId.current;
    const rangeStart = new Date(dayStart);
    const rangeEnd = addDays(rangeStart, 1);
    void listEvents(rangeStart.toISOString(), rangeEnd.toISOString()).then(
      (result) => {
        if (id === requestId.current) setEvents(result);
      },
    );
  }, [dayStart]);

  /* ── tick the current-time line every minute ────────────────────────── */
  useEffect(() => {
    const interval = setInterval(
      () => setNowMinute(minuteOfDay(new Date())),
      60_000,
    );
    return () => clearInterval(interval);
  }, []);

  /* ── auto-scroll so the current time is visible on mount ─────────────── */
  useEffect(() => {
    if (didAutoScroll.current) return;
    const container = scrollRef.current;
    if (!container) return;
    didAutoScroll.current = true;
    // Centre the current time in the viewport, clamped to the scrollable range.
    const target =
      minutesToY(minuteOfDay(new Date())) - container.clientHeight / 2;
    const max = container.scrollHeight - container.clientHeight;
    container.scrollTop = Math.max(0, Math.min(target, max));
  }, []);

  /* ── save / delete wiring (mirrors calendar.tsx) ─────────────────────── */
  const handleSaved = useCallback((saved: CalendarEvent) => {
    setEvents((prev) => {
      const idx = prev.findIndex((e) => e.id === saved.id);
      if (idx === -1) return [...prev, saved];
      const next = [...prev];
      next[idx] = saved;
      return next;
    });
    setDialog({ mode: "closed" });
  }, []);

  const handleDeleted = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    setDialog({ mode: "closed" });
  }, []);

  /* ── split + lay out the day's events ────────────────────────────────── */
  const { allDay, timed } = useMemo(
    () => splitDayEvents(events, day),
    [events, day],
  );
  const placements = useMemo(() => layoutDay(timed, day), [timed, day]);

  /* ── click empty grid → create at snapped time ──────────────────────── */
  const handleGridClick = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      const grid = gridRef.current;
      if (!grid) return;
      // getBoundingClientRect is viewport-relative, so subtracting it from the
      // (also viewport-relative) clientY already accounts for scroll.
      const rect = grid.getBoundingClientRect();
      const start = dateAtMinute(day, snapY(e.clientY - rect.top));
      setDialog({ mode: "create", date: day, start });
    },
    [day],
  );

  const handleGridKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      // Keyboard parity for the click target: open create at the current time
      // (when viewing today) or the day's start otherwise.
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const start = viewingToday
          ? dateAtMinute(day, snapMinute(nowMinute))
          : day;
        setDialog({ mode: "create", date: day, start });
      }
    },
    [day, nowMinute, viewingToday],
  );

  // The "Add" button: seed the current time when viewing today, else leave the
  // dialog's day-only default (09:00).
  const handleAdd = useCallback(() => {
    setDialog({
      mode: "create",
      date: day,
      start: viewingToday ? dateAtMinute(day, snapMinute(nowMinute)) : undefined,
    });
  }, [day, nowMinute, viewingToday]);

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center justify-between gap-2 pb-2">
        <h2 className="truncate font-heading text-base font-medium">
          {format(day, "EEEE, do MMMM yyyy")}
        </h2>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setDay(today)}>
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Previous day"
            onClick={() => setDay((d) => addDays(d, -1))}
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Next day"
            onClick={() => setDay((d) => addDays(d, 1))}
          >
            <ChevronRightIcon />
          </Button>
          <Button size="sm" onClick={handleAdd}>
            <PlusIcon />
            Add
          </Button>
        </div>
      </header>

      {/* All-day strip, pinned above the scrolling grid. */}
      {allDay.length > 0 && (
        <div className="shrink-0 border-y bg-muted/30 px-2 py-1.5">
          <div className="flex flex-wrap gap-1">
            {allDay.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => setDialog({ mode: "view", event })}
                title={event.summary}
                style={{ backgroundColor: colorValue(event.color) }}
                className="max-w-full truncate rounded px-2 py-0.5 text-left text-xs font-medium text-white transition-opacity hover:opacity-90"
              >
                {event.summary}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Scroll container fills the remaining widget height; inner content is a
          fixed 24h-tall grid that scrolls within it. */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-auto overflow-y-auto border-y bg-white dark:bg-neutral-800"
      >
        <div className="relative flex" style={{ height: DAY_HEIGHT }}>
          {/* Left gutter — hour labels. */}
          <div className="relative w-12 shrink-0 select-none border-r text-right">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="absolute right-1 -translate-y-1/2 pr-1 text-[10px] leading-none text-muted-foreground tabular-nums"
                style={{ top: minutesToY(hour * 60) }}
              >
                {hour === 0 ? "" : hourLabel(hour)}
              </div>
            ))}
          </div>

          {/* Grid body — a plain positioning context. The click-to-create
              surface and the event buttons are sibling leaves inside it (never
              nested), mirroring month-grid.tsx so the a11y tree stays valid. */}
          <div ref={gridRef} className="relative flex-1">
            {/* Layer 1 — hourly zebra + strong hour gridline. Presentation-only. */}
            {HOURS.map((hour) => (
              <div
                key={hour}
                aria-hidden
                className={cn(
                  "absolute inset-x-0 border-t border-border/60",
                  hour % 2 === 0 ? "bg-foreground/8" : "bg-transparent",
                )}
                style={{ top: minutesToY(hour * 60), height: HOUR_HEIGHT }}
              />
            ))}

            {/* Layer 2 — 10-minute sub-grid: a subtle second tint on alternating
                slots (an hour holds 6 ten-minute slots — even — so i % 2 gives a
                steady stripe) layered on top of the hourly zebra, plus a faint
                divider on every non-hour slot. The 10-min cadence matches where a
                grid click snaps. */}
            {TEN_MIN_SLOTS.map((i) => (
              <div
                key={i}
                aria-hidden
                className={cn(
                  "absolute inset-x-0",
                  i % 2 === 1 && "bg-foreground/3",
                  i % 6 !== 0 && "border-t border-border/25",
                )}
                style={{ top: minutesToY(i * 10), height: minutesToY(10) }}
              />
            ))}

            {/* Click-to-create surface — a leaf interactive layer beneath the
                event buttons. Empty-space clicks land here; clicks on an event
                hit its (higher) button instead. Keeping it a sibling leaf (not an
                ancestor of the buttons) avoids nested-interactive ARIA and stops
                event-button keypresses bubbling into the create handler. */}
            <div
              role="button"
              tabIndex={0}
              aria-label="Create an event at this time"
              onClick={handleGridClick}
              onKeyDown={handleGridKeyDown}
              className="absolute inset-0 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
            />

            {/* Timed event blocks. */}
            {placements.map((p) => {
              const block = eventToBlock(p.event, day);
              const color = colorValue(p.event.color);
              return (
                <button
                  key={p.event.id}
                  type="button"
                  onClick={() => setDialog({ mode: "view", event: p.event })}
                  title={`${p.event.summary} · ${blockTimeLabel(p.event)}`}
                  style={{
                    top: block.topPx,
                    height: block.heightPx,
                    left: `calc(${p.leftPct}% + 2px)`,
                    // Small gutter so adjacent columns show a seam.
                    width: `calc(${p.widthPct}% - 4px)`,
                    backgroundColor: color,
                  }}
                  className="absolute flex flex-col overflow-hidden rounded-md px-1.5 py-0.5 text-left text-white shadow-sm ring-1 ring-black/5 transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-foreground"
                >
                  <span className="truncate text-xs font-medium leading-tight">
                    {p.event.summary}
                  </span>
                  {block.heightPx >= 28 && (
                    <span className="truncate text-[10px] leading-tight opacity-90 tabular-nums">
                      {blockTimeLabel(p.event)}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Current-time indicator — only when the displayed day is today. */}
            {viewingToday && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                style={{ top: minutesToY(nowMinute) }}
              >
                <span className="-ml-1 size-2 shrink-0 rounded-full bg-red-500" />
                <span className="h-px flex-1 bg-red-500" />
              </div>
            )}
          </div>
        </div>
      </div>

      <EventDialog
        state={dialog}
        onClose={() => setDialog({ mode: "closed" })}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
