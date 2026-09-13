-- One atomic statement: contradictory legacy data leaves the schema and rows intact.
-- Keep uq_active_team_player_per_player, created in 20260912100000_player_crud.
DO $migration$
DECLARE
    conflicting_player UUID;
BEGIN
    LOCK TABLE player, team_player IN ACCESS EXCLUSIVE MODE;

    SELECT p.id INTO conflicting_player
    FROM player p
    WHERE p.team_id IS NOT NULL
      AND EXISTS (SELECT 1 FROM team_player tp WHERE tp.player_id = p.id)
      AND (
        NOT EXISTS (
            SELECT 1 FROM team_player tp
            WHERE tp.player_id = p.id AND tp.team_id = p.team_id
        )
        OR EXISTS (
            SELECT 1 FROM team_player tp
            WHERE tp.player_id = p.id AND tp.left_at IS NULL AND tp.team_id <> p.team_id
        )
      )
    ORDER BY p.id
    LIMIT 1;

    IF conflicting_player IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot migrate player %: legacy team contradicts team_player. Reconcile assignments before retrying.', conflicting_player;
    END IF;

    -- The only available legacy date is created_at. Use its UTC calendar date.
    -- Existing assignments (including closed history) are authoritative and unchanged.
    INSERT INTO team_player (player_id, team_id, joined_at, left_at)
    SELECT p.id, p.team_id, (p.created_at AT TIME ZONE 'UTC')::date,
           CASE WHEN p.is_active THEN NULL
                ELSE GREATEST((p.created_at AT TIME ZONE 'UTC')::date,
                              (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date) END
    FROM player p
    WHERE p.team_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM team_player tp WHERE tp.player_id = p.id);

    IF EXISTS (
        SELECT 1 FROM player p
        WHERE p.team_id IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM team_player tp
              WHERE tp.player_id = p.id AND tp.team_id = p.team_id
          )
    ) THEN
        RAISE EXCEPTION 'Legacy player team backfill is incomplete; no column was removed.';
    END IF;

    -- Dropping this column removes only its obsolete FK and idx_player_team.
    -- All team_player history and its restrictive FKs/partial unique index survive.
    ALTER TABLE player DROP COLUMN team_id;
END
$migration$;
