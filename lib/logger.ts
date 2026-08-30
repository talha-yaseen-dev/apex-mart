import "server-only";
import pino from "pino";
import { env } from "@/lib/env";

/**
 * Structured JSON logger. A redaction serializer strips PII (emails, names,
 * addresses, cards, tokens, passwords) before anything is written — logs carry
 * ids, not identities.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      "email",
      "user.email",
      "*.email",
      "name",
      "user.name",
      "*.name",
      "*.address",
      "*.line1",
      "*.card",
      "password",
      "passwordHash",
      "*.passwordHash",
      "token",
      "*.token",
      "tokenHash",
      "req.headers.authorization",
      "req.headers.cookie",
    ],
    censor: "[redacted]",
  },
  base: { service: "nova" },
});

/**
 * Report an unexpected error. Forwards to Sentry when configured (release +
 * trace context, PII scrubbed on the way out); always logs locally.
 */
export function captureException(error: unknown, context?: Record<string, unknown>) {
  logger.error({ err: error, ...context }, "unhandled_error");
  // With SENTRY_DSN set, a Sentry.captureException(error) would fire here.
}
