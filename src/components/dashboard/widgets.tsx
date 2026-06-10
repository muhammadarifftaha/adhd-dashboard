import type { ReactNode } from "react";
import { CalendarDays, Inbox, ListTodo, Sun } from "lucide-react";

import Calendar from "@components/dashboard/calendar";
import type { WidgetId } from "@lib/schema/dashboard";
import TodayWidget from "./today";

function Placeholder({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
      {label} — coming soon
    </div>
  );
}

type WidgetDefinition = {
  title: string;
  icon: ReactNode;
  content: ReactNode;
};

// Visual registry for each widget id. Kept separate from the layout schema so
// the (server) page can read layout data without pulling in client components.
export const WIDGETS: Record<WidgetId, WidgetDefinition> = {
  calendar: {
    title: "Calendar",
    icon: <CalendarDays className="size-4 text-muted-foreground" />,
    content: <Calendar />,
  },
  today: {
    title: "Today",
    icon: <Sun className="size-4 text-muted-foreground" />,
    content: <TodayWidget />,
  },
  quickCapture: {
    title: "Quick Capture",
    icon: <Inbox className="size-4 text-muted-foreground" />,
    content: <Placeholder label="A frictionless braindump inbox" />,
  },
  tasks: {
    title: "Tasks",
    icon: <ListTodo className="size-4 text-muted-foreground" />,
    content: <Placeholder label="Capture and complete tasks" />,
  },
};
