BEGIN;

-- Accept the repository's legacy model or the complete, previously deployed
-- model. Never guess how to migrate an intermediate structure.
LOCK TABLE season, matchday, participation, game_match IN ACCESS EXCLUSIVE MODE;

DO $$
DECLARE
    legacy BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'season'
          AND column_name = 'league_id'
    ) INTO legacy;

    IF legacy THEN
        IF to_regclass('league_season') IS NOT NULL
           OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'season' AND column_name = 'is_active')
           OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'matchday' AND column_name = 'season_id')
           OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'participation' AND column_name = 'season_id')
        THEN
            RAISE EXCEPTION 'Unsupported intermediate season structure; reconciliation aborted';
        END IF;

        IF EXISTS (
            SELECT name FROM season GROUP BY name
            HAVING count(DISTINCT (start_date, end_date)) > 1
        ) THEN
            RAISE EXCEPTION 'Seasons with the same name have conflicting dates; resolve them before migration';
        END IF;

        -- Keep the oldest season ID (UUID breaks ties). Each original season ID
        -- becomes an edition ID, so sporting records never cross league boundaries.
        CREATE TEMP TABLE season_reconciliation_map ON COMMIT DROP AS
        SELECT id AS old_id,
               first_value(id) OVER (PARTITION BY name ORDER BY created_at, id) AS canonical_id,
               count(*) OVER (PARTITION BY name) AS copies,
               max(version) OVER (PARTITION BY name) AS max_version
        FROM season;

        CREATE TABLE league_season (
            id UUID NOT NULL DEFAULT gen_random_uuid(),
            league_id UUID NOT NULL,
            season_id UUID NOT NULL,
            is_current BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT pk_league_season PRIMARY KEY (id),
            CONSTRAINT fk_league_season_league FOREIGN KEY (league_id) REFERENCES league(id) ON DELETE RESTRICT,
            CONSTRAINT fk_league_season_season FOREIGN KEY (season_id) REFERENCES season(id) ON DELETE RESTRICT,
            CONSTRAINT uq_league_season_pair UNIQUE (league_id, season_id)
        );
        INSERT INTO league_season (id, league_id, season_id, is_current, created_at)
        SELECT s.id, s.league_id, m.canonical_id, s.is_active, s.created_at
        FROM season s JOIN season_reconciliation_map m ON m.old_id = s.id;

        DROP TRIGGER trg_validate_registered_participation ON participation;

        ALTER TABLE matchday DROP CONSTRAINT fk_matchday_season;
        ALTER TABLE matchday RENAME COLUMN season_id TO league_season_id;
        ALTER TABLE matchday RENAME CONSTRAINT uq_matchday_season_number TO uq_matchday_league_season_number;
        ALTER INDEX idx_matchday_season RENAME TO idx_matchday_league_season;
        ALTER TABLE matchday ADD CONSTRAINT fk_matchday_league_season
            FOREIGN KEY (league_season_id) REFERENCES league_season(id) ON DELETE RESTRICT;

        ALTER TABLE participation DROP CONSTRAINT fk_participation_season;
        ALTER TABLE participation RENAME COLUMN season_id TO league_season_id;
        ALTER INDEX idx_participation_season RENAME TO idx_participation_league_season;
        ALTER INDEX idx_participation_season_status RENAME TO idx_participation_league_season_status;
        ALTER TABLE participation ADD CONSTRAINT fk_participation_league_season
            FOREIGN KEY (league_season_id) REFERENCES league_season(id) ON DELETE RESTRICT;

        UPDATE season s SET version = m.max_version + 1
        FROM season_reconciliation_map m
        WHERE s.id = m.old_id AND m.old_id = m.canonical_id AND m.copies > 1;
        DELETE FROM season s USING season_reconciliation_map m
        WHERE s.id = m.old_id AND m.old_id <> m.canonical_id;

        ALTER TABLE season DROP COLUMN league_id;
        ALTER TABLE season DROP COLUMN is_active;
        CREATE UNIQUE INDEX uq_season_name ON season(name);
        CREATE UNIQUE INDEX uq_current_season_per_league ON league_season(league_id) WHERE is_current = TRUE;
        CREATE INDEX idx_league_season_season ON league_season(season_id);
    ELSE
        IF to_regclass('league_season') IS NULL THEN
            RAISE EXCEPTION 'Missing league_season table; reconciliation aborted';
        END IF;
        LOCK TABLE league_season IN ACCESS EXCLUSIVE MODE;
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = current_schema()
              AND ((table_name = 'season' AND column_name = 'is_active')
                OR (table_name IN ('matchday', 'participation') AND column_name = 'season_id'))
        ) THEN
            RAISE EXCEPTION 'Unsupported intermediate season structure; reconciliation aborted';
        END IF;
    END IF;
