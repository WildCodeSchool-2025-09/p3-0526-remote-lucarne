import type { Season } from "@lucarne/shared";
import { MemoryRouter } from "react-router";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearAccessToken, setAccessToken } from "../../../../src/lib/authToken";
import { useSeasonList } from "../../../../src/features/season/hooks/useSeasonList";
import { useSetCurrentSeason } from "../../../../src/features/season/hooks/useSetCurrentSeason";
import SeasonListPage from "../../../../src/features/season/pages/SeasonListPage";

vi.mock("../../../../src/features/season/hooks/useSeasonList", () => ({ useSeasonList: vi.fn() }));
vi.mock("../../../../src/features/season/hooks/useSetCurrentSeason", () => ({ useSetCurrentSeason: vi.fn() }));

const listQuery = vi.mocked(useSeasonList);
const currentMutation = vi.mocked(useSetCurrentSeason);

const seasons: Season[] = [
  { id: "season-1", leagueId: "league-1", name: "2026-2027", startDate: "2026-08-01", endDate: "2027-06-30", status: "CURRENT", version: 0, createdAt: "2026-09-16T00:00:00.000Z" },
  { id: "season-2", leagueId: "league-1", name: "2025-2026", startDate: "2025-08-01", endDate: "2026-06-30", status: "INACTIVE", version: 0, createdAt: "2025-09-16T00:00:00.000Z" },
];

function token(role: string): string {
  const encode = (value: string) => btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${encode(JSON.stringify({ alg: "none" }))}.${encode(JSON.stringify({ role }))}.signature`;
}

describe("SeasonListPage", () => {
  const mutateAsync = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    setAccessToken(token("ADMIN"));
    listQuery.mockReturnValue({ data: { data: seasons, pagination: { page: 1, pageSize: 20, totalItems: 2, totalPages: 1 } }, isError: false, isPending: false, isSuccess: true, refetch: vi.fn() } as never);
    currentMutation.mockReturnValue({ isPending: false, mutateAsync } as never);
  });

  afterEach(() => {
    clearAccessToken();
    vi.clearAllMocks();
  });

  it("displays seasons and role-sensitive actions", () => {
    render(<MemoryRouter initialEntries={["/dashboard/seasons"]}><SeasonListPage /></MemoryRouter>);

    expect(screen.getByRole("heading", { name: "Saisons" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "2026-2027" })).toHaveLength(2);
    expect(screen.getAllByText("Courante").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Définir courante" })).toHaveLength(2);
  });

  it("hides write actions for USER", () => {
    setAccessToken(token("USER"));
    render(<MemoryRouter initialEntries={["/dashboard/seasons"]}><SeasonListPage /></MemoryRouter>);

    expect(screen.queryByRole("link", { name: "Ajouter une saison" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Modifier" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Définir courante" })).not.toBeInTheDocument();
  });

  it("sets an inactive season as current", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={["/dashboard/seasons"]}><SeasonListPage /></MemoryRouter>);

    await user.click(screen.getAllByRole("button", { name: "Définir courante" })[0]);
    expect(mutateAsync).toHaveBeenCalledWith({ leagueId: "league-1", seasonId: "season-2" });
  });
});
