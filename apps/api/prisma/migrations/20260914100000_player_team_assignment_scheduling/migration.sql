CREATE EXTENSION IF NOT EXISTS btree_gist;

DROP INDEX uq_active_team_player_per_player;

ALTER TABLE team_player
  ADD CONSTRAINT excl_team_player_assignment_period
  EXCLUDE USING gist (
    player_id WITH =,
    daterange(joined_at, COALESCE(left_at, 'infinity'::date), '[)') WITH &&
  );
