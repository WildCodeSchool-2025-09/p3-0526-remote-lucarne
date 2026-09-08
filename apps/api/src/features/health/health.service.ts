import type { HealthResponse } from "@lucarne/shared";

const getHealthStatus = (): HealthResponse => ({ status: "ok" });

export { getHealthStatus };
