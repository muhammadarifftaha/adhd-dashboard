import type { NextRequest } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { getObject } from "@/lib/storage";

// User-specific and auth-gated — never cache at the framework layer.
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ key: string[] }> },
) {
  // Single ingress: only authenticated users can read stored files. The browser
  // sends the session cookie with the <img> request, so this gate holds.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { key } = await ctx.params; // catch-all segments, e.g. ["avatars", id, "x.png"]
  const objectKey = key.join("/");

  try {
    const object = await getObject(objectKey);
    if (!object.Body) {
      return new Response("Not found", { status: 404 });
    }
    // transformToWebStream() yields a web ReadableStream the Response can stream
    // directly, so large files never buffer fully in memory.
    return new Response(object.Body.transformToWebStream(), {
      headers: {
        "Content-Type": object.ContentType ?? "application/octet-stream",
        // Private (per-user) but cacheable by the browser for a short while.
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    // A genuinely missing object is an expected 404; anything else (storage
    // unreachable, credentials, etc.) is a real failure worth surfacing as 500
    // so it isn't silently masked as "not found".
    const name = (error as { name?: string })?.name;
    if (name === "NoSuchKey" || name === "NotFound") {
      return new Response("Not found", { status: 404 });
    }
    logger.error({ error, objectKey, module: "files" }, "Failed to read object");
    return new Response("Internal Server Error", { status: 500 });
  }
}
