ALTER TABLE player ALTER COLUMN team_id DROP NOT NULL;
ALTER TABLE player ADD COLUMN birthday DATE;
ALTER TABLE player ADD COLUMN version INTEGER NOT NULL DEFAULT 0;
CREATE INDEX idx_player_name ON player(last_name, first_name);

CREATE TABLE team_player (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES team(id) ON DELETE RESTRICT,
    player_id UUID NOT NULL REFERENCES player(id) ON DELETE RESTRICT,
    joined_at DATE NOT NULL,
    left_at DATE,
    shirt_number INTEGER,
    CONSTRAINT chk_team_player_dates CHECK (left_at IS NULL OR left_at >= joined_at),
    CONSTRAINT chk_team_player_shirt_number CHECK (shirt_number IS NULL OR (shirt_number BETWEEN 1 AND 99))
);
CREATE INDEX idx_team_player_team ON team_player(team_id);
CREATE INDEX idx_team_player_player ON team_player(player_id);
CREATE UNIQUE INDEX uq_active_team_player_per_player ON team_player(player_id) WHERE left_at IS NULL;
INSERT INTO team_player (team_id, player_id, joined_at)
SELECT team_id, id, created_at::date FROM player WHERE team_id IS NOT NULL;
