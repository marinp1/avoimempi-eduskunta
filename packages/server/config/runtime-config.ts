type RuntimeEnv = {
  NODE_ENV?: string;
  PORT?: string;
  BUN_IDLE_TIMEOUT_SECONDS?: string;
};

export type RuntimeConfig = {
  isDev: boolean;
  port: number;
  idleTimeout: number;
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
    port: configuredPort ?? (isDev ? 3000 : 80),
    idleTimeout: configuredIdleTimeout ?? 120,
  };
};
