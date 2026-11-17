import { staffStyles } from "../staffStyles";
import { zodResolver } from "@hookform/resolvers/zod";
import type { StaffMember, UpdateStaffMemberInput } from "@lucarne/shared";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useUpdateStaffMember } from "../../../hooks/useStaff";
import { Alert, Button, FormField, ImagePicker, Input } from "../../../ui";
import { uploadPhoto } from "../../../services/uploadPhoto.service";

const staffFormSchema = z.object({
  firstName: z.string().trim().min(1, "Prénom requis").max(100),
  lastName: z.string().trim().min(1, "Nom requis").max(100),
  nationality: z.string().trim().min(1, "Nationalité requise").max(100),
  pictureUrl: z
    .string()
    .refine((value) => value === "" || /^https?:\/\//.test(value), "URL invalide"),
  version: z.number(),
});
type StaffFormValues = z.infer<typeof staffFormSchema>;
const valuesOf = (staffMember: StaffMember): StaffFormValues => ({
  firstName: staffMember.firstName,
  lastName: staffMember.lastName,
  nationality: staffMember.nationality,
  pictureUrl: staffMember.pictureUrl ?? "",
  version: staffMember.version,
});
function UpdateStaffMemberForm({
  staffMember,
  onCancel,
  onReload,
  onSuccess,
}: {
  staffMember: StaffMember;
  onCancel: () => void;
  onReload: () => void;
  onSuccess: (staffMember: StaffMember) => void;
}) {
  const mutation = useUpdateStaffMember();
  const [photo, setPhoto] = useState<File | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pending = isSubmitting || mutation.isPending;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<StaffFormValues>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: valuesOf(staffMember),
  });
  useEffect(() => {
    reset(valuesOf(staffMember));
  }, [staffMember, reset]);
  const submit = async (values: StaffFormValues) => {
    if (pending) return;

    setUploadError(null);
    setIsSubmitting(true);

    const input: UpdateStaffMemberInput = {
      firstName: values.firstName,
      lastName: values.lastName,
      nationality: values.nationality,
      pictureUrl: values.pictureUrl || null,
      version: values.version,
    };

    try {
      if (photo) {
        const photoUrl = uploadedPhotoUrl ?? (await uploadPhoto(photo));

        input.pictureUrl = photoUrl;
        setUploadedPhotoUrl(photoUrl);
      }
    } catch {
      setUploadError(
        "Impossible d’envoyer la photo. Vos informations sont conservées.",
      );
      setIsSubmitting(false);
      return;
    }

    mutation.mutate(
      { id: staffMember.id, input },
      {
        onSuccess: (updated) => {
          reset(valuesOf(updated));
          setPhoto(null);
          setUploadedPhotoUrl(null);
          onSuccess(updated);
        },
        onSettled: () => setIsSubmitting(false),
      },
    );
  };

  const isVersionConflict =
    mutation.error instanceof Error &&
    "code" in mutation.error &&
    mutation.error.code === "RESOURCE_VERSION_CONFLICT";

  return (
    <form
      className={staffStyles.formCard}
      noValidate
      onSubmit={(event) => {
        void handleSubmit(submit)(event);
      }}
    >
      <div className={staffStyles.formFields}>
        <FormField
          error={errors.firstName?.message}
          htmlFor="update-staff-first-name"
          label="Prénom"
          required
        >
          <Input
            id="update-staff-first-name"
            hasError={errors.firstName != null}
            {...register("firstName")}
          />
        </FormField>
        <FormField
          error={errors.lastName?.message}
          htmlFor="update-staff-last-name"
          label="Nom"
          required
        >
          <Input
            id="update-staff-last-name"
            hasError={errors.lastName != null}
            {...register("lastName")}
          />
        </FormField>
        <FormField
          error={errors.nationality?.message}
          htmlFor="update-staff-nationality"
          label="Nationalité"
          required
        >
          <Input
            id="update-staff-nationality"
            hasError={errors.nationality != null}
            {...register("nationality")}
          />
        </FormField>
        <ImagePicker
          id="update-staff-photo"
          label="Photo du membre du staff"
          inputLabel="Fichier photo"
          removeLabel="Retirer la photo"
          previewAlt="Aperçu de la photo sélectionnée"
          file={photo}
          disabled={pending}
          onChange={(file) => {
            setPhoto(file);
            setUploadedPhotoUrl(null);
            setUploadError(null);
          }}
        />
      </div>
      {uploadError ? <Alert variant="danger">{uploadError}</Alert> : null}
      {isVersionConflict ? (
        <Alert variant="danger">
          Le membre du staff a été modifié ailleurs.{" "}
          <Button
            onClick={() => {
              mutation.reset();
              onReload();
            }}
            type="button"
            variant="outline"
          >
            Recharger la fiche
          </Button>
        </Alert>
      ) : null}
      {mutation.isError && !isVersionConflict ? (
        <Alert variant="danger">Impossible de modifier le membre du staff.</Alert>
      ) : null}
      <div className={staffStyles.formActions}>
        <Button onClick={onCancel} type="button" variant="ghost">
          Annuler
        </Button>
        <Button disabled={(!isDirty && !photo) || pending} type="submit">
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
export { UpdateStaffMemberForm };
