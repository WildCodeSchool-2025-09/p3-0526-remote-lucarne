import type { PublicSearchQuery, PublicSearchType } from "@lucarne/shared";
import prisma from "../../../database/prisma";
import { Prisma } from "../../generated/prisma/client";

// PostgreSQL 17 Unicode normalization, without installing an extension or changing the schema.
// https://www.postgresql.org/docs/17/functions-string.html
const normalized = (value: Prisma.Sql) => Prisma.sql`replace(replace(regexp_replace(lower(normalize(coalesce(${value}, ''), NFD)), '[̀-ͯ]', '', 'g'), 'œ', 'oe'), 'æ', 'ae')`;

function candidates(query: PublicSearchQuery, date: Date) {
  const leagueId = query.leagueId ?? null; const seasonId = query.seasonId ?? null; const teamId = query.teamId ?? null;
  const editionForTeam = (team: Prisma.Sql) => Prisma.sql`EXISTS (
    SELECT 1 FROM participation p JOIN league_season ls ON ls.id = p.league_season_id JOIN league l ON l.id = ls.league_id
    WHERE p.team_id = ${team} AND p.status = 'REGISTERED' AND l.is_active
      AND (${leagueId}::uuid IS NULL OR ls.league_id = ${leagueId}::uuid) AND (${seasonId}::uuid IS NULL OR ls.season_id = ${seasonId}::uuid)
  )`;
  return Prisma.sql`
    SELECT 'LEAGUE'::text AS type, l.id, l.name AS label, l.country AS description, l.logo_url AS picture_url, l.slug,
      NULL::date AS match_date, NULL::time AS start_time, NULL::text AS status, ARRAY[l.name, l.country] AS fields
    FROM league l WHERE l.is_active AND (${leagueId}::uuid IS NULL OR l.id = ${leagueId}::uuid)
      AND ((${seasonId}::uuid IS NULL AND ${teamId}::uuid IS NULL) OR EXISTS (
        SELECT 1 FROM league_season ls WHERE ls.league_id = l.id AND (${seasonId}::uuid IS NULL OR ls.season_id = ${seasonId}::uuid)
          AND (${teamId}::uuid IS NULL OR EXISTS (SELECT 1 FROM participation p JOIN team t ON t.id = p.team_id WHERE p.league_season_id = ls.id AND p.team_id = ${teamId}::uuid AND p.status = 'REGISTERED' AND t.is_active))
      ))
    UNION ALL
    SELECT 'TEAM', t.id, t.name, t.stadium, t.logo_url, NULL, NULL::date, NULL::time, NULL, ARRAY[t.name, t.stadium]
    FROM team t WHERE t.is_active AND (${teamId}::uuid IS NULL OR t.id = ${teamId}::uuid)
      AND ((${leagueId}::uuid IS NULL AND ${seasonId}::uuid IS NULL) OR ${editionForTeam(Prisma.sql`t.id`)})
    UNION ALL
    SELECT 'PLAYER', p.id, concat_ws(' ', p.first_name, p.last_name), concat_ws(' · ', p.position, current_team.name), p.picture_url, NULL, NULL::date, NULL::time, NULL,
      ARRAY[p.first_name, p.last_name, concat_ws(' ', p.first_name, p.last_name), p.nationality, p.position]
    FROM player p JOIN LATERAL (
      SELECT t.id, t.name FROM team_player tp JOIN team t ON t.id = tp.team_id
      WHERE tp.player_id = p.id AND tp.joined_at <= ${date}::date AND (tp.left_at IS NULL OR tp.left_at >= ${date}::date) AND t.is_active
      ORDER BY tp.joined_at DESC, tp.id ASC LIMIT 1
    ) current_team ON TRUE
    WHERE p.is_active AND (${teamId}::uuid IS NULL OR current_team.id = ${teamId}::uuid)
      AND ((${leagueId}::uuid IS NULL AND ${seasonId}::uuid IS NULL) OR ${editionForTeam(Prisma.sql`current_team.id`)})
    UNION ALL
    SELECT 'SEASON', s.id, s.name, visible_leagues.names, NULL, NULL, NULL::date, NULL::time, NULL, ARRAY[s.name, visible_leagues.names]
    FROM season s JOIN LATERAL (
      SELECT string_agg(l.name, ', ' ORDER BY l.name, l.id) AS names
      FROM league_season ls JOIN league l ON l.id = ls.league_id
      WHERE ls.season_id = s.id AND l.is_active AND (${leagueId}::uuid IS NULL OR ls.league_id = ${leagueId}::uuid)
        AND (${teamId}::uuid IS NULL OR EXISTS (SELECT 1 FROM participation p JOIN team t ON t.id = p.team_id WHERE p.league_season_id = ls.id AND p.team_id = ${teamId}::uuid AND p.status = 'REGISTERED' AND t.is_active))
    ) visible_leagues ON visible_leagues.names IS NOT NULL
    WHERE (${seasonId}::uuid IS NULL OR s.id = ${seasonId}::uuid)
    UNION ALL
    SELECT 'GAME_MATCH', gm.match_public_id, concat_ws(' – ', home.name, away.name), concat_ws(' · ', l.name, s.name), NULL, NULL, gm.match_date, gm.start_time, gm.status,
      ARRAY[home.name, away.name, concat_ws(' ', home.name, away.name), gm.stadium]
    FROM game_match gm JOIN matchday md ON md.id = gm.matchday_id JOIN league_season ls ON ls.id = md.league_season_id
      JOIN league l ON l.id = ls.league_id JOIN season s ON s.id = ls.season_id JOIN team home ON home.id = gm.home_team_id JOIN team away ON away.id = gm.away_team_id
    WHERE gm.is_active AND gm.is_published AND md.is_active AND l.is_active AND home.is_active AND away.is_active
      AND (${leagueId}::uuid IS NULL OR ls.league_id = ${leagueId}::uuid) AND (${seasonId}::uuid IS NULL OR ls.season_id = ${seasonId}::uuid)
      AND (${teamId}::uuid IS NULL OR gm.home_team_id = ${teamId}::uuid OR gm.away_team_id = ${teamId}::uuid)
      AND (${query.status ?? null}::text IS NULL OR gm.status = ${query.status ?? null})
      AND (${query.dateFrom ?? null}::date IS NULL OR gm.match_date >= ${query.dateFrom ?? null}::date)
      AND (${query.dateTo ?? null}::date IS NULL OR gm.match_date <= ${query.dateTo ?? null}::date)
  `;
}

