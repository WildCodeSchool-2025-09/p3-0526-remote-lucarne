import { useQuery } from "@tanstack/react-query";
import { getPublicStaffMember } from "../../services/publicStaff.service";
import { staffKeys } from "./staffKeys";

export const usePublicStaffMember = (id: string) => useQuery({ queryKey: [...staffKeys.detail(id), "public"], queryFn: () => getPublicStaffMember(id) });
