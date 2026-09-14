CREATE TABLE team_staff_member (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES team(id) ON DELETE RESTRICT,
    staff_member_id UUID NOT NULL REFERENCES staff_member(id) ON DELETE RESTRICT,
    job_title VARCHAR(100) NOT NULL,
    joined_at DATE NOT NULL,
    left_at DATE,
    CONSTRAINT chk_team_staff_member_job_title_not_blank CHECK (btrim(job_title) <> ''),
    CONSTRAINT chk_team_staff_member_dates CHECK (left_at IS NULL OR left_at >= joined_at)
);

CREATE INDEX idx_team_staff_member_team ON team_staff_member(team_id);
CREATE INDEX idx_team_staff_member_staff_member ON team_staff_member(staff_member_id);
CREATE UNIQUE INDEX uq_active_team_staff_member_per_staff_member
    ON team_staff_member(staff_member_id) WHERE left_at IS NULL;

-- One atomic statement: the direct relation remains available if backfill fails.
DO $migration$
BEGIN
    LOCK TABLE staff_member, team_staff_member IN ACCESS EXCLUSIVE MODE;

    INSERT INTO team_staff_member (team_id, staff_member_id, job_title, joined_at)
    SELECT team_id, id, job_title, (created_at AT TIME ZONE 'UTC')::date
    FROM staff_member;

    IF EXISTS (
        SELECT 1
        FROM staff_member staff
        WHERE NOT EXISTS (
            SELECT 1
            FROM team_staff_member assignment
            WHERE assignment.staff_member_id = staff.id
        )
    ) THEN
        RAISE EXCEPTION 'Staff member assignment backfill is incomplete; no column was removed.';
    END IF;

    -- Dropping these columns removes the obsolete FK, check constraint and index.
    ALTER TABLE staff_member DROP COLUMN team_id, DROP COLUMN job_title;
END
$migration$;
