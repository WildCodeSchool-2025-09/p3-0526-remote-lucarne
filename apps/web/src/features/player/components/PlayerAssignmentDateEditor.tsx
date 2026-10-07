import { AssignmentDateForm } from "../../../components/assignments/AssignmentDateForm";
import { useUpdatePlayerAssignment } from "../../../hooks/usePlayer";

type PlayerAssignmentDateEditorProps = {
  playerId: string;
  assignment: { id: string; joinedAt: string; leftAt: string | null };
  onClose: () => void;
};

function PlayerAssignmentDateEditor({
  playerId,
  assignment,
  onClose,
}: PlayerAssignmentDateEditorProps) {
  const mutation = useUpdatePlayerAssignment();

  return (
    <AssignmentDateForm
      assignment={assignment}
      pending={mutation.isPending}
      onClose={onClose}
      onSubmit={(input) =>
        mutation.mutateAsync({ id: playerId, assignmentId: assignment.id, input })
      }
    />
  );
}

export { PlayerAssignmentDateEditor };
