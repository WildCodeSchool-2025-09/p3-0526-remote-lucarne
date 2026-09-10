import {
  createLeagueDefaultValues,
  createLeagueFormSchema,
  toCreateLeagueInput,
} from "./league.schema";

describe("createLeagueFormSchema", () => {
  it.each([
    { name: "Première Ligue", country: "France", isActive: true },
    {
      name: "Première Ligue",
      country: "France",
      logoUrl: "https://example.com/logo.png",
      isActive: false,
    },
  ])("accepts valid league data", (input) => {
    expect(createLeagueFormSchema.parse(input)).toMatchObject(input);
  });

  it("normalizes names, countries and an empty logo URL", () => {
    const result = createLeagueFormSchema.parse({
      name: "  Première Ligue  ",
      country: " France ",
      logoUrl: "   ",
      isActive: true,
    });

    expect(result).toEqual({
      name: "Première Ligue",
      country: "France",
      logoUrl: undefined,
      isActive: true,
    });
  });

  it("uses the expected initial form values", () => {
    expect(createLeagueDefaultValues).toEqual({
      name: "",
      country: "",
      logoUrl: "",
      isActive: true,
    });
  });

  it("maps validated values to the API input contract", () => {
    expect(toCreateLeagueInput({
      name: "  Première Ligue ",
      country: " France ",
      logoUrl: "",
      isActive: true,
    })).toEqual({
      name: "Première Ligue",
      country: "France",
      logoUrl: undefined,
      isActive: true,
    });
  });

  it.each([
    ["name is missing", { country: "France", isActive: true }],
    ["name is empty", { name: "", country: "France", isActive: true }],
    ["name contains only spaces", { name: "   ", country: "France", isActive: true }],
    ["name is too long", { name: "a".repeat(151), country: "France", isActive: true }],
    ["country is missing", { name: "Ligue", isActive: true }],
    ["country is empty", { name: "Ligue", country: "", isActive: true }],
    ["country contains only spaces", { name: "Ligue", country: "   ", isActive: true }],
    ["country is too long", { name: "Ligue", country: "a".repeat(101), isActive: true }],
    ["logo URL is invalid", { name: "Ligue", country: "France", logoUrl: "not-a-url", isActive: true }],
    ["isActive is not boolean", { name: "Ligue", country: "France", isActive: "true" }],
  ])("rejects when %s", (_description, input) => {
    expect(createLeagueFormSchema.safeParse(input).success).toBe(false);
  });
});
