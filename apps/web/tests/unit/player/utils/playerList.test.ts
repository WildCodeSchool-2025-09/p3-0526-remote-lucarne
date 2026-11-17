import { describe, expect, it } from "vitest";
import { parseParams, updateParams } from "../../../../src/features/player/utils/playerList";

describe("player list URL parameters", () => {
  it("applies safe defaults and rejects invalid values", () => {
    const params = parseParams(new URLSearchParams("page=-2&status=UNKNOWN&sortBy=invalid&sortOrder=desc"));

    expect(params).toMatchObject({ page: 1, pageSize: 20, status: "ALL", sortBy: "lastName", sortOrder: "desc" });
  });

  it("normalizes filters and removes default values", () => {
    const current = new URLSearchParams("page=3&status=ACTIVE");
    const next = updateParams(current, { search: "  Alice  ", teamName: "  FC Paris ", position: "  Attaquante ", status: "ALL", sortBy: "createdAt", sortOrder: "desc", page: 1 });

    expect(next.get("search")).toBe("Alice");
    expect(next.get("teamName")).toBe("FC Paris");
    expect(next.get("position")).toBe("Attaquante");
    expect(next.has("status")).toBe(false);
    expect(next.get("sortBy")).toBe("createdAt");
    expect(next.get("sortOrder")).toBe("desc");
    expect(next.has("page")).toBe(false);
  });
});
