import type { ListStaffMembersParams } from "@lucarne/shared";

const staffKeys = {
  all: ["staff"] as const,
  details: () => [...staffKeys.all, "detail"] as const,
  detail: (staffMemberId: string) => [...staffKeys.details(), staffMemberId] as const,
  lists: () => [...staffKeys.all, "list"] as const,
  list: (params: ListStaffMembersParams) =>
    [...staffKeys.lists(), { ...params }] as const,
};

export { staffKeys };
