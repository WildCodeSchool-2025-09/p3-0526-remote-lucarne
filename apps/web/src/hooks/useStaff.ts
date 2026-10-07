import { teamKeys } from "../features/team/teamKeys";
import { updateStaffAssignment } from "../services/staff.service";
import type {
  UpdateStaffAssignmentInput,
  CreateStaffAssignmentInput,
  CreateStaffMemberInput,
  ListStaffMembersParams,
  StaffMemberDetail,
  UpdateStaffMemberInput,
} from "@lucarne/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  activateStaffMember,
  createStaffAssignment,
  createStaffMember,
  deactivateStaffMember,
  deleteStaffMember,
  getStaffMember,
  listStaffMembers,
  updateStaffMember,
} from "../services/staff.service";
import { staffKeys } from "../features/staff/staffKeys";

export const useStaffMemberList = (params: ListStaffMembersParams) => useQuery({
  queryKey: staffKeys.list(params),
  queryFn: () => listStaffMembers(params),
  retry: false,
});

export const useStaffMemberDetail = (id: string) => useQuery({
  queryKey: staffKeys.detail(id),
  queryFn: () => getStaffMember(id),
  enabled: id !== "",
  retry: false,
});

const useStaffMutation = <TVariables>(mutationFn: (variables: TVariables) => Promise<StaffMemberDetail>) => {
  const queryClient = useQueryClient();

  return useMutation<StaffMemberDetail, Error, TVariables>({
    mutationFn,
    onSuccess: async (staffMember) => {
      queryClient.setQueryData(staffKeys.detail(staffMember.id), staffMember);
      await queryClient.invalidateQueries({ queryKey: staffKeys.lists() });
      await queryClient.invalidateQueries({ queryKey: teamKeys.rosters() });
    },
    retry: false,
  });
};

export const useCreateStaffMember = () => useStaffMutation<CreateStaffMemberInput>(createStaffMember);

export const useCreateStaffAssignment = () =>
  useStaffMutation<{ id: string; input: CreateStaffAssignmentInput }>(
    ({ id, input }) => createStaffAssignment(id, input),
  );

export const useUpdateStaffMember = () =>
  useStaffMutation<{ id: string; input: UpdateStaffMemberInput }>(
    ({ id, input }) => updateStaffMember(id, input),
  );

export const useActivateStaffMember = () => useStaffMutation<string>(activateStaffMember);

export const useDeactivateStaffMember = () => useStaffMutation<string>(deactivateStaffMember);

export const useDeleteStaffMember = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: deleteStaffMember,
    onSuccess: async (_, id) => {
      queryClient.removeQueries({ queryKey: staffKeys.detail(id) });
      await queryClient.invalidateQueries({ queryKey: staffKeys.lists() });
      await queryClient.invalidateQueries({ queryKey: teamKeys.rosters() });
    },
    retry: false,
  });
};

export const useUpdateStaffAssignment = () =>
  useStaffMutation<{ id: string; assignmentId: string; input: UpdateStaffAssignmentInput }>(
    ({ id, assignmentId, input }) => updateStaffAssignment(id, assignmentId, input),
  );
