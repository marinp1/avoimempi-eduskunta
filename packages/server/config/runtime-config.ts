type RuntimeEnv = {
  NODE_ENV?: string;
  PORT?: string;
  BUN_IDLE_TIMEOUT_SECONDS?: string;
  BUN_REUSE_PORT?: string;
};

export type RuntimeConfig = {
  isDev: boolean;
  port: number;
  idleTimeout: number;
  reusePort: boolean;
};

const parsePositiveInteger = (
  value: string | undefined,
): number | undefined => {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
};

export const loadRuntimeConfig = (
  env: RuntimeEnv = process.env,
): RuntimeConfig => {
  const isDev = env.NODE_ENV === "development";
  const configuredPort = parsePositiveInteger(env.PORT);
  const configuredIdleTimeout = parsePositiveInteger(
    env.BUN_IDLE_TIMEOUT_SECONDS,
  );

  return {
    isDev,
    port: configuredPort ?? 3000,
    idleTimeout: configuredIdleTimeout ?? 120,
    reusePort:
      typeof env.BUN_REUSE_PORT === "string" &&
      ["1", "true", "yes", "on"].includes(env.BUN_REUSE_PORT.toLowerCase()),
  };
};
