import type { ReactNode } from "react";
import { GripVertical } from "lucide-react";

import { cn } from "@lib/utils";

/**
 * The shell every dashboard widget renders into. Fills its react-grid-layout
 * cell (`h-full`) and exposes a `.drag-handle` header — the only region that
 * initiates a drag — so interactive widget bodies stay clickable.
 */
export default function WidgetCard({
  title,
  icon,
  children,
  className,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-xl bg-card text-card-foreground ring-1 ring-foreground/10",
        className,
      )}
    >
      <header className="drag-handle flex shrink-0 cursor-grab items-center gap-2 border-b px-3 py-2 active:cursor-grabbing">
        <GripVertical className="size-4 shrink-0 text-muted-foreground/50" />
        {icon}
        <h2 className="font-heading text-sm font-medium">{title}</h2>
      </header>
      <div className="min-h-0 flex-1 overflow-auto p-3">{children}</div>
    </div>
  );
}
