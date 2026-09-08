CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- =========================================================
-- UTILISATEURS ET RÔLES
-- =========================================================

CREATE TABLE role (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,

    CONSTRAINT chk_role_name_not_blank
        CHECK (btrim(name) <> '')
);

CREATE TABLE app_user (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL,

    email CITEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_VERIFICATION',
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_user_role
        FOREIGN KEY (role_id)
        REFERENCES role(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_user_email_not_blank
        CHECK (btrim(email::TEXT) <> ''),

    CONSTRAINT chk_user_password_hash_not_blank
        CHECK (btrim(password_hash) <> ''),

    CONSTRAINT chk_user_first_name_not_blank
        CHECK (btrim(first_name) <> ''),

    CONSTRAINT chk_user_last_name_not_blank
        CHECK (btrim(last_name) <> ''),

    CONSTRAINT chk_user_status
        CHECK (status IN (
            'PENDING_VERIFICATION',
            'ACTIVE',
            'SUSPENDED',
            'DISABLED'
        ))
);

-- =========================================================
-- COMPÉTITIONS
-- =========================================================

CREATE TABLE league (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(150) NOT NULL,
    country VARCHAR(100) NOT NULL,
    logo_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_league_name_country
        UNIQUE (name, country),

    CONSTRAINT chk_league_name_not_blank
        CHECK (btrim(name) <> ''),

    CONSTRAINT chk_league_country_not_blank
        CHECK (btrim(country) <> '')
);

CREATE TABLE season (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id UUID NOT NULL,

    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_season_league
        FOREIGN KEY (league_id)
        REFERENCES league(id)
        ON DELETE RESTRICT,

    CONSTRAINT uq_season_league_name
        UNIQUE (league_id, name),

    CONSTRAINT chk_season_name_not_blank
        CHECK (btrim(name) <> ''),

    CONSTRAINT chk_season_dates
        CHECK (end_date >= start_date)
);

-- Une seule saison courante par ligue.
CREATE UNIQUE INDEX uq_active_season_per_league
    ON season(league_id)
    WHERE is_active = TRUE;

CREATE TABLE matchday (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID NOT NULL,

    number INTEGER NOT NULL,
    name VARCHAR(100),
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_matchday_season
        FOREIGN KEY (season_id)
        REFERENCES season(id)
        ON DELETE RESTRICT,

    CONSTRAINT uq_matchday_season_number
        UNIQUE (season_id, number),

    CONSTRAINT chk_matchday_number
        CHECK (number > 0),

    CONSTRAINT chk_matchday_name_not_blank
        CHECK (name IS NULL OR btrim(name) <> ''),

    CONSTRAINT chk_matchday_dates
        CHECK (
            end_date IS NULL
            OR start_date IS NULL
            OR end_date >= start_date
        )
);

-- =========================================================
-- ÉQUIPES, JOUEUSES ET STAFF
-- =========================================================

CREATE TABLE team (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(150) NOT NULL,
    logo_url TEXT,
    stadium VARCHAR(150),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_team_name_not_blank
        CHECK (btrim(name) <> ''),

    CONSTRAINT chk_team_stadium_not_blank
        CHECK (stadium IS NULL OR btrim(stadium) <> '')
);

CREATE TABLE player (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL,

    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    nationality VARCHAR(100),
    position VARCHAR(50),
    picture_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_player_team
        FOREIGN KEY (team_id)
        REFERENCES team(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_player_first_name_not_blank
        CHECK (btrim(first_name) <> ''),

    CONSTRAINT chk_player_last_name_not_blank
        CHECK (btrim(last_name) <> ''),

    CONSTRAINT chk_player_nationality_not_blank
        CHECK (nationality IS NULL OR btrim(nationality) <> ''),

    CONSTRAINT chk_player_position_not_blank
        CHECK (position IS NULL OR btrim(position) <> '')
);

CREATE TABLE staff_member (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL,

    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    nationality VARCHAR(100),
    job_title VARCHAR(100) NOT NULL,
    picture_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_staff_team
        FOREIGN KEY (team_id)
        REFERENCES team(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_staff_first_name_not_blank
        CHECK (btrim(first_name) <> ''),

    CONSTRAINT chk_staff_last_name_not_blank
        CHECK (btrim(last_name) <> ''),

    CONSTRAINT chk_staff_nationality_not_blank
        CHECK (nationality IS NULL OR btrim(nationality) <> ''),

    CONSTRAINT chk_staff_job_title_not_blank
        CHECK (btrim(job_title) <> '')
);

-- =========================================================
-- PARTICIPATION D’UNE ÉQUIPE À UNE SAISON
-- =========================================================

CREATE TABLE participation (
    team_id UUID NOT NULL,
    season_id UUID NOT NULL,

    registration_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    points INTEGER NOT NULL DEFAULT 0,
    rank INTEGER,
    status VARCHAR(30) NOT NULL DEFAULT 'REGISTERED',

    CONSTRAINT pk_participation
        PRIMARY KEY (team_id, season_id),

    CONSTRAINT fk_participation_team
        FOREIGN KEY (team_id)
        REFERENCES team(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_participation_season
        FOREIGN KEY (season_id)
        REFERENCES season(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_participation_points
        CHECK (points >= 0),

    CONSTRAINT chk_participation_rank
        CHECK (rank IS NULL OR rank > 0),

    CONSTRAINT chk_participation_status
        CHECK (status IN ('REGISTERED', 'WITHDRAWN'))
);

-- Une participation inscrite exige une équipe active et une saison existante.
CREATE OR REPLACE FUNCTION validate_registered_participation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'REGISTERED' THEN
        IF NOT EXISTS (
            SELECT 1
            FROM team
            WHERE id = NEW.team_id
              AND is_active = TRUE
        ) THEN
            RAISE EXCEPTION
                'The team must exist and be active before registration';
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM season
            WHERE id = NEW.season_id
        ) THEN
            RAISE EXCEPTION
                'The season must exist before registration';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_registered_participation
BEFORE INSERT OR UPDATE OF team_id, season_id, status
ON participation
FOR EACH ROW
EXECUTE FUNCTION validate_registered_participation();

-- =========================================================
-- MATCHS
-- =========================================================

CREATE TABLE game_match (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    matchday_id UUID NOT NULL,
    home_team_id UUID NOT NULL,
    away_team_id UUID NOT NULL,

    match_date DATE NOT NULL,
    start_time TIME NOT NULL,
    stadium VARCHAR(150),
    home_score INTEGER,
    away_score INTEGER,
    status VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_match_matchday
        FOREIGN KEY (matchday_id)
        REFERENCES matchday(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_match_home_team
        FOREIGN KEY (home_team_id)
        REFERENCES team(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_match_away_team
        FOREIGN KEY (away_team_id)
        REFERENCES team(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_different_teams
        CHECK (home_team_id <> away_team_id),

    CONSTRAINT chk_match_stadium_not_blank
        CHECK (stadium IS NULL OR btrim(stadium) <> ''),

    CONSTRAINT chk_home_score
        CHECK (home_score IS NULL OR home_score >= 0),

    CONSTRAINT chk_away_score
        CHECK (away_score IS NULL OR away_score >= 0),

    CONSTRAINT chk_match_status
        CHECK (status IN (
            'SCHEDULED',
            'IN_PROGRESS',
            'COMPLETED',
            'POSTPONED'
        )),

    CONSTRAINT chk_completed_match_score
        CHECK (
            status <> 'COMPLETED'
            OR (home_score IS NOT NULL AND away_score IS NOT NULL)
        )
);

-- Les équipes d’un match doivent être inscrites dans la saison de sa journée.
CREATE OR REPLACE FUNCTION validate_match_teams_participation()
RETURNS TRIGGER AS $$
DECLARE
    selected_season_id UUID;
BEGIN
    SELECT season_id
    INTO selected_season_id
    FROM matchday
    WHERE id = NEW.matchday_id;

    IF selected_season_id IS NULL THEN
        RAISE EXCEPTION 'The selected matchday does not exist';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM participation
        WHERE team_id = NEW.home_team_id
          AND season_id = selected_season_id
          AND status = 'REGISTERED'
    ) THEN
        RAISE EXCEPTION
            'The home team is not registered in the match season';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM participation
        WHERE team_id = NEW.away_team_id
          AND season_id = selected_season_id
          AND status = 'REGISTERED'
    ) THEN
        RAISE EXCEPTION
            'The away team is not registered in the match season';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_match_teams_participation
BEFORE INSERT OR UPDATE OF matchday_id, home_team_id, away_team_id
ON game_match
FOR EACH ROW
EXECUTE FUNCTION validate_match_teams_participation();

CREATE TABLE match_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    match_id UUID NOT NULL,
    player_id UUID NOT NULL,

    event_type VARCHAR(50) NOT NULL DEFAULT 'GOAL',
    minute INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_event_match
        FOREIGN KEY (match_id)
        REFERENCES game_match(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_event_player
        FOREIGN KEY (player_id)
        REFERENCES player(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_match_event_type
        CHECK (event_type = 'GOAL'),

    CONSTRAINT chk_event_minute
        CHECK (minute >= 0)
);

-- =========================================================
-- INDEX DES CLÉS ÉTRANGÈRES ET DES FILTRES PRINCIPAUX
-- =========================================================

CREATE INDEX idx_user_role
    ON app_user(role_id);

CREATE INDEX idx_season_league
    ON season(league_id);

CREATE INDEX idx_matchday_season
    ON matchday(season_id);

CREATE INDEX idx_player_team
    ON player(team_id);

CREATE INDEX idx_staff_team
    ON staff_member(team_id);

CREATE INDEX idx_participation_season
    ON participation(season_id);

CREATE INDEX idx_participation_season_status
    ON participation(season_id, status);

CREATE INDEX idx_match_matchday
    ON game_match(matchday_id);

CREATE INDEX idx_match_home_team
    ON game_match(home_team_id);

CREATE INDEX idx_match_away_team
    ON game_match(away_team_id);

CREATE INDEX idx_match_date
    ON game_match(match_date);

CREATE INDEX idx_match_status
    ON game_match(status);

CREATE INDEX idx_event_match
    ON match_event(match_id);

CREATE INDEX idx_event_player
    ON match_event(player_id);
