import type { Season } from "@lucarne/shared";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UpdateSeasonForm } from "../../../../src/features/season/components/UpdateSeasonForm";

const useUpdateSeasonMock = vi.hoisted(() => vi.fn());
vi.mock("../../../../src/features/season/hooks/useUpdateSeason", () => ({ useUpdateSeason: useUpdateSeasonMock }));

const season: Season = {
  id: "season-id",
  name: "2026-2027",
  startDate: "2026-08-01",
  endDate: "2027-06-30",
  version: 3,
  createdAt: "2026-09-16T00:00:00.000Z",
};

describe("UpdateSeasonForm", () => {
  const mutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useUpdateSeasonMock.mockReturnValue({ error: null, isError: false, isPending: false, mutate, reset: vi.fn() });
  });

  it("sends only changed fields with the current version", async () => {
    render(<UpdateSeasonForm onCancel={vi.fn()} onReload={vi.fn()} onSuccess={vi.fn()} season={season} />);

    fireEvent.change(screen.getByLabelText("Nom *"), { target: { value: "2026-2027 revised" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => expect(mutate).toHaveBeenCalledWith(
      { name: "2026-2027 revised", version: 3 },
      expect.any(Object),
    ));
  });

  it("keeps the submit button disabled when nothing changed", () => {
    render(<UpdateSeasonForm onCancel={vi.fn()} onReload={vi.fn()} onSuccess={vi.fn()} season={season} />);

    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
  });
});
