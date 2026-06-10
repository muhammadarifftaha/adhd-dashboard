"use client";

import { format, isSameMonth, isToday, parseISO } from "date-fns";

import { cn } from "@lib/utils";
import { colorValue, type CalendarEvent } from "@lib/schema/event";
import {
  chunkWeeks,
  laneCount,
  layoutWeek,
  type EventSegment,
} from "@lib/calendar/layout";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Vertical budget within a week row.
const DAYNUM_H = 26; // day-number strip at the top of each cell
const LANE_H = 22; // height of one stacked event bar
const BASE_MIN = 92; // minimum week-row height when nearly empty

type Props = {
  monthDays: Date[]; // 42 days covering the visible grid
  month: Date;
  events: CalendarEvent[];
  onSelectDay: (day: Date) => void;
  onSelectEvent: (event: CalendarEvent) => void;
};

export default function MonthGrid({
  monthDays,
  month,
  events,
  onSelectDay,
  onSelectEvent,
}: Props) {
  const weeks = chunkWeeks(monthDays);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="grid grid-cols-7 border-b text-center text-xs font-medium text-muted-foreground">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-1.5">
            {day}
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        {weeks.map((week, weekIdx) => {
          const segments = layoutWeek(week, events);
          const lanes = laneCount(segments);
          const height = Math.max(BASE_MIN, DAYNUM_H + lanes * LANE_H + 8);

          return (
            <div key={weekIdx} className="relative" style={{ height }}>
              {/* Layer 1 — day-cell backgrounds + click-to-create targets. */}
              <div className="grid h-full grid-cols-7">
                {week.map((day) => {
                  const inMonth = isSameMonth(day, month);
                  const today = isToday(day);
                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => onSelectDay(day)}
                      className={cn(
                        "flex flex-col items-end border-r border-b p-1 text-left transition-colors last:border-r-0 hover:bg-accent/50",
                        !inMonth && "bg-muted/30 text-muted-foreground/50",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-6 items-center justify-center rounded-full text-xs",
                          today && "bg-primary font-semibold text-primary-foreground",
                        )}
                      >
                        {format(day, "d")}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Layer 2 — event bars. The container ignores pointer events so
                  empty space falls through to the day cells; bars opt back in. */}
              <div
                className="pointer-events-none absolute inset-x-0 grid grid-cols-7"
                style={{ top: DAYNUM_H, gridAutoRows: `${LANE_H}px` }}
              >
                {segments.map((seg) => (
                  <EventBar
                    key={`${seg.event.id}-${weekIdx}`}
                    seg={seg}
                    onClick={() => onSelectEvent(seg.event)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventBar({ seg, onClick }: { seg: EventSegment; onClick: () => void }) {
  const { event } = seg;
  const color = colorValue(event.color);
  const isBar =
    event.allDay ||
    seg.startCol !== seg.endCol ||
    seg.continuesLeft ||
    seg.continuesRight;

  return (
    <button
      type="button"
      onClick={onClick}
      title={event.summary}
      style={{
        gridColumn: `${seg.startCol + 1} / ${seg.endCol + 2}`,
        gridRow: seg.lane + 1,
        ...(isBar ? { backgroundColor: color } : {}),
      }}
      className={cn(
        "pointer-events-auto mx-0.5 flex min-w-0 items-center gap-1 truncate rounded px-1.5 text-left text-xs leading-none transition-opacity hover:opacity-90",
        isBar ? "font-medium text-white" : "hover:bg-accent",
        seg.continuesLeft && "rounded-l-none",
        seg.continuesRight && "rounded-r-none",
      )}
    >
      {!isBar && (
        <span
          className="size-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      {!isBar && !event.allDay && (
        <span className="shrink-0 tabular-nums text-muted-foreground">
          {format(parseISO(event.start), "h:mma").toLowerCase()}
        </span>
      )}
      <span className="truncate">{event.summary}</span>
    </button>
  );
}
