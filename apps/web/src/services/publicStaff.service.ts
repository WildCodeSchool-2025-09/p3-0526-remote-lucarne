import { publicStaffProfileSchema } from "@lucarne/shared";
import { httpClient } from "../lib/httpClient";

export const getPublicStaffMember = async (id: string) => publicStaffProfileSchema.parse(await httpClient.get<unknown>(`/public/staff-members/${encodeURIComponent(id)}`));
