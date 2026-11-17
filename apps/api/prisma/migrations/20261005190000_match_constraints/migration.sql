BEGIN;
LOCK TABLE game_match, matchday IN ACCESS EXCLUSIVE MODE;

-- Derived reservations give one unique key for both home and away appearances.
-- A unique index also arbitrates writers with stale transaction snapshots.
CREATE TABLE match_team_reservation (
  matchday_id UUID NOT NULL REFERENCES matchday(id) ON DELETE RESTRICT,
  team_id UUID NOT NULL REFERENCES team(id) ON DELETE RESTRICT,
  match_id UUID NOT NULL REFERENCES game_match(id) ON DELETE CASCADE,
  CONSTRAINT pk_match_team_reservation PRIMARY KEY (matchday_id, team_id)
);
CREATE INDEX idx_match_team_reservation_match ON match_team_reservation(match_id);

-- Fail atomically if conflicting data was written since the previous migration.
INSERT INTO match_team_reservation(matchday_id, team_id, match_id)
SELECT matchday_id, team_id, id FROM game_match
CROSS JOIN LATERAL unnest(ARRAY[home_team_id, away_team_id]) AS teams(team_id)
WHERE is_active AND team_id IS NOT NULL;

CREATE FUNCTION sync_match_team_reservations()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM match_team_reservation WHERE match_id = NEW.id;
  IF NEW.is_active THEN
    INSERT INTO match_team_reservation(matchday_id, team_id, match_id)
    SELECT NEW.matchday_id, team_id, NEW.id
    FROM unnest(ARRAY[NEW.home_team_id, NEW.away_team_id]) AS teams(team_id)
    WHERE team_id IS NOT NULL ORDER BY team_id;
  END IF;
  RETURN NEW;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION USING ERRCODE = 'LM001', MESSAGE = 'A team already has a match in this matchday';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_match_team_reservations
AFTER INSERT OR UPDATE OF matchday_id, home_team_id, away_team_id, is_active ON game_match
FOR EACH ROW EXECUTE FUNCTION sync_match_team_reservations();

CREATE OR REPLACE FUNCTION validate_match_teams_participation()
RETURNS TRIGGER AS $$
DECLARE
  selected_league_season_id UUID;
BEGIN
  SELECT league_season_id INTO selected_league_season_id FROM matchday WHERE id = NEW.matchday_id;
  IF selected_league_season_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'LM007', MESSAGE = 'The selected matchday does not exist';
  END IF;
  IF NEW.home_team_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM participation WHERE team_id = NEW.home_team_id
    AND league_season_id = selected_league_season_id AND status = 'REGISTERED'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'LM002', MESSAGE = 'The home team is not registered in the match league season';
  END IF;
  IF NEW.away_team_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM participation WHERE team_id = NEW.away_team_id
    AND league_season_id = selected_league_season_id AND status = 'REGISTERED'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'LM002', MESSAGE = 'The away team is not registered in the match league season';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Validate registration on publication/reactivation as well as assignment.
-- Do not revalidate withdrawn teams for a score or programming-only correction.
DROP TRIGGER trg_validate_match_teams_participation ON game_match;
CREATE TRIGGER trg_validate_match_teams_participation
BEFORE INSERT OR UPDATE OF matchday_id, home_team_id, away_team_id, is_published, is_active ON game_match
FOR EACH ROW WHEN (NEW.is_active)
EXECUTE FUNCTION validate_match_teams_participation();

CREATE FUNCTION validate_match_rules()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.matchday_id IS DISTINCT FROM OLD.matchday_id AND
    (SELECT league_season_id FROM matchday WHERE id = NEW.matchday_id) IS DISTINCT FROM
    (SELECT league_season_id FROM matchday WHERE id = OLD.matchday_id) THEN
    IF NOT EXISTS (SELECT 1 FROM matchday WHERE id = NEW.matchday_id) THEN
      RAISE EXCEPTION USING ERRCODE = 'LM007', MESSAGE = 'The selected matchday does not exist';
    END IF;
    RAISE EXCEPTION USING ERRCODE = 'LM003', MESSAGE = 'A match cannot move to another league season';
  END IF;
  IF NEW.is_published AND (NEW.home_team_id IS NULL OR NEW.away_team_id IS NULL OR NEW.match_date IS NULL OR NEW.start_time IS NULL) THEN
    RAISE EXCEPTION USING ERRCODE = 'LM004', MESSAGE = 'A published match requires teams, date and time';
  END IF;
  IF NEW.status = 'COMPLETED' AND (NEW.home_score IS NULL OR NEW.away_score IS NULL) THEN
    RAISE EXCEPTION USING ERRCODE = 'LM005', MESSAGE = 'A completed match requires both scores';
  END IF;
  IF NEW.home_team_id = NEW.away_team_id
     OR NEW.status NOT IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED')
     OR (NOT NEW.is_published AND (NEW.status <> 'SCHEDULED' OR NEW.home_score IS NOT NULL OR NEW.away_score IS NOT NULL))
     OR NEW.home_score < 0 OR NEW.away_score < 0 OR NEW.version < 0
     OR (NEW.start_time IS NOT NULL AND (NEW.start_time >= TIME '24:00' OR EXTRACT(SECOND FROM NEW.start_time) <> 0))
     OR (NEW.stadium IS NOT NULL AND btrim(NEW.stadium) = '') THEN
    RAISE EXCEPTION USING ERRCODE = 'LM006', MESSAGE = 'Invalid match fields';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_validate_match_rules
BEFORE INSERT OR UPDATE ON game_match
FOR EACH ROW EXECUTE FUNCTION validate_match_rules();

-- Changing the parent edition must not indirectly move existing matches.
CREATE FUNCTION preserve_matchday_match_edition()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.league_season_id IS DISTINCT FROM OLD.league_season_id AND EXISTS (
    SELECT 1 FROM game_match WHERE matchday_id = OLD.id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'LM003', MESSAGE = 'A matchday with matches cannot move to another league season';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_preserve_matchday_match_edition
BEFORE UPDATE OF league_season_id ON matchday
FOR EACH ROW EXECUTE FUNCTION preserve_matchday_match_edition();
COMMIT;
