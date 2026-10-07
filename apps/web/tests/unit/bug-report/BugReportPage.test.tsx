import type { BugReport } from "@lucarne/shared";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BugReportPage from "../../../src/features/bug-report/pages/BugReportPage";
import { useBugReports } from "../../../src/features/bug-report/hooks/useBugReports";
import { useDeleteBugReport } from "../../../src/features/bug-report/hooks/useDeleteBugReport";

vi.mock("../../../src/features/bug-report/hooks/useBugReports", () => ({
  useBugReports: vi.fn(),
}));
vi.mock("../../../src/features/bug-report/hooks/useDeleteBugReport", () => ({
  useDeleteBugReport: vi.fn(),
}));

const listQuery = vi.mocked(useBugReports);
const deleteQuery = vi.mocked(useDeleteBugReport);
const bugReport: BugReport = {
  id: "00000000-0000-0000-0000-000000000000",
  createdAt: "2026-09-16T20:00:00.000Z",
  pagePath: "/dashboard/teams",
  title: "Bouton cassé",
  description: "Le bouton ne répond plus.",
};

describe("BugReportPage", () => {
  it("renders loading, empty and error states", () => {
    deleteQuery.mockReturnValue({ isError: false, isPending: false, mutateAsync: vi.fn(), reset: vi.fn() } as never);

    listQuery.mockReturnValue({ isError: false, isPending: true, isSuccess: false } as never);
    const { rerender } = render(<BugReportPage />);
    expect(screen.getByRole("status")).toHaveTextContent("Chargement des bug reports");

    listQuery.mockReturnValue({ data: [], isError: false, isPending: false, isSuccess: true } as never);
    rerender(<BugReportPage />);
    expect(screen.getByText("Aucun bug report n’est disponible.")).toBeInTheDocument();

    listQuery.mockReturnValue({ isError: true, isPending: false, isSuccess: false, refetch: vi.fn() } as never);
    rerender(<BugReportPage />);
    expect(screen.getByText("Impossible de charger les bug reports. Veuillez réessayer.")).toBeInTheDocument();
  });

  it("renders the bug reports table", () => {
    listQuery.mockReturnValue({ data: [bugReport], isError: false, isPending: false, isSuccess: true } as never);
    deleteQuery.mockReturnValue({ isError: false, isPending: false, mutateAsync: vi.fn(), reset: vi.fn() } as never);

    render(<BugReportPage />);

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Bouton cassé")).toBeInTheDocument();
    expect(screen.getByText("/dashboard/teams")).toBeInTheDocument();
  });

  it("opens confirmation before deleting a report", () => {
    listQuery.mockReturnValue({ data: [bugReport], isError: false, isPending: false, isSuccess: true } as never);
    deleteQuery.mockReturnValue({ isError: false, isPending: false, mutateAsync: vi.fn(), reset: vi.fn() } as never);

    render(<BugReportPage />);
    fireEvent.click(screen.getByRole("button", { name: "Supprimer le bug report « Bouton cassé »" }));

    expect(screen.getByRole("dialog")).toHaveTextContent("Cette suppression est définitive.");
  });
});
