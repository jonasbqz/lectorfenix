const isProduction = process.env.NODE_ENV === "production";
const logsEnabled = !isProduction || process.env.NEXT_PUBLIC_ENABLE_RUNTIME_LOGS === "true";

type LogArgs = unknown[];

function write(method: "debug" | "info" | "log" | "warn" | "error", args: LogArgs) {
  if (!logsEnabled) return;
  console[method](...args);
}

export const logger = {
  debug: (...args: LogArgs) => write("debug", args),
  info: (...args: LogArgs) => write("info", args),
  log: (...args: LogArgs) => write("log", args),
  warn: (...args: LogArgs) => write("warn", args),
  error: (...args: LogArgs) => write("error", args),
};
