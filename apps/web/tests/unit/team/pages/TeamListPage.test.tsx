import type { Team } from "@lucarne/shared";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { clearAccessToken, setAccessToken } from "../../../../src/lib/authToken";
import { useTeamList } from "../../../../src/hooks/useTeamList";
import { useTeamMutation } from "../../../../src/features/team/hooks/useTeamMutation";
import TeamListPage from "../../../../src/features/team/pages/TeamListPage";

vi.mock("../../../../src/hooks/useTeamList", () => ({ useTeamList: vi.fn() }));
vi.mock("../../../../src/features/team/hooks/useTeamMutation", () => ({ useTeamMutation: vi.fn() }));

const listQuery = vi.mocked(useTeamList);
const mutationHook = vi.mocked(useTeamMutation);

const teams: Team[] = [
  {
    id: "team-1",
    name: "Les Lionnes",
    logoUrl: null,
    stadium: "Stade des Lumières",
    isActive: true,
    createdAt: "2026-09-11T10:30:00.000Z",
  },
  {
    id: "team-2",
    name: "Olympique Bleu",
    logoUrl: "https://example.com/team.png",
    stadium: null,
    isActive: false,
    createdAt: "2026-01-02T10:30:00.000Z",
  },
];

function token(role: string): string {
  const encode = (value: string) => btoa(value)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${encode(JSON.stringify({ alg: "none" }))}.${encode(JSON.stringify({ role }))}.signature`;
}

function renderPage(entry = "/dashboard/teams") {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <TeamListPage />
    </MemoryRouter>,
  );
}

async function openTableActions(user: ReturnType<typeof userEvent.setup>, index = 0) {
  const table = within(screen.getByRole("table"));
  const trigger = table.getAllByRole("button", { name: /Ouvrir les actions/ })[index];
  await user.click(trigger);
  return trigger;
}

describe("TeamListPage", () => {
  const mutateAsync = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    setAccessToken(token("ADMIN"));
    listQuery.mockReturnValue({
      data: {
        data: teams,
        pagination: { page: 1, pageSize: 20, totalItems: 2, totalPages: 1 },
      },
      isError: false,
      isPending: false,
      isSuccess: true,
      refetch: vi.fn(),
    } as never);
    mutationHook.mockReturnValue({ isPending: false, mutateAsync } as never);
  });

  afterEach(() => {
    clearAccessToken();
    vi.clearAllMocks();
  });

  it("uses the shared list layout and renders table and card representations", () => {
    const { container } = renderPage();

    expect(screen.getByRole("heading", { name: "Équipes" })).toBeInTheDocument();
    expect(screen.getByText("2 équipes")).toBeInTheDocument();
    expect(container.querySelector(".dashboard-list-page")).toBeInTheDocument();
    expect(within(screen.getByRole("table")).getByRole("link", { name: "Les Lionnes" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Liste des équipes sous forme de cartes" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getAllByText("Stade des Lumières")).toHaveLength(2);
    expect(screen.getByText("11/09/2026")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Initiale de Les Lionnes")).toHaveLength(2);
    expect(screen.getAllByAltText("Logo de Olympique Bleu")).toHaveLength(2);
  });

  it("updates all filters and resets them", async () => {
    const user = userEvent.setup();
    renderPage("/dashboard/teams?search=Lionnes&status=ACTIVE&sortOrder=desc&page=2");

    expect(screen.getByRole("button", { name: "Afficher les filtres, 2 actifs" })).toBeInTheDocument();

    const search = screen.getByRole("searchbox", { name: "Rechercher une équipe par nom" });
    await user.clear(search);
    await user.type(search, "Olympique");
    await user.selectOptions(screen.getByRole("combobox", { name: "Filtrer par statut" }), "INACTIVE");
    await user.selectOptions(screen.getByRole("combobox", { name: "Trier les équipes" }), "createdAt:asc");

    expect(search).toHaveValue("Olympique");
    expect(screen.getByRole("combobox", { name: "Filtrer par statut" })).toHaveValue("INACTIVE");
    expect(screen.getByRole("combobox", { name: "Trier les équipes" })).toHaveValue("createdAt:asc");

    await user.click(screen.getByRole("button", { name: "Réinitialiser" }));
    expect(search).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "Filtrer par statut" })).toHaveValue("ALL");
  });

  it("shows native resource actions and confirms deactivation", async () => {
    const user = userEvent.setup();
    renderPage();

    const trigger = await openTableActions(user);
    expect(screen.getByRole("link", { name: "Modifier" })).toHaveAttribute("href", "/dashboard/teams/team-1/edit");
    await user.click(screen.getByRole("button", { name: "Désactiver" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("deviendra inactive");
    await user.click(screen.getByRole("button", { name: "Confirmer" }));

    expect(mutateAsync).toHaveBeenCalledWith({ action: "deactivate", id: "team-1" });
    expect(await screen.findByRole("alert")).toHaveTextContent("désactivée");
    expect(trigger).toHaveFocus();
  });

  it("offers activation and deletion for an inactive team to an administrator", async () => {
    const user = userEvent.setup();
    renderPage();

    await openTableActions(user, 1);
    expect(screen.getByRole("button", { name: "Activer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Supprimer" })).toBeInTheDocument();
  });

  it.each(["MODERATOR", "EDITOR"])("hides permanent deletion from %s", async (role) => {
    setAccessToken(token(role));
    const user = userEvent.setup();
    renderPage();

    await openTableActions(user);
    expect(screen.getByRole("button", { name: "Désactiver" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Supprimer" })).not.toBeInTheDocument();
  });

  it("hides editing and creation controls from a basic user", () => {
    setAccessToken(token("USER"));
    renderPage();

    expect(screen.queryByRole("button", { name: /Ouvrir les actions/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Ajouter une équipe" })).not.toBeInTheDocument();
  });

  it("renders loading and unfiltered empty states", () => {
    listQuery.mockReturnValueOnce({ isPending: true, isError: false, isSuccess: false } as never);
    const { unmount } = renderPage();
    expect(screen.getByRole("status")).toHaveTextContent("Chargement des équipes");
    unmount();

    listQuery.mockReturnValueOnce({
      data: { data: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } },
      isError: false,
      isPending: false,
      isSuccess: true,
    } as never);
    renderPage();
    expect(screen.getByText("Aucune équipe n’est disponible.")).toBeInTheDocument();
  });

  it("allows retry after a loading error", async () => {
    const refetch = vi.fn();
    listQuery.mockReturnValueOnce({ isPending: false, isError: true, isSuccess: false, refetch } as never);
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(refetch).toHaveBeenCalledOnce();
  });
});
