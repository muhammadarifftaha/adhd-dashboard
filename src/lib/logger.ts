import pino, { type Logger } from "pino";

// NOTE: Pino is Node-only — do NOT import this module from Edge-runtime code
// (e.g. proxy.ts / middleware). Use it in server actions, route handlers, and
// server components, which run on the Node runtime.

const globalForLogger = globalThis as unknown as { logger?: Logger };

const isProduction = process.env.NODE_ENV === "production";
const level = process.env.LOG_LEVEL ?? (isProduction ? "info" : "debug");

// Production: structured JSON to stdout (Docker/log shippers parse this).
// Development: pretty, colorized output via the pino-pretty transport.
export const logger: Logger =
  globalForLogger.logger ??
  pino({
    level,
    ...(isProduction
      ? {}
      : {
          transport: {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "SYS:HH:MM:ss",
              ignore: "pid,hostname",
            },
          },
        }),
  });

// Reuse a single instance across hot reloads in development so we don't spawn
// a new pino-pretty worker thread on every change.
if (!isProduction) {
  globalForLogger.logger = logger;
}
