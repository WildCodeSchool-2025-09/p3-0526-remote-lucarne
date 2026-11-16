import type { z } from "zod";
import type {
  publicTeamQuerySchema, publicPlayerQuerySchema, publicTeamIdentitySchema, publicSeasonIdentitySchema,
  publicEditionSchema, publicTeamDetailSchema, publicTeamRosterSchema, publicPlayerProfileSchema,
  publicStaffProfileSchema, publicSeasonDetailSchema, publicMatchdayIdentitySchema, publicMatchdayDetailSchema,
  publicTeamListResponseSchema, publicPlayerListResponseSchema,
} from "../schemas/publicPortal.schema";

export type PublicTeamQuery = z.infer<typeof publicTeamQuerySchema>;
export type PublicPlayerQuery = z.infer<typeof publicPlayerQuerySchema>;
export type PublicTeamIdentity = z.infer<typeof publicTeamIdentitySchema>;
export type PublicSeasonIdentity = z.infer<typeof publicSeasonIdentitySchema>;
export type PublicEdition = z.infer<typeof publicEditionSchema>;
export type PublicTeamDetail = z.infer<typeof publicTeamDetailSchema>;
export type PublicTeamRoster = z.infer<typeof publicTeamRosterSchema>;
export type PublicPlayerProfile = z.infer<typeof publicPlayerProfileSchema>;
export type PublicStaffProfile = z.infer<typeof publicStaffProfileSchema>;
export type PublicSeasonDetail = z.infer<typeof publicSeasonDetailSchema>;
export type PublicMatchdayIdentity = z.infer<typeof publicMatchdayIdentitySchema>;
export type PublicMatchdayDetail = z.infer<typeof publicMatchdayDetailSchema>;
export type PublicTeamListResponse = z.infer<typeof publicTeamListResponseSchema>;
export type PublicPlayerListResponse = z.infer<typeof publicPlayerListResponseSchema>;
