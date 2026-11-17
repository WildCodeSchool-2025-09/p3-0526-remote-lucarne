import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import DashboardListPageHeader from "../../../src/components/dashboard/DashboardListPageHeader";
import { temporaryIcons } from "../../../src/ui";

describe("DashboardListPageHeader", () => {
  it("renders the page identity, mandatory count and creation action", () => {
    render(
      <MemoryRouter>
        <DashboardListPageHeader
          canCreate
          count={12}
          countLabel="équipes"
          createHref="/dashboard/teams/new"
          createLabel="Ajouter une équipe"
          description="Consulter et gérer les équipes."
          headingId="team-list-title"
          icon={temporaryIcons.teams}
          title="Équipes"
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Équipes" })).toHaveAttribute("id", "team-list-title");
    expect(screen.getByText("12 équipes")).toBeInTheDocument();
    expect(screen.getByText("Consulter et gérer les équipes.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ajouter une équipe" })).toHaveAttribute("href", "/dashboard/teams/new");
  });

  it("hides the creation action when it is not allowed", () => {
    render(
      <MemoryRouter>
        <DashboardListPageHeader
          canCreate={false}
          count={0}
          countLabel="équipes"
          createHref="/dashboard/teams/new"
          createLabel="Ajouter une équipe"
          description="Consulter et gérer les équipes."
          headingId="team-list-title"
          icon={temporaryIcons.teams}
          title="Équipes"
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("0 équipes")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Ajouter une équipe" })).not.toBeInTheDocument();
  });
});
