import type { League } from "@lucarne/shared";
import { MemoryRouter } from "react-router";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { useLeagueDetail } from "../hooks/useLeagueDetail";
import LeagueDetailPage from "./LeagueDetailPage";

vi.mock("../hooks/useLeagueDetail", () => ({ useLeagueDetail: vi.fn() }));

const detailQuery = vi.mocked(useLeagueDetail);
const league: League = {
  id: "league-1",
  name: "Ligue de France",
  country: "France",
  logoUrl: null,
  status: "ACTIVE",
  version: 0,
  createdAt: "2026-09-11T10:30:00.000Z",
};

describe("LeagueDetailPage", () => {
  it("displays the detail and supports returning to the previous list state", async () => {
    detailQuery.mockReturnValue({ data: league, isPending: false, isError: false, isSuccess: true } as never);
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/dashboard/leagues?search=France", "/dashboard/leagues/league-1"]} initialIndex={1}>
        <LeagueDetailPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Ligue de France" })).toBeInTheDocument();
    expect(screen.getByText("11/09/2026")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Retour à la liste/ }));
  });

  it("shows a friendly message when the league no longer exists", () => {
    detailQuery.mockReturnValue({
      error: { status: 404 },
      isPending: false,
      isError: true,
      isSuccess: false,
    } as never);

    render(
      <MemoryRouter initialEntries={["/dashboard/leagues/league-1"]}>
        <LeagueDetailPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("n’existe plus");
  });
});
