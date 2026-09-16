import { zodResolver } from "@hookform/resolvers/zod";
import type { Season } from "@lucarne/shared";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { UpdateSeasonFormData, UpdateSeasonFormValues } from "../../../schemas/season.schema";
import { toUpdateSeasonInput, updateSeasonFormSchema } from "../../../schemas/season.schema";
import { useUpdateSeason } from "../hooks/useUpdateSeason";
import { AlertModal, Button, FormField, Input } from "../../../ui";

interface UpdateSeasonFormProps {
  onCancel: () => void;
  onReload: () => void;
  onSuccess: (season: Season) => void;
  season: Season;
}

function UpdateSeasonForm({ onCancel, onReload, onSuccess, season }: UpdateSeasonFormProps) {
  const mutation = useUpdateSeason(season.id);
  const { formState: { dirtyFields, errors, isDirty }, handleSubmit, register, reset, setError } = useForm<UpdateSeasonFormValues, undefined, UpdateSeasonFormData>({
    defaultValues: { name: season.name, startDate: season.startDate, endDate: season.endDate, version: season.version },
    resolver: zodResolver(updateSeasonFormSchema),
  });

  useEffect(() => { reset({ name: season.name, startDate: season.startDate, endDate: season.endDate, version: season.version }); }, [reset, season]);
  useEffect(() => { for (const detail of mutation.error?.details ?? []) { if (detail.field === "name" || detail.field === "startDate" || detail.field === "endDate") setError(detail.field, { message: detail.message }); } }, [mutation.error, setError]);

  const onSubmit = (values: UpdateSeasonFormData) => mutation.mutate(toUpdateSeasonInput(values, dirtyFields), { onSuccess: (updated) => { reset({ name: updated.name, startDate: updated.startDate, endDate: updated.endDate, version: updated.version }); onSuccess(updated); } });
  const isVersionConflict = mutation.error?.code === "RESOURCE_VERSION_CONFLICT";

  return (
    <form className="create-league-form update-league-form" noValidate onSubmit={(event) => { mutation.reset(); void handleSubmit(onSubmit)(event); }}>
      <header className="create-league-form__header"><h2 className="create-league-form__title">Modifier la saison</h2><p className="create-league-form__description">Corrigez les informations sans rendre le calendrier incohérent.</p></header>
      <div className="create-league-form__fields">
        <FormField error={errors.name?.message} htmlFor="update-season-name" label="Nom" required><Input id="update-season-name" hasError={errors.name != null} {...register("name")} /></FormField>
        <FormField error={errors.startDate?.message} htmlFor="update-season-start-date" label="Date de début" required><Input id="update-season-start-date" hasError={errors.startDate != null} type="date" {...register("startDate")} /></FormField>
        <FormField error={errors.endDate?.message} htmlFor="update-season-end-date" label="Date de fin" required><Input id="update-season-end-date" hasError={errors.endDate != null} type="date" {...register("endDate")} /></FormField>
      </div>
      {isVersionConflict ? <AlertModal variant="danger">Cette saison a été modifiée par un autre utilisateur. Rechargez les données avant de réessayer.<Button onClick={() => { mutation.reset(); onReload(); }} variant="outline">Recharger les données</Button></AlertModal> : null}
      {mutation.isError && !isVersionConflict ? <AlertModal variant="danger">{mutation.error.message}</AlertModal> : null}
      <div className="create-league-form__actions"><Button disabled={mutation.isPending} onClick={onCancel} variant="ghost">Annuler</Button><Button disabled={mutation.isPending || !isDirty} type="submit">{mutation.isPending ? "Enregistrement…" : "Enregistrer"}</Button></div>
    </form>
  );
}

export { UpdateSeasonForm };
