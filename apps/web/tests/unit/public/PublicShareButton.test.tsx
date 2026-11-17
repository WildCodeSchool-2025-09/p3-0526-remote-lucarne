import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import PublicShareButton from "../../../src/components/public/PublicShareButton";
import { publicMatchReturnPath } from "../../../src/features/match/publicMatchNavigation";
import { publicSearchReturnPath } from "../../../src/features/search/publicSearchNavigation";

afterEach(() => vi.restoreAllMocks());

it("copies a stable match URL without the temporary return destination", async () => {
  const user = userEvent.setup();
  const write = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
  render(<MemoryRouter initialEntries={["/matches/123?returnTo=%2Fmatches%3Fpage%3D2&searchReturnTo=%2Fsearch%3Fq%3Dclub"]}><PublicShareButton /></MemoryRouter>);
  await user.click(screen.getByRole("button", { name: "Partager cette page" }));
  expect(write).toHaveBeenCalledWith(new URL("/matches/123", window.location.origin).href);
  expect(await screen.findByRole("status")).toHaveTextContent("Le lien a été copié.");
});

it("offers a selectable URL after a clipboard failure", async () => {
  const user = userEvent.setup();
  vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("Clipboard unavailable"));
  render(<MemoryRouter initialEntries={["/matches?status=COMPLETED&page=2"]}><PublicShareButton /></MemoryRouter>);
  await user.click(screen.getByRole("button", { name: "Partager cette page" }));
  expect(await screen.findByRole("textbox", { name: "Lien de la page" })).toHaveValue(new URL("/matches?status=COMPLETED&page=2", window.location.origin).href);
  expect(screen.getByRole("status")).toHaveTextContent("Le partage a échoué");
});

it.each(["https://example.org/matches", "//example.org/matches", "/dashboard/matches", "/matches?returnTo=%2Fdashboard", "javascript:alert(1)"])("rejects an unsafe or unsupported calendar return: %s", (value) => {
  expect(publicMatchReturnPath(value)).toBe("/matches");
});

it("retains a valid league calendar and its filters", () => {
  const path = "/leagues/elite-feminine/matches?seasonId=00000000-0000-4000-8000-000000000002&status=COMPLETED&page=2";
  expect(publicMatchReturnPath(path)).toBe(path);
});

it("retains validated search criteria and rejects an external or private search return", () => {
  const path = "/search?q=elite&type=TEAM&page=2";
  expect(publicSearchReturnPath(path)).toBe(path);
  for (const value of ["https://example.com/search?q=club", "/dashboard?q=club", "/search?q=x", "/search?q=club&includeDrafts=true"]) expect(publicSearchReturnPath(value)).toBeNull();
});
