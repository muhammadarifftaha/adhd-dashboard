"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { Button } from "@components/ui/button";
import MonthGrid from "@components/calendar/month-grid";
import EventDialog, {
  type EventDialogState,
} from "@components/calendar/event-dialog";
import { listEvents } from "@components/calendar/actions";
import type { CalendarEvent } from "@lib/schema/event";

// Monday-first, to match the work-week framing of the dashboard.
const WEEK_OPTS = { weekStartsOn: 1 } as const;

export default function Calendar() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [dialog, setDialog] = useState<EventDialogState>({ mode: "closed" });

  // The 6-week grid covering the visible month (leading/trailing days spill in).
  const monthDays = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(month), WEEK_OPTS),
        end: endOfWeek(endOfMonth(month), WEEK_OPTS),
      }),
    [month],
  );

  // Reload events for the visible range on navigation. The request counter drops
  // stale responses if the user pages months faster than the server replies.
  const requestId = useRef(0);
  useEffect(() => {
    const id = ++requestId.current;
    const rangeStart = monthDays[0];
    const rangeEnd = addDays(monthDays[monthDays.length - 1], 1);
    void listEvents(rangeStart.toISOString(), rangeEnd.toISOString()).then(
      (result) => {
        if (id === requestId.current) setEvents(result);
      },
    );
  }, [monthDays]);

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

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center justify-between gap-2 pb-2">
        <h2 className="truncate font-heading text-base font-medium">
          {format(month, "MMMM yyyy")}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMonth(startOfMonth(new Date()))}
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Previous month"
            onClick={() => setMonth((m) => subMonths(m, 1))}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Next month"
            onClick={() => setMonth((m) => addMonths(m, 1))}
          >
            <ChevronRight />
          </Button>
          <Button
            size="sm"
            onClick={() => setDialog({ mode: "create", date: new Date() })}
          >
            <Plus />
            Add
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1">
        <MonthGrid
          monthDays={monthDays}
          month={month}
          events={events}
          onSelectDay={(date) => setDialog({ mode: "create", date })}
          onSelectEvent={(event) => setDialog({ mode: "view", event })}
        />
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
