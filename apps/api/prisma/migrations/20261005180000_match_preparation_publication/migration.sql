BEGIN;
LOCK TABLE game_match IN ACCESS EXCLUSIVE MODE;

-- Refuse incompatible history atomically. Never infer a replacement status,
-- remove a duplicate, or truncate legacy seconds without a product decision.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM game_match WHERE status = 'POSTPONED') THEN
    RAISE EXCEPTION 'Match migration refused: POSTPONED matches require an explicit business decision';
  END IF;
  IF EXISTS (
    SELECT 1 FROM (
      SELECT matchday_id, home_team_id AS team_id FROM game_match WHERE is_active
      UNION ALL
      SELECT matchday_id, away_team_id AS team_id FROM game_match WHERE is_active
    ) appearances
    GROUP BY matchday_id, team_id HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Match migration refused: a team appears more than once in a matchday; resolve existing conflicts explicitly';
  END IF;
  IF EXISTS (SELECT 1 FROM game_match WHERE start_time >= TIME '24:00:00' OR EXTRACT(SECOND FROM start_time) <> 0) THEN
    RAISE EXCEPTION 'Match migration refused: legacy times must be resolved to HH:mm without silently changing the schedule';
  END IF;
END $$;

ALTER TABLE game_match
  ALTER COLUMN home_team_id DROP NOT NULL,
  ALTER COLUMN away_team_id DROP NOT NULL,
  ALTER COLUMN match_date DROP NOT NULL,
  ALTER COLUMN start_time DROP NOT NULL,
  ADD COLUMN match_public_id UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN is_published BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN version INTEGER NOT NULL DEFAULT 0;

-- Every legacy match was fully scheduled. Preserve scores, teams, civil times,
-- activity flags and participation history, even after a team's withdrawal.
UPDATE game_match SET is_published = TRUE;

ALTER TABLE game_match
  DROP CONSTRAINT chk_match_status,
  ADD CONSTRAINT chk_match_status CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED')),
  ADD CONSTRAINT uq_match_public_id UNIQUE (match_public_id),
  ADD CONSTRAINT chk_match_version CHECK (version >= 0),
  ADD CONSTRAINT chk_match_publication_complete CHECK (
    NOT is_published OR (
      home_team_id IS NOT NULL AND away_team_id IS NOT NULL
      AND match_date IS NOT NULL AND start_time IS NOT NULL
    )
  ),
  ADD CONSTRAINT chk_match_draft_state CHECK (
    is_published OR (status = 'SCHEDULED' AND home_score IS NULL AND away_score IS NULL)
  ),
  ADD CONSTRAINT chk_match_start_time_minutes CHECK (
    start_time IS NULL OR (start_time < TIME '24:00:00' AND EXTRACT(SECOND FROM start_time) = 0)
  );

-- Assigned teams still require registration. Empty sides are allowed only
-- while preparing a slot; publication completeness is guarded by the CHECK.
CREATE OR REPLACE FUNCTION validate_match_teams_participation()
RETURNS TRIGGER AS $$
DECLARE
  selected_league_season_id UUID;
BEGIN
  SELECT league_season_id INTO selected_league_season_id
  FROM matchday WHERE id = NEW.matchday_id;
  IF selected_league_season_id IS NULL THEN
    RAISE EXCEPTION 'The selected matchday does not exist';
  END IF;
  IF NEW.home_team_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM participation WHERE team_id = NEW.home_team_id
      AND league_season_id = selected_league_season_id AND status = 'REGISTERED'
  ) THEN
    RAISE EXCEPTION 'The home team is not registered in the match league season';
  END IF;
  IF NEW.away_team_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM participation WHERE team_id = NEW.away_team_id
      AND league_season_id = selected_league_season_id AND status = 'REGISTERED'
  ) THEN
    RAISE EXCEPTION 'The away team is not registered in the match league season';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION preserve_match_public_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.match_public_id IS DISTINCT FROM OLD.match_public_id THEN
    RAISE EXCEPTION 'The public match identifier is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_preserve_match_public_id
BEFORE UPDATE OF match_public_id ON game_match
FOR EACH ROW EXECUTE FUNCTION preserve_match_public_id();

COMMIT;
