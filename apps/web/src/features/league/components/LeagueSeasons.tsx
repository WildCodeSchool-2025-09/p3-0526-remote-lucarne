import { useState } from "react";
import { formatDate } from "../../../lib/dateFormat";
import { Alert, Button, LoadingState, Pagination } from "../../../ui";
import { useLeagueSeasons } from "../../season/hooks/useLeagueSeasons";

interface LeagueSeasonsProps {
  leagueId: string;
}

function LeagueSeasons({ leagueId }: LeagueSeasonsProps) {
  const [page, setPage] = useState(1);
  const editions = useLeagueSeasons(leagueId, {
    page,
    pageSize: 20,
    sortBy: "startDate",
    sortOrder: "desc",
  });

  return (
    <section
      className={`
        grid gap-5 rounded-[var(--radius-surface)] border
        border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-7
        [&>header]:grid [&>header]:gap-1.5 [&>header_h2]:m-0 [&>header_p]:m-0
        league-mobile:px-5 league-mobile:py-6
      `}
      aria-labelledby="league-seasons-title"
    >
      <header>
        <h2 id="league-seasons-title">Saisons de la ligue</h2>
        <p>Une même saison peut être associée à plusieurs ligues.</p>
      </header>
      {editions.isPending ? <LoadingState>Chargement des saisons…</LoadingState> : null}
      {editions.isError ? (
        <>
          <Alert>Impossible de charger les saisons de cette ligue.</Alert>
          <Button onClick={() => void editions.refetch()} variant="outline">
            Réessayer
          </Button>
        </>
      ) : null}
      {editions.isSuccess && editions.data.data.length === 0 ? (
        <p>Aucune saison n’est encore associée à cette ligue.</p>
      ) : null}
      {editions.data?.data.map((edition) => (
        <article
          className={`
            flex items-center justify-between gap-5 border-t
            border-[var(--color-border-default)] pt-[18px] [&_h3]:m-0 [&_p]:m-0
            [&>div:first-child]:grid [&>div:first-child]:gap-1.5 league-mobile:flex-col
            league-mobile:items-stretch
          `}
          key={edition.id}
        >
          <div>
            <h3>
              {edition.season.name}
              {edition.isCurrent ? (
                <span className="ml-2.5 inline-block rounded-full bg-[var(--color-bg-subtle)] px-2.5 py-1 text-[12px]">
                  Saison actuelle
                </span>
              ) : null}
            </h3>
            <p>
              {formatDate(edition.season.startDate)} –{" "}
              {formatDate(edition.season.endDate)}
            </p>
          </div>
        </article>
      ))}
      {editions.isSuccess && editions.data.pagination.totalPages > 1 ? (
        <Pagination
          label="Pagination des saisons de la ligue"
          onPageChange={setPage}
          page={page}
          totalPages={editions.data.pagination.totalPages}
        />
      ) : null}
    </section>
  );
}

export default LeagueSeasons;
