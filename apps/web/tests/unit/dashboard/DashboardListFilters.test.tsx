import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import DashboardListFilters from "../../../src/components/dashboard/DashboardListFilters";

describe("DashboardListFilters", () => {
  it("groups filter controls and keeps the mobile action outside the collapsible body", () => {
    render(
      <MemoryRouter>
        <DashboardListFilters
          activeCount={2}
          label="Filtres des équipes"
          mobileAction={<a href="/dashboard/teams/new">Ajouter une équipe</a>}
        >
          <label>
            Statut
            <select><option>Tous</option></select>
          </label>
        </DashboardListFilters>
      </MemoryRouter>,
    );

    expect(screen.getByRole("group", { name: "Filtres des équipes" })).toContainElement(screen.getByLabelText("Statut"));
    expect(screen.getByRole("link", { name: "Ajouter une équipe" })).toHaveAttribute("href", "/dashboard/teams/new");
    expect(screen.getByRole("link", { name: "Ajouter une équipe" }).parentElement).toHaveClass("dashboard-list__filters");
    expect(screen.getByLabelText("Statut").parentElement?.parentElement).toHaveClass("dashboard-list__filters-body");
  });

  it("opens and closes the mobile body while exposing its state", async () => {
    const user = userEvent.setup();
    render(
      <DashboardListFilters label="Filtres">
        <button type="button">Réinitialiser</button>
      </DashboardListFilters>,
    );

    const toggle = screen.getByRole("button", { name: "Afficher les filtres" });
    const body = document.getElementById(toggle.getAttribute("aria-controls") ?? "");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(body).not.toHaveClass("dashboard-list__filters-body--open");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();

    await user.click(toggle);
    expect(screen.getByRole("button", { name: "Masquer les filtres" })).toHaveAttribute("aria-expanded", "true");
    expect(body).toHaveClass("dashboard-list__filters-body--open");

    await user.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "Afficher les filtres" })).toHaveFocus();
    expect(body).not.toHaveClass("dashboard-list__filters-body--open");
  });

  it("announces the number of active criteria", () => {
    render(<DashboardListFilters activeCount={2} label="Filtres"><span>Contenu</span></DashboardListFilters>);

    expect(screen.getByRole("button", { name: "Afficher les filtres, 2 actifs" })).toBeInTheDocument();
    expect(screen.getByText("2 actifs")).toBeInTheDocument();
  });
});
