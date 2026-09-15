import { formatDate } from "../../../src/lib/dateFormat";

describe("formatDate", () => {
  it("formats calendar dates in French using UTC", () => {
    expect(formatDate("2026-09-11T23:30:00-05:00")).toBe("12/09/2026");
  });

  it("returns a neutral placeholder for an invalid date", () => {
    expect(formatDate("not-a-date")).toBe("—");
  });
});
