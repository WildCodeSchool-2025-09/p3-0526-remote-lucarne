import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateSeasonForm } from "../../../../src/features/season/components/CreateSeasonForm";

const useCreateSeasonMock = vi.hoisted(() => vi.fn());
vi.mock("../../../../src/features/season/hooks/useCreateSeason", () => ({ useCreateSeason: useCreateSeasonMock }));

describe("CreateSeasonForm", () => {
  const mutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useCreateSeasonMock.mockReturnValue({ error: null, isError: false, isPending: false, mutate, reset: vi.fn() });
  });

  it("renders season fields", () => {
    render(<CreateSeasonForm />);

    expect(screen.getByLabelText("Nom *")).toBeInTheDocument();
    expect(screen.getByLabelText("Date de début *")).toBeInTheDocument();
    expect(screen.getByLabelText("Date de fin *")).toBeInTheDocument();
  });

  it("rejects an invalid period and submits a valid payload", async () => {
    const user = userEvent.setup();
    render(<CreateSeasonForm />);

    await user.type(screen.getByLabelText("Nom *"), "2026-2027");
    await user.type(screen.getByLabelText("Date de début *"), "2027-06-30");
    await user.type(screen.getByLabelText("Date de fin *"), "2026-08-01");
    await user.click(screen.getByRole("button", { name: "Créer la saison" }));
    expect(await screen.findByText("La date de fin doit être postérieure ou égale à la date de début")).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText("Date de début *"));
    await user.type(screen.getByLabelText("Date de début *"), "2026-08-01");
    await user.click(screen.getByRole("button", { name: "Créer la saison" }));
    await waitFor(() => expect(mutate).toHaveBeenCalledWith({ name: "2026-2027", startDate: "2026-08-01", endDate: "2026-08-01" }, expect.anything()));
  });
});
