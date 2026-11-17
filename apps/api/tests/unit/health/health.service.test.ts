import { describe, expect, it } from "vitest";
import { getHealthStatus } from "../../../src/features/health/health.service";

describe("getHealthStatus", () => {
  it("returns the API health status", () => {
    expect(getHealthStatus()).toEqual({ status: "ok" });
  });
});
