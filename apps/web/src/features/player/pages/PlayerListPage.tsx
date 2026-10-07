import { playerStyles } from "../playerStyles";
import { PlayerActionDialog } from "../components/PlayerActionDialog";
import type { ListPlayersParams, Player } from "@lucarne/shared";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import {
  APP_ROLES,
  getCurrentAppRole,
  hasRole,
  PLAYER_WRITE_ROLES,
} from "../../../auth/authRole";
import DashboardListPageHeader from "../../../components/dashboard/DashboardListPageHeader";
import {
  useActivatePlayer,
  useDeactivatePlayer,
  useDeletePlayer,
  usePlayerList,
} from "../../../hooks/usePlayer";
import {
  Alert,
  Button,
  EmptyState,
  LoadingState,
  Pagination,
  temporaryIcons,
} from "../../../ui";
import PlayerFilters from "../components/PlayerFilters";
import PlayerMobileCard from "../components/PlayerMobileCard";
import PlayerTable from "../components/PlayerTable";
import { type PlayerActionType } from "../components/PlayerRowActions";
import { parseParams, updateParams } from "../utils/playerList";

export default function PlayerListPage() {
  const [url, setUrl] = useSearchParams();
  const params = parseParams(url);
  const query = usePlayerList(params);
  const activate = useActivatePlayer();
  const deactivate = useDeactivatePlayer();
  const remove = useDeletePlayer();
  const role = getCurrentAppRole();
  const canEdit = hasRole(role, PLAYER_WRITE_ROLES);
  const canDelete = role === APP_ROLES.ADMIN;
  const [pendingAction, setPendingAction] = useState<{
    player: Player;
    type: PlayerActionType;
  } | null>(null);
  const setCriteria = (change: Partial<ListPlayersParams>) =>
    setUrl((current) => updateParams(current, { ...change, page: change.page ?? 1 }));
  const players = query.data?.data ?? [];
  const playerNames = players.map((player) => `${player.firstName} ${player.lastName}`);
  const teamNames = players.flatMap((player) =>
    player.activeTeam?.name ? [player.activeTeam.name] : [],
  );
  const positions = players.flatMap((player) =>
    player.position ? [player.position] : [],
  );
  const totalPages = query.data?.pagination.totalPages ?? 0;
  const isFiltered = Boolean(
    params.search || params.teamName || params.position || params.status !== "ALL",
  );
  const mutation =
    pendingAction?.type === "activate"
      ? activate
      : pendingAction?.type === "deactivate"
        ? deactivate
        : remove;

  const confirmAction = async () => {
    if (pendingAction == null || mutation.isPending) return;

    try {
      await mutation.mutateAsync(pendingAction.player.id);
      setPendingAction(null);
    } catch {
      /* The dialog exposes the failure state. */
    }
  };

  useEffect(() => {
    if (query.isSuccess && totalPages > 0 && (params.page ?? 1) > totalPages)
      setUrl((current) => updateParams(current, { page: totalPages }));
  }, [params.page, query.isSuccess, setUrl, totalPages]);

  return (
    <section aria-labelledby="player-list-title" className={playerStyles.detailPage}>
      <div className={playerStyles.container}>
        <DashboardListPageHeader
          canCreate
          count={query.data?.pagination.totalItems ?? 0}
          countLabel="joueuses"
          createHref="/dashboard/players/new"
          createLabel="Ajouter une joueuse"
          description="Consultez les joueuses actives et inactives."
          headingId="player-list-title"
          icon={temporaryIcons.players}
          title="Joueuses"
        />
        <PlayerFilters
          canCreate
          onChange={setCriteria}
          onReset={() => setUrl(new URLSearchParams())}
          params={params}
          playerNames={playerNames}
          positions={positions}
          teamNames={teamNames}
        />

        {query.isPending ? <LoadingState>Chargement des joueuses…</LoadingState> : null}
        {query.isError ? (
          <div className="grid items-center justify-items-center gap-4 px-4 py-12 text-center">
            <Alert>Impossible de charger les joueuses. Veuillez réessayer.</Alert>
            <Button onClick={() => void query.refetch()}>Réessayer</Button>
          </div>
        ) : null}
        {query.isSuccess && query.data.data.length === 0 ? (
          <EmptyState
            action={
              isFiltered ? (
                <Button onClick={() => setUrl(new URLSearchParams())} variant="outline">
                  Réinitialiser les critères
                </Button>
              ) : undefined
            }
          >
            {isFiltered
              ? "Aucune joueuse ne correspond à vos critères."
              : "Aucune joueuse n’est disponible."}
          </EmptyState>
        ) : null}
        {query.isSuccess && query.data.data.length > 0 ? (
          <>
            <PlayerTable
              canDelete={canDelete}
              canEdit={canEdit}
              onAction={(player, type) => setPendingAction({ player, type })}
              players={query.data.data}
            />
            <div
              aria-label="Liste des joueuses sous forme de cartes"
              className="hidden player-compact:grid player-compact:gap-3"
              role="list"
            >
              {query.data.data.map((player) => (
                <PlayerMobileCard
                  canDelete={canDelete}
                  canEdit={canEdit}
                  key={player.id}
                  onAction={(selectedPlayer, type) =>
                    setPendingAction({ player: selectedPlayer, type })
                  }
                  player={player}
                />
              ))}
            </div>
          </>
        ) : null}
        {query.isSuccess && totalPages > 0 ? (
          <Pagination
            label="Pagination des joueuses"
            onPageChange={(page) => setCriteria({ page })}
            page={params.page ?? 1}
            totalPages={totalPages}
          />
        ) : null}
      </div>
      <PlayerActionDialog
        action={pendingAction?.type ?? null}
        error={mutation.isError ? mutation.error : undefined}
        onCancel={() => {
          mutation.reset();
          setPendingAction(null);
        }}
        onConfirm={() => void confirmAction()}
        pending={mutation.isPending}
      />
    </section>
  );
}
