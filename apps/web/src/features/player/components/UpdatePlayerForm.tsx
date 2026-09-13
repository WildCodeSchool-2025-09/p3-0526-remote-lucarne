import { zodResolver } from "@hookform/resolvers/zod";
import type { Player, UpdatePlayerInput } from "@lucarne/shared";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useUpdatePlayer } from "../../../hooks/usePlayer";
import { Alert, Button, FormField, Input } from "../../../ui";

const playerFormSchema = z.object({
  firstName: z.string().trim().min(1, "Prénom requis").max(100),
  lastName: z.string().trim().min(1, "Nom requis").max(100),
  nationality: z.string(), position: z.string(),
  birthday: z.string().refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), "Date invalide"),
  pictureUrl: z.string().refine((value) => value === "" || /^https?:\/\//.test(value), "URL invalide"),
  version: z.number(),
});
type PlayerFormValues = z.infer<typeof playerFormSchema>;
const valuesOf = (player: Player): PlayerFormValues => ({ firstName: player.firstName, lastName: player.lastName, nationality: player.nationality ?? "", position: player.position ?? "", birthday: player.birthday ?? "", pictureUrl: player.pictureUrl ?? "", version: player.version });

function UpdatePlayerForm({ player, onCancel, onReload, onSuccess }: { player: Player; onCancel: () => void; onReload: () => void; onSuccess: (player: Player) => void }) {
  const mutation = useUpdatePlayer();
  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<PlayerFormValues>({ resolver: zodResolver(playerFormSchema), defaultValues: valuesOf(player) });
  useEffect(() => { reset(valuesOf(player)); }, [player, reset]);
  const submit = (values: PlayerFormValues) => {
    const input: UpdatePlayerInput = { firstName: values.firstName, lastName: values.lastName, nationality: values.nationality || null, position: values.position || null, birthday: values.birthday || null, pictureUrl: values.pictureUrl || null, version: values.version };
    mutation.mutate({ id: player.id, input }, { onSuccess: (updated) => { reset(valuesOf(updated)); onSuccess(updated); } });
  };
  const isVersionConflict = mutation.error instanceof Error && "code" in mutation.error && mutation.error.code === "RESOURCE_VERSION_CONFLICT";
  return <form className="create-team-form" noValidate onSubmit={(event) => { void handleSubmit(submit)(event); }}><div className="create-team-form__fields"><FormField error={errors.firstName?.message} htmlFor="update-player-first-name" label="Prénom" required><Input id="update-player-first-name" hasError={errors.firstName != null} {...register("firstName")} /></FormField><FormField error={errors.lastName?.message} htmlFor="update-player-last-name" label="Nom" required><Input id="update-player-last-name" hasError={errors.lastName != null} {...register("lastName")} /></FormField><FormField error={errors.nationality?.message} htmlFor="update-player-nationality" label="Nationalité"><Input id="update-player-nationality" {...register("nationality")} /></FormField><FormField error={errors.position?.message} htmlFor="update-player-position" label="Poste"><Input id="update-player-position" {...register("position")} /></FormField><FormField error={errors.birthday?.message} htmlFor="update-player-birthday" label="Date de naissance"><Input id="update-player-birthday" type="date" {...register("birthday")} /></FormField><FormField error={errors.pictureUrl?.message} htmlFor="update-player-picture-url" label="URL de la photo"><Input id="update-player-picture-url" hasError={errors.pictureUrl != null} type="url" {...register("pictureUrl")} /></FormField></div>{isVersionConflict ? <Alert variant="danger">Le joueur a été modifié ailleurs. <Button onClick={() => { mutation.reset(); onReload(); }} type="button" variant="outline">Recharger la fiche</Button></Alert> : null}{mutation.isError && !isVersionConflict ? <Alert variant="danger">Impossible de modifier le joueur.</Alert> : null}<div className="create-league-form__actions"><Button onClick={onCancel} type="button" variant="ghost">Annuler</Button><Button disabled={!isDirty || mutation.isPending} type="submit">{mutation.isPending ? "Enregistrement…" : "Enregistrer"}</Button></div></form>;
}
export { UpdatePlayerForm };
