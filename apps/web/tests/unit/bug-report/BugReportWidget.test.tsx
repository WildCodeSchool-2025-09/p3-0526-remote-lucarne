import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BugReportWidget } from "../../../src/features/bug-report/components/BugReportWidget";

function renderWidget(onSubmit = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

  return render(
    <QueryClientProvider client={queryClient}>
      <BugReportWidget onSubmit={onSubmit} />
    </QueryClientProvider>,
  );
}

describe("BugReportWidget", () => {
  it("opens the dialog and validates required fields", async () => {
    const user = userEvent.setup();

    renderWidget();

    await user.click(screen.getByRole("button", { name: "Signaler un bug" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Envoyer" }));

    expect(screen.getByText("Titre requis")).toBeInTheDocument();
    expect(screen.getByText("Description requise")).toBeInTheDocument();
  });

  it("submits the title, description and current path", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    renderWidget(onSubmit);

    await user.click(screen.getByRole("button", { name: "Signaler un bug" }));
    await user.type(screen.getByLabelText("Titre *"), "Bouton cassé");
    await user.type(screen.getByLabelText("Description *"), "Le bouton ne répond plus.");
    await user.click(screen.getByRole("button", { name: "Envoyer" }));

    expect(onSubmit).toHaveBeenCalledWith({
      description: "Le bouton ne répond plus.",
      pagePath: window.location.pathname,
      title: "Bouton cassé",
    });
  });

  it("closes the dialog with cancel", async () => {
    const user = userEvent.setup();

    renderWidget();

    await user.click(screen.getByRole("button", { name: "Signaler un bug" }));
    await user.click(screen.getByRole("button", { name: "Annuler" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
