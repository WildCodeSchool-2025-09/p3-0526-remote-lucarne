import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import DashboardMobileHeader from "../../../src/components/dashboard/DashboardMobileHeader";
import DashboardNavigation from "../../../src/components/dashboard/DashboardNavigation";
import DashboardExitLink from "../../../src/components/dashboard/DashboardExitLink";

describe("DashboardNavigation", () => {
  it("shows implemented destinations and identifies the active page", () => {
    render(
      <MemoryRouter>
        <DashboardNavigation activeItem="teams" />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Équipes" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Ligues" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Joueuses" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Staff" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Tableau de bord" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Saisons" })).toHaveAttribute("href", "/dashboard/seasons");
    expect(screen.getByRole("link", { name: "Matchs" })).toHaveAttribute("href", "/dashboard/matches");
  });
});

describe("DashboardMobileHeader", () => {
  it("keeps the exit hidden until opening the menu and closes after returning home", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={["/dashboard"]}><DashboardMobileHeader /></MemoryRouter>);
    expect(screen.queryByRole("link", { name: "Quitter le dashboard" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ouvrir le menu" }));
    const exit = screen.getByRole("link", { name: "Quitter le dashboard" });
    expect(exit).toHaveAttribute("href", "/");
    await user.click(exit);
    expect(screen.getByRole("button", { name: "Ouvrir le menu" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "Quitter le dashboard" })).not.toBeInTheDocument();
  });
  it("keeps the closed navigation out of the accessibility tree and closes it after navigation", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <DashboardMobileHeader activeItem="teams" />
      </MemoryRouter>,
    );

    const openButton = screen.getByRole("button", { name: "Ouvrir le menu" });
    expect(screen.queryByRole("navigation", { name: "Navigation du dashboard" })).not.toBeInTheDocument();

    await user.click(openButton);
    expect(screen.getByRole("navigation", { name: "Navigation du dashboard" })).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Ligues" }));
    expect(screen.queryByRole("navigation", { name: "Navigation du dashboard" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ouvrir le menu" })).toHaveAttribute("aria-expanded", "false");
  });

  it("closes on Escape and restores focus to the menu button", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <DashboardMobileHeader activeItem="teams" />
      </MemoryRouter>,
    );

    const openButton = screen.getByRole("button", { name: "Ouvrir le menu" });
    await user.click(openButton);
    screen.getByRole("link", { name: "Ligues" }).focus();
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("navigation", { name: "Navigation du dashboard" })).not.toBeInTheDocument();
    expect(openButton).toHaveFocus();
  });
});

describe("DashboardExitLink", () => {
  it("is named accessibly and can be activated with the keyboard", async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={["/dashboard"]}><DashboardExitLink onNavigate={onNavigate} /></MemoryRouter>);
    const exit = screen.getByRole("link", { name: "Quitter le dashboard" });
    expect(exit).toHaveAttribute("href", "/");
    expect(exit).not.toHaveAttribute("aria-current");
    await user.tab();
    expect(exit).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});
