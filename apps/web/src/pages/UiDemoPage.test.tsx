import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import UiDemoPage from "./UiDemoPage";

vi.mock("../features/league/components/CreateLeagueForm", () => ({
  CreateLeagueForm: () => <div data-testid="create-league-form" />,
}));

describe("UiDemoPage", () => {
  it("displays the Lucarne components and league form", () => {
    render(<UiDemoPage />);

    expect(screen.getByRole("heading", { name: "Page de démonstration" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Primary" })).toBeInTheDocument();
    expect(screen.getByLabelText("Champ standard")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Checkbox native/ })).toBeInTheDocument();
    expect(screen.getByTestId("create-league-form")).toBeInTheDocument();
  });
});
