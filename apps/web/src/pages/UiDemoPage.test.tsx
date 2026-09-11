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
    expect(screen.getAllByRole("button", { name: "Primary" })).toHaveLength(4);
    expect(screen.getByRole("heading", { name: "Petite — sm" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Moyenne — m" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Grande — l" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Très grande — xl" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Disabled" })).toBeDisabled();
    expect(screen.getByLabelText("Champ standard")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Checkbox native/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Format League" })).toBeInTheDocument();
    expect(screen.getByText("Ligue Nationale")).toBeInTheDocument();
    expect(screen.getByText("Version").parentElement).toHaveTextContent("1");
    expect(screen.getByTestId("create-league-form")).toBeInTheDocument();
  });
});
