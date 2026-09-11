import type { League } from "@lucarne/shared";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UpdateLeagueForm } from "./UpdateLeagueForm";

const mutate = vi.fn();
const resetMutation = vi.fn();
const useUpdateLeagueMock = vi.hoisted(() => vi.fn());

vi.mock("../../../hooks/useUpdateLeague", () => ({ useUpdateLeague: useUpdateLeagueMock }));

const league: League = {
  id: "league-id",
  name: "Ligue Nationale",
  country: "France",
  logoUrl: "https://example.com/logo.png",
  status: "ACTIVE",
  isActive: true,
  version: 3,
  createdAt: "2026-09-11T10:00:00.000Z",
};

function renderForm(canEditStatus = true) {
  useUpdateLeagueMock.mockReturnValue({ error: null, isError: false, isPending: false, mutate, reset: resetMutation });
  return render(
    <UpdateLeagueForm
      canEditStatus={canEditStatus}
      league={league}
      onCancel={vi.fn()}
      onReload={vi.fn()}
      onSuccess={vi.fn()}
    />,
  );
}

describe("UpdateLeagueForm", () => {
  it("prefills editable fields, keeps version hidden and hides status for non-admins", () => {
    renderForm(false);

    expect(screen.getByDisplayValue("Ligue Nationale")).toBeInTheDocument();
    expect(screen.getByDisplayValue("France")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://example.com/logo.png")).toBeInTheDocument();
    expect(screen.queryByLabelText("Ligue active")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("3")).not.toBeInTheDocument();
  });

  it("sends only changed fields with the current version and maps empty logo to null", async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("URL du logo"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => expect(mutate).toHaveBeenCalledWith(
      { logoUrl: null, version: 3 },
      expect.any(Object),
    ));
  });

  it("does not submit when nothing changed", () => {
    renderForm();
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
    expect(mutate).not.toHaveBeenCalled();
  });
});
