import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import PublicNavigation from "../../../src/components/public/PublicNavigation";
import PublicMobileHeader from "../../../src/components/public/PublicMobileHeader";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../../../src/features/auth/AuthProvider";

function MobileHeader() {
  return <QueryClientProvider client={new QueryClient()}><AuthProvider><PublicMobileHeader /></AuthProvider></QueryClientProvider>;
}

function navigation(compact = false, path = "/") {
  render(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={[path]}><PublicNavigation compact={compact} /></MemoryRouter></QueryClientProvider>);
}

beforeEach(() => vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("[]", { headers: { "content-type": "application/json" } }))));
afterEach(() => vi.unstubAllGlobals());

describe("PublicNavigation", () => {
  it("uses the canonical public calendar and keeps it active on match details", () => {
    navigation(false, "/matches/public-id");
    expect(screen.getByRole("link", { name: "Calendrier", current: "page" })).toHaveAttribute("href", "/matches");
    expect(screen.getByRole("link", { name: "Recherche" })).toHaveAttribute("href", "/search");
  });

  it("discloses the empty public league list and restores focus on Escape", async () => {
    const user = userEvent.setup();
    navigation();
    const button = screen.getByRole("button", { name: "Ligues" });
    const panel = document.getElementById(button.getAttribute("aria-controls") ?? "");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(panel).not.toBeVisible();
    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(panel).toBeVisible();
    await screen.findByText("Aucune ligue active.");
    expect(panel).toHaveTextContent("Aucune ligue active.");
    expect(panel?.querySelector("a")).toHaveAttribute("href", "/leagues");
    await user.keyboard("{Escape}");
    expect(button).toHaveFocus();
    expect(panel).not.toBeVisible();
  });

  it("preserves compact labels and dismisses the tablet panel when focus leaves", async () => {
    const user = userEvent.setup();
    navigation(true);
    const button = screen.getByRole("button", { name: "Ligues" });
    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    await user.tab();
    expect(screen.getByRole("link", { name: "Calendrier" })).toHaveFocus();
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("dismisses the tablet panel after an outside pointer interaction", async () => {
    const user = userEvent.setup();
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><PublicNavigation compact /><button type="button">Outside</button></MemoryRouter></QueryClientProvider>);
    const button = screen.getByRole("button", { name: "Ligues" });
    await user.click(button);
    await user.click(screen.getByRole("button", { name: "Outside" }));
    expect(button).toHaveAttribute("aria-expanded", "false");
  });
});

describe("PublicMobileHeader", () => {
  it("keeps closed links out of the keyboard order and restores focus on Escape", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><MobileHeader /></MemoryRouter>);
    const button = screen.getByRole("button", { name: "Ouvrir le menu" });
    expect(screen.queryByRole("navigation", { name: "Navigation publique" })).not.toBeInTheDocument();
    button.focus();
    await user.tab();
    expect(screen.getByRole("link", { name: "Lucarne — Accueil" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Compte" })).toHaveFocus();
    await user.click(button);
    expect(screen.getByRole("navigation", { name: "Navigation publique" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Accueil" })).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");
    screen.getByRole("link", { name: "Calendrier" }).focus();
    await user.keyboard("{Escape}");
    expect(button).toHaveFocus();
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(document.body.style.overflow).toBe("");
  });

  it("closes Ligues first, then closes the mobile menu on a second Escape", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><MobileHeader /></MemoryRouter>);
    const menuButton = screen.getByRole("button", { name: "Ouvrir le menu" });
    await user.click(menuButton);
    const leaguesButton = screen.getByRole("button", { name: "Ligues" });
    await user.click(leaguesButton);
    await user.keyboard("{Escape}");
    expect(leaguesButton).toHaveFocus();
    expect(leaguesButton).toHaveAttribute("aria-expanded", "false");
    expect(menuButton).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{Escape}");
    expect(menuButton).toHaveFocus();
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
  });

  it("closes after navigation, including clicking the already active calendar", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={["/matches"]}><MobileHeader /></MemoryRouter>);
    const menuButton = screen.getByRole("button", { name: "Ouvrir le menu" });
    await user.click(menuButton);
    await user.click(screen.getByRole("link", { name: "Calendrier" }));
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
  });
});
