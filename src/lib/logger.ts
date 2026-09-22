import pino from "pino";
import { env, isProduction } from "../config/env";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isProduction ? "info" : "debug"),
  transport: isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" },
      },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "password",
      "passwordHash",
      "token",
      "*.password",
      "*.passwordHash",
    ],
    censor: "[REDACTED]",
  },
  base: { env: env.NODE_ENV },
});
