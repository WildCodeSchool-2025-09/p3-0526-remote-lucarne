import { describe, expect, it } from "vitest";
import { parseParams, updateParams } from "../../../../src/features/staff/utils/staffMemberList";

describe("staff member list URL parameters", () => {
  it("uses safe defaults for invalid values", () => {
    expect(parseParams(new URLSearchParams("page=0&status=UNKNOWN&sortBy=nope&sortOrder=desc"))).toMatchObject({ page: 1, pageSize: 20, status: "ALL", sortBy: "lastName", sortOrder: "desc" });
  });

  it("normalizes filters and removes defaults", () => {
    const params = updateParams(new URLSearchParams("page=3&status=ACTIVE"), { search: "  Ada ", teamName: " FC Paris ", status: "ALL", sortBy: "createdAt", sortOrder: "desc", page: 1 });
    expect(params.get("search")).toBe("Ada");
    expect(params.get("teamName")).toBe("FC Paris");
    expect(params.has("status")).toBe(false);
    expect(params.get("sortBy")).toBe("createdAt");
    expect(params.get("sortOrder")).toBe("desc");
    expect(params.has("page")).toBe(false);
  });
});
