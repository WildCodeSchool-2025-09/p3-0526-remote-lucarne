BEGIN;

-- Existing associations remain unconfigured: no default or inferred values.
ALTER TABLE league_season
  ADD COLUMN matchday_count INTEGER,
  ADD COLUMN matches_per_matchday INTEGER,
  ADD CONSTRAINT ck_league_season_matchday_count
    CHECK (matchday_count > 0),
  ADD CONSTRAINT ck_league_season_matches_per_matchday
    CHECK (matches_per_matchday > 0);

COMMIT;
