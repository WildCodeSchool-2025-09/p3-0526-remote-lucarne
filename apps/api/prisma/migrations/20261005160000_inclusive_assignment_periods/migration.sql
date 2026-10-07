BEGIN;
LOCK TABLE team_player, team_staff_member IN ACCESS EXCLUSIVE MODE;

-- Preserve the last day actually covered by the former [start, end) periods.
-- Short legacy periods cannot satisfy the newly validated strict date rule.
-- Refuse them, and staff overlaps, without silently repairing business history.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM team_player WHERE left_at IS NOT NULL AND left_at <= joined_at + 1)
     OR EXISTS (SELECT 1 FROM team_staff_member WHERE left_at IS NOT NULL AND left_at <= joined_at + 1) THEN
    RAISE EXCEPTION 'Assignment migration refused: legacy periods shorter than two days require an explicit business decision';
  END IF;
  IF EXISTS (
    SELECT 1 FROM team_staff_member a JOIN team_staff_member b
      ON a.staff_member_id = b.staff_member_id AND a.id < b.id
    WHERE daterange(a.joined_at, a.left_at, '[)') && daterange(b.joined_at, b.left_at, '[)')
  ) THEN
    RAISE EXCEPTION 'Assignment migration refused: overlapping staff periods require an explicit business decision';
  END IF;
END $$;

ALTER TABLE team_player DROP CONSTRAINT excl_team_player_assignment_period;
DROP INDEX uq_active_team_staff_member_per_staff_member;
UPDATE team_player SET left_at = left_at - 1 WHERE left_at IS NOT NULL;
UPDATE team_staff_member SET left_at = left_at - 1 WHERE left_at IS NOT NULL;
ALTER TABLE team_player DROP CONSTRAINT chk_team_player_dates;
ALTER TABLE team_staff_member DROP CONSTRAINT chk_team_staff_member_dates;
ALTER TABLE team_player ADD CONSTRAINT chk_team_player_dates CHECK (left_at IS NULL OR left_at > joined_at);
ALTER TABLE team_staff_member ADD CONSTRAINT chk_team_staff_member_dates CHECK (left_at IS NULL OR left_at > joined_at);
ALTER TABLE team_player ADD CONSTRAINT excl_team_player_assignment_period
  EXCLUDE USING gist (player_id WITH =, daterange(joined_at, left_at, '[]') WITH &&);
ALTER TABLE team_staff_member ADD CONSTRAINT excl_team_staff_member_assignment_period
  EXCLUDE USING gist (staff_member_id WITH =, daterange(joined_at, left_at, '[]') WITH &&);
COMMIT;
