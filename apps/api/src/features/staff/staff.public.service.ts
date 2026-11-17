import { AppError } from "../../errors/AppError";
import { assignmentDate } from "../../utils/assignmentPeriod";
import { findPublicStaff } from "./staff.public.repository";

export async function getPublicStaffService(id: string) {
  const staff = await findPublicStaff(id, assignmentDate());
  if (!staff) throw new AppError(404, "RESOURCE_NOT_FOUND", "Membre de l’encadrement introuvable.");
  return staff;
}
