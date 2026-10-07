import { getAccessToken } from "../lib/authToken";

const APP_ROLES = {
  ADMIN: "ADMIN",
  MODERATOR: "MODERATOR",
  EDITOR: "EDITOR",
  USER: "USER",
} as const;

type AppRole = (typeof APP_ROLES)[keyof typeof APP_ROLES];

const DASHBOARD_ROLES = [APP_ROLES.ADMIN, APP_ROLES.MODERATOR, APP_ROLES.EDITOR, APP_ROLES.USER] as const;

const CREATE_LEAGUE_ROLES = [APP_ROLES.ADMIN, APP_ROLES.MODERATOR, APP_ROLES.EDITOR] as const;
const TEAM_CREATE_ROLES = [APP_ROLES.ADMIN, APP_ROLES.MODERATOR, APP_ROLES.EDITOR] as const;
const TEAM_EDIT_ROLES = TEAM_CREATE_ROLES;
const VIEW_LEAGUE_ROLES = [APP_ROLES.ADMIN, APP_ROLES.MODERATOR, APP_ROLES.EDITOR] as const;
const PLAYER_WRITE_ROLES = VIEW_LEAGUE_ROLES;
const SEASON_VIEW_ROLES = VIEW_LEAGUE_ROLES;
const SEASON_CREATE_ROLES = VIEW_LEAGUE_ROLES;
const SEASON_UPDATE_ROLES = [APP_ROLES.ADMIN, APP_ROLES.EDITOR] as const;
const SEASON_MANAGE_ROLES = SEASON_VIEW_ROLES;
const SEASON_CURRENT_ROLES = [APP_ROLES.ADMIN] as const;
const MATCH_VIEW_ROLES = VIEW_LEAGUE_ROLES;
const MATCH_WRITE_ROLES = [APP_ROLES.ADMIN] as const;

interface AccessTokenPayload {
  role: AppRole;
}

function isAppRole(value: string): value is AppRole {
  return Object.values(APP_ROLES).includes(value as AppRole);
}

function decodeBase64Url(value: string): string | null {
  try {
    const normalizedValue = value.replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (normalizedValue.length % 4)) % 4);

    return atob(`${normalizedValue}${padding}`);
  } catch {
    return null;
  }
}

function decodeAccessToken(token: string): AccessTokenPayload | null {
  const segments = token.split(".");

  if (segments.length !== 3) {
    return null;
  }

  const payloadText = decodeBase64Url(segments[1]);

  if (payloadText == null) {
    return null;
  }

  try {
    const payload: unknown = JSON.parse(payloadText);

    if (typeof payload !== "object" || payload == null || !("role" in payload)) {
      return null;
    }

    const role = payload.role;

    if (typeof role !== "string" || !isAppRole(role)) {
      return null;
    }

    if ("exp" in payload) {
      if (typeof payload.exp !== "number" || payload.exp <= Math.floor(Date.now() / 1000)) {
        return null;
      }
    }

    return { role };
  } catch {
    return null;
  }
}

function getCurrentAppRole(): AppRole | null {
  const accessToken = getAccessToken();

  if (accessToken == null) {
    return null;
  }

  return decodeAccessToken(accessToken)?.role ?? null;
}

function hasRole(role: AppRole | null, allowedRoles: readonly AppRole[]): boolean {
  return role != null && allowedRoles.includes(role);
}

function canCreateLeague(role: AppRole | null): boolean {
  return hasRole(role, CREATE_LEAGUE_ROLES);
}

function canViewLeague(role: AppRole | null): boolean {
  return hasRole(role, VIEW_LEAGUE_ROLES);
}

function canDeleteLeague(role: AppRole | null): boolean {
  return role === APP_ROLES.ADMIN;
}

export {
  APP_ROLES,
  MATCH_VIEW_ROLES,
  MATCH_WRITE_ROLES,
  CREATE_LEAGUE_ROLES,
  DASHBOARD_ROLES,
  TEAM_CREATE_ROLES,
  TEAM_EDIT_ROLES,
  PLAYER_WRITE_ROLES,
  SEASON_CREATE_ROLES,
  SEASON_CURRENT_ROLES,
  SEASON_UPDATE_ROLES,
  SEASON_MANAGE_ROLES,
  SEASON_VIEW_ROLES,
  VIEW_LEAGUE_ROLES,
  canDeleteLeague,
  canCreateLeague,
  canViewLeague,
  decodeAccessToken,
  getCurrentAppRole,
  hasRole,
  isAppRole,
};
export type { AccessTokenPayload, AppRole };
