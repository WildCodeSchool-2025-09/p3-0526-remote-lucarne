import { z } from "zod";
import { MAX_SEARCH_LENGTH } from "../constants/pagination";
import { publicLeagueNavigationItemSchema } from "./league.schema";

const publicListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  search: z.string().trim().max(MAX_SEARCH_LENGTH).optional(),
}).strict();
const publicTeamQuerySchema = publicListQuerySchema.extend({ leagueId: z.uuid().optional(), seasonId: z.uuid().optional() }).strict();
const publicPlayerQuerySchema = publicListQuerySchema.extend({ teamId: z.uuid().optional(), position: z.string().trim().min(1).max(50).optional() }).strict();
const publicTeamIdentitySchema = z.object({ id: z.uuid(), name: z.string(), logoUrl: z.string().nullable(), stadium: z.string().nullable() }).strict();
const publicSeasonIdentitySchema = z.object({ id: z.uuid(), name: z.string(), startDate: z.iso.date(), endDate: z.iso.date() }).strict();
const publicEditionSchema = z.object({ league: publicLeagueNavigationItemSchema, season: publicSeasonIdentitySchema, isCurrent: z.boolean() }).strict();
const publicTeamDetailSchema = publicTeamIdentitySchema.extend({ createdAt: z.iso.datetime(), editions: z.array(publicEditionSchema) }).strict();
const publicRosterPlayerSchema = z.object({
  id: z.uuid(), firstName: z.string(), lastName: z.string(), position: z.string().nullable(), pictureUrl: z.string().nullable(), shirtNumber: z.number().int().min(1).max(99).nullable(),
}).strict();
const publicRosterStaffSchema = z.object({
  id: z.uuid(), firstName: z.string(), lastName: z.string(), pictureUrl: z.string().nullable(), jobTitle: z.string(),
}).strict();
const publicTeamRosterSchema = z.object({ date: z.iso.date(), players: z.array(publicRosterPlayerSchema), staffMembers: z.array(publicRosterStaffSchema) }).strict();
const publicPlayerProfileSchema = publicRosterPlayerSchema.extend({ nationality: z.string().nullable(), team: publicTeamIdentitySchema }).strict();
const publicStaffProfileSchema = publicRosterStaffSchema.extend({ nationality: z.string(), team: publicTeamIdentitySchema }).strict();
const publicSeasonDetailSchema = publicSeasonIdentitySchema.extend({ editions: z.array(publicEditionSchema) }).strict();
const publicMatchdayIdentitySchema = z.object({
  id: z.uuid(), number: z.number().int(), name: z.string().nullable(), startDate: z.iso.date().nullable(), endDate: z.iso.date().nullable(),
}).strict();
const publicMatchdayDetailSchema = publicMatchdayIdentitySchema.extend({ league: publicLeagueNavigationItemSchema, season: publicSeasonIdentitySchema }).strict();
const publicPaginationSchema = z.object({ page: z.number().int().min(1), limit: z.number().int().min(1).max(50), total: z.number().int().min(0), totalPages: z.number().int().min(0) }).strict();
const publicTeamListResponseSchema = z.object({ data: z.array(publicTeamIdentitySchema), pagination: publicPaginationSchema }).strict();
const publicPlayerListResponseSchema = z.object({ data: z.array(publicPlayerProfileSchema), pagination: publicPaginationSchema }).strict();
const publicMatchdayListResponseSchema = z.array(publicMatchdayIdentitySchema);

export {
  publicPaginationSchema, publicListQuerySchema,
  publicTeamQuerySchema, publicPlayerQuerySchema, publicTeamIdentitySchema, publicSeasonIdentitySchema,
  publicEditionSchema, publicTeamDetailSchema, publicTeamRosterSchema, publicPlayerProfileSchema,
  publicStaffProfileSchema, publicSeasonDetailSchema, publicMatchdayIdentitySchema, publicMatchdayDetailSchema,
  publicTeamListResponseSchema, publicPlayerListResponseSchema, publicMatchdayListResponseSchema,
};
