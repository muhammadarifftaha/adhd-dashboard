"use client";

import "react-grid-layout/css/styles.css";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_BREAKPOINTS,
  DEFAULT_COLS,
  ResponsiveGridLayout,
  useContainerWidth,
  type Layout,
  type ResponsiveLayouts,
} from "react-grid-layout";
import { Lock, LockOpen, RotateCcw } from "lucide-react";

import { cn } from "@lib/utils";
import { Button } from "@components/ui/button";
import WidgetCard from "@components/dashboard/widget-card";
import { WIDGETS } from "@components/dashboard/widgets";
import { saveDashboardLayout } from "@components/dashboard/actions";
import {
  DEFAULT_LAYOUTS,
  WIDGET_IDS,
  type DashboardLayouts,
} from "@lib/schema/dashboard";

const ROW_HEIGHT = 80;
const MARGIN: readonly [number, number] = [16, 16];
const SAVE_DEBOUNCE_MS = 800;

export default function DashboardGrid({
  initialLayouts,
}: {
  initialLayouts: DashboardLayouts;
}) {
  // Replaces v1's WidthProvider HOC: observes the container with a ResizeObserver
  // and gates the grid until the first measurement so SSR has no width to mismatch.
  const { width, containerRef, mounted } = useContainerWidth();
  const [layouts, setLayouts] = useState<ResponsiveLayouts>(initialLayouts);

  // Layout lock: a per-device UI guard against accidental drags/resizes. Stored
  // in localStorage (not the DB) — it's a local preference, not shared state.
  // Read after mount so the server render (no window) stays consistent.
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    setLocked(localStorage.getItem("dashboard-locked") === "true");
  }, []);
  const toggleLock = useCallback(() => {
    setLocked((prev) => {
      const next = !prev;
      localStorage.setItem("dashboard-locked", String(next));
      return next;
    });
  }, []);

  // RGL fires onLayoutChange on mount (and on window resizes) with layouts it
  // derived, not user edits. Only persist once the user has actually dragged or
  // resized, and debounce so a drag gesture is one write, not dozens.
  const interacted = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback((next: ResponsiveLayouts) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveDashboardLayout(next);
    }, SAVE_DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const handleLayoutChange = useCallback(
    (_current: Layout, allLayouts: ResponsiveLayouts) => {
      setLayouts(allLayouts);
      if (interacted.current) persist(allLayouts);
    },
    [persist],
  );

  const markInteracted = useCallback(() => {
    interacted.current = true;
  }, []);

  const resetLayout = useCallback(() => {
    interacted.current = true;
    setLayouts(DEFAULT_LAYOUTS);
    persist(DEFAULT_LAYOUTS);
  }, [persist]);

  return (
    <div
      ref={containerRef}
      className={cn("w-full", locked && "dashboard-locked")}
    >
      {mounted ? (
        <>
          <div className="mb-2 flex justify-end gap-1">
            <Button
              variant={locked ? "secondary" : "ghost"}
              size="sm"
              onClick={toggleLock}
              aria-pressed={locked}
            >
              {locked ? <Lock /> : <LockOpen />}
              {locked ? "Locked" : "Lock"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetLayout}
              disabled={locked}
            >
              <RotateCcw />
              Reset layout
            </Button>
          </div>
          <ResponsiveGridLayout<string>
            width={width}
            layouts={layouts}
            breakpoints={DEFAULT_BREAKPOINTS}
            cols={DEFAULT_COLS}
            rowHeight={ROW_HEIGHT}
            margin={MARGIN}
            containerPadding={[0, 0]}
            dragConfig={{ enabled: !locked, handle: ".drag-handle" }}
            resizeConfig={{ enabled: !locked, handles: ["se"] }}
            onLayoutChange={handleLayoutChange}
            onDragStop={markInteracted}
            onResizeStop={markInteracted}
          >
            {WIDGET_IDS.map((id) => (
              <div key={id}>
                <WidgetCard title={WIDGETS[id].title} icon={WIDGETS[id].icon}>
                  {WIDGETS[id].content}
                </WidgetCard>
              </div>
            ))}
          </ResponsiveGridLayout>
        </>
      ) : (
        // Reserve space while measuring to avoid a layout shift on first paint.
        <div className="min-h-[60vh]" />
      )}
    </div>
  );
}
