import { AssignmentDateForm } from "../../../components/assignments/AssignmentDateForm";
import { useUpdateStaffAssignment } from "../../../hooks/useStaff";

type StaffAssignmentDateEditorProps = {
  personId: string;
  assignment: { id: string; joinedAt: string; leftAt: string | null };
  onClose: () => void;
};

function StaffAssignmentDateEditor({
  personId,
  assignment,
  onClose,
}: StaffAssignmentDateEditorProps) {
  const mutation = useUpdateStaffAssignment();

  return (
    <AssignmentDateForm
      assignment={assignment}
      pending={mutation.isPending}
      onClose={onClose}
      onSubmit={(input) =>
        mutation.mutateAsync({ id: personId, assignmentId: assignment.id, input })
      }
    />
  );
}

export { StaffAssignmentDateEditor };
