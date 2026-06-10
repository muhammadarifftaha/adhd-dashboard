"use server";

import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { Event } from "@/generated/prisma/client";
import {
  eventInputSchema,
  type CalendarEvent,
  type EventStatus,
} from "@/lib/schema/event";

type EventResult = { event: CalendarEvent } | { error: string };

function toDTO(event: Event): CalendarEvent {
  return {
    id: event.id,
    uid: event.uid,
    summary: event.summary,
    description: event.description,
    location: event.location,
    start: event.start.toISOString(),
    end: event.end.toISOString(),
    allDay: event.allDay,
    timeZone: event.timeZone,
    status: event.status as EventStatus,
    color: event.color,
  };
}

/**
 * Events for the signed-in user overlapping the half-open window
 * [rangeStart, rangeEnd). The calendar calls this for the visible month grid.
 */
export async function listEvents(
  rangeStart: string,
  rangeEnd: string,
): Promise<CalendarEvent[]> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return [];

  const start = new Date(rangeStart);
  const end = new Date(rangeEnd);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];

  // Overlap test: the event starts before the window ends and ends after it
  // begins (`end` is exclusive, so `gt`).
  const events = await prisma.event.findMany({
    where: {
      userId: session.user.id,
      start: { lt: end },
      end: { gt: start },
    },
    orderBy: { start: "asc" },
  });

  return events.map(toDTO);
}

export async function createEvent(input: unknown): Promise<EventResult> {
  const log = logger.child({ function: "createEvent", module: "calendar" });

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "You must be signed in to add an event." };

  const parsed = eventInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid event." };
  }
  const data = parsed.data;

  try {
    const event = await prisma.event.create({
      data: {
        // urn-style iCal UID — stable join key for future external sync.
        uid: `${crypto.randomUUID()}@adhd-dashboard.local`,
        userId: session.user.id,
        summary: data.summary,
        description: data.description || null,
        location: data.location || null,
        start: new Date(data.start),
        end: new Date(data.end),
        allDay: data.allDay,
        timeZone: data.timeZone,
        status: data.status,
        color: data.color,
      },
    });
    return { event: toDTO(event) };
  } catch (error) {
    log.error({ error, userId: session.user.id }, "Failed to create event");
    return { error: "Could not create the event. Please try again." };
  }
}

export async function updateEvent(
  id: string,
  input: unknown,
): Promise<EventResult> {
  const log = logger.child({ function: "updateEvent", module: "calendar" });

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "You must be signed in to edit an event." };

  const parsed = eventInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid event." };
  }
  const data = parsed.data;

  // Scope the write to the owner so one user can never edit another's event.
  const existing = await prisma.event.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!existing) return { error: "Event not found." };

  try {
    const event = await prisma.event.update({
      where: { id },
      data: {
        summary: data.summary,
        description: data.description || null,
        location: data.location || null,
        start: new Date(data.start),
        end: new Date(data.end),
        allDay: data.allDay,
        timeZone: data.timeZone,
        status: data.status,
        color: data.color,
        // iCal SEQUENCE: bump on every edit for future sync conflict handling.
        sequence: { increment: 1 },
      },
    });
    return { event: toDTO(event) };
  } catch (error) {
    log.error({ error, userId: session.user.id, id }, "Failed to update event");
    return { error: "Could not save the event. Please try again." };
  }
}

export async function deleteEvent(
  id: string,
): Promise<{ error: string } | undefined> {
  const log = logger.child({ function: "deleteEvent", module: "calendar" });

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "You must be signed in to delete an event." };

  try {
    // deleteMany scoped by userId is a no-op (not an error) if the id isn't the
    // caller's — which is exactly the ownership guarantee we want.
    const { count } = await prisma.event.deleteMany({
      where: { id, userId: session.user.id },
    });
    if (count === 0) return { error: "Event not found." };
  } catch (error) {
    log.error({ error, userId: session.user.id, id }, "Failed to delete event");
    return { error: "Could not delete the event. Please try again." };
  }

  return undefined;
}
