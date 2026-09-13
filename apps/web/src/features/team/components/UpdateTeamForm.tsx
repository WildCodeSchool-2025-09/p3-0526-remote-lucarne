import { zodResolver } from "@hookform/resolvers/zod";
import type { Team } from "@lucarne/shared";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useUpdateTeam } from "../../../hooks/useUpdateTeam";
import { toUpdateTeamInput, updateTeamFormSchema } from "../../../schemas/team.schema";
import type { UpdateTeamFormValues } from "../../../schemas/team.schema";
import { AlertModal, Button, Checkbox, FormField, Input } from "../../../ui";

export function UpdateTeamForm({ team, canEditStatus, onCancel, onSuccess }: { team: Team; canEditStatus: boolean; onCancel: () => void; onSuccess: (team: Team) => void }) {
  const mutation = useUpdateTeam(team.id);
  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<UpdateTeamFormValues>({ defaultValues: { name: team.name, logoUrl: team.logoUrl ?? "", stadium: team.stadium ?? "", isActive: team.isActive }, resolver: zodResolver(updateTeamFormSchema) });
  useEffect(() => { reset({ name: team.name, logoUrl: team.logoUrl ?? "", stadium: team.stadium ?? "", isActive: team.isActive }); }, [reset, team]);
  const submit = handleSubmit((values) => mutation.mutate(toUpdateTeamInput(values, canEditStatus), { onSuccess: (updated) => { reset({ name: updated.name, logoUrl: updated.logoUrl ?? "", stadium: updated.stadium ?? "", isActive: updated.isActive }); onSuccess(updated); } }));
  return <form className="create-league-form" onSubmit={(event) => { void submit(event); }} noValidate><FormField label="Nom" htmlFor="update-team-name" error={errors.name?.message} required><Input id="update-team-name" {...register("name")} /></FormField><FormField label="URL du logo" htmlFor="update-team-logo" error={errors.logoUrl?.message}><Input id="update-team-logo" type="url" {...register("logoUrl")} /></FormField><FormField label="Stade" htmlFor="update-team-stadium" error={errors.stadium?.message}><Input id="update-team-stadium" {...register("stadium")} /></FormField>{canEditStatus ? <label><Checkbox {...register("isActive")} /> Équipe active</label> : null}{mutation.isError ? <AlertModal>Impossible de modifier l’équipe.</AlertModal> : null}<div className="create-league-form__actions"><Button type="button" variant="ghost" onClick={onCancel}>Annuler</Button><Button type="submit" disabled={!isDirty || mutation.isPending}>Enregistrer</Button></div></form>;
}