END;
$$;

-- Verify both paths against the same structural contract before accepting them.
DO $$
DECLARE
    expected RECORD;
BEGIN
    FOR expected IN SELECT * FROM (VALUES
        ('season', 'id', 'uuid'), ('season', 'name', 'character varying'),
        ('season', 'start_date', 'date'), ('season', 'end_date', 'date'),
        ('season', 'version', 'integer'), ('season', 'created_at', 'timestamp with time zone'),
        ('league_season', 'id', 'uuid'), ('league_season', 'league_id', 'uuid'),
        ('league_season', 'season_id', 'uuid'), ('league_season', 'is_current', 'boolean'),
        ('league_season', 'created_at', 'timestamp with time zone'),
        ('matchday', 'league_season_id', 'uuid'), ('participation', 'league_season_id', 'uuid')
    ) AS required(table_name, column_name, data_type)
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns c
            WHERE c.table_schema = current_schema() AND c.table_name = expected.table_name
              AND c.column_name = expected.column_name AND c.data_type = expected.data_type
              AND c.is_nullable = 'NO'
        ) THEN
            RAISE EXCEPTION 'Missing or incompatible column %.%', expected.table_name, expected.column_name;
        END IF;
    END LOOP;

    FOR expected IN SELECT * FROM (VALUES
        ('season', 'PRIMARY KEY (id)'),
        ('season', 'CHECK ((end_date >= start_date))'),
        ('league_season', 'PRIMARY KEY (id)'),
        ('league_season', 'UNIQUE (league_id, season_id)'),
        ('league_season', 'FOREIGN KEY (league_id) REFERENCES league(id) ON DELETE RESTRICT'),
        ('league_season', 'FOREIGN KEY (season_id) REFERENCES season(id) ON DELETE RESTRICT'),
        ('matchday', 'UNIQUE (league_season_id, number)'),
        ('matchday', 'FOREIGN KEY (league_season_id) REFERENCES league_season(id) ON DELETE RESTRICT'),
        ('participation', 'PRIMARY KEY (team_id, league_season_id)'),
        ('participation', 'FOREIGN KEY (league_season_id) REFERENCES league_season(id) ON DELETE RESTRICT')
    ) AS required(table_name, definition)
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint c
            WHERE c.conrelid = to_regclass(expected.table_name) AND c.convalidated
              AND pg_get_constraintdef(c.oid) = expected.definition
        ) THEN
            RAISE EXCEPTION 'Missing or incompatible constraint on %: %', expected.table_name, expected.definition;
        END IF;
    END LOOP;

    IF NOT EXISTS (
        SELECT 1 FROM pg_index i
        WHERE i.indrelid = 'season'::regclass AND i.indisunique AND i.indisvalid
          AND i.indnkeyatts = 1 AND i.indpred IS NULL
          AND pg_get_indexdef(i.indexrelid, 1, TRUE) = 'name'
    ) OR NOT EXISTS (
        SELECT 1 FROM pg_index i
        WHERE i.indrelid = 'league_season'::regclass AND i.indisunique AND i.indisvalid
          AND i.indnkeyatts = 1 AND pg_get_indexdef(i.indexrelid, 1, TRUE) = 'league_id'
          AND pg_get_expr(i.indpred, i.indrelid) = '(is_current = true)'
    ) THEN
        RAISE EXCEPTION 'Missing season-name or current-season uniqueness protection';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION validate_registered_participation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'REGISTERED' AND NOT EXISTS (
        SELECT 1 FROM team WHERE id = NEW.team_id AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'The team must exist and be active before registration';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_registered_participation ON participation;
CREATE TRIGGER trg_validate_registered_participation
BEFORE INSERT OR UPDATE OF team_id, league_season_id, status ON participation
FOR EACH ROW EXECUTE FUNCTION validate_registered_participation();

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
    IF NOT EXISTS (
        SELECT 1 FROM participation WHERE team_id = NEW.home_team_id
          AND league_season_id = selected_league_season_id AND status = 'REGISTERED'
    ) THEN
        RAISE EXCEPTION 'The home team is not registered in the match league season';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM participation WHERE team_id = NEW.away_team_id
          AND league_season_id = selected_league_season_id AND status = 'REGISTERED'
    ) THEN
        RAISE EXCEPTION 'The away team is not registered in the match league season';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_match_teams_participation ON game_match;
CREATE TRIGGER trg_validate_match_teams_participation
BEFORE INSERT OR UPDATE OF matchday_id, home_team_id, away_team_id ON game_match
FOR EACH ROW EXECUTE FUNCTION validate_match_teams_participation();

COMMIT;