export function searchPublicResources(query: PublicSearchQuery, date: Date) {
  const term = normalized(Prisma.sql`${query.q}`);
  const onlyMatches = Boolean(query.status || query.dateFrom || query.dateTo);
  const common = Prisma.sql`WITH candidates AS (${candidates(query, date)}), normalized AS (
    SELECT c.*, ${normalized(Prisma.sql`c.label`)} AS normalized_label,
      ARRAY(SELECT ${normalized(Prisma.sql`field`)} FROM unnest(c.fields) field) AS normalized_fields
    FROM candidates c WHERE (NOT ${onlyMatches} OR c.type = 'GAME_MATCH')
  ), matching AS (
    SELECT n.*, greatest(1, coalesce((SELECT max(CASE WHEN field = ${term} THEN 4 WHEN starts_with(field, ${term}) THEN 3
      WHEN strpos(' ' || regexp_replace(field, '[^[:alnum:]]+', ' ', 'g') || ' ', ' ' || regexp_replace(${term}, '[^[:alnum:]]+', ' ', 'g') || ' ') > 0 THEN 2 ELSE 1 END)
      FROM unnest(n.normalized_fields) field WHERE strpos(field, ${term}) > 0), 0)) AS relevance
    FROM normalized n WHERE NOT EXISTS (SELECT 1 FROM unnest(string_to_array(${term}, ' ')) word
      WHERE NOT EXISTS (SELECT 1 FROM unnest(n.normalized_fields) field WHERE strpos(field, word) > 0))
  )`;
  return prisma.$transaction(async (transaction) => {
    const rows = await transaction.$queryRaw<{ result: unknown }[]>(Prisma.sql`${common}
      SELECT jsonb_build_object('type', type, 'id', id, 'label', label, 'description', description, 'pictureUrl', picture_url)
        || CASE WHEN type = 'LEAGUE' THEN jsonb_build_object('slug', slug)
          WHEN type = 'GAME_MATCH' THEN jsonb_build_object('matchDate', to_char(match_date, 'YYYY-MM-DD'), 'startTime', to_char(start_time, 'HH24:MI'), 'status', status)
          ELSE '{}'::jsonb END AS result
      FROM matching WHERE (${query.type} = 'ALL' OR type = ${query.type})
      ORDER BY relevance DESC, type ASC, normalized_label COLLATE "C" ASC, id ASC, match_date ASC NULLS LAST, start_time ASC NULLS LAST
      LIMIT ${query.limit} OFFSET ${(query.page - 1) * query.limit}`);
    const counts = await transaction.$queryRaw<{ type: PublicSearchType; count: number }[]>(Prisma.sql`${common} SELECT type, count(*)::integer AS count FROM matching GROUP BY type`);
    return { data: rows.map((row) => row.result), counts };
  }, { isolationLevel: "RepeatableRead" });
}
