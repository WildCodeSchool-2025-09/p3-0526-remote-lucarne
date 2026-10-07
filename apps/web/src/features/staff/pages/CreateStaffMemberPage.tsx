import { staffStyles } from "../staffStyles";
import DashboardPageHeader from "../../../components/dashboard/DashboardPageHeader";
import { createStaffMemberInputSchema } from "@lucarne/shared";
import { useState } from "react";
import { useNavigate } from "react-router";
import { useTeamList } from "../../../hooks/useTeamList";
import { useCreateStaffMember } from "../../../hooks/useStaff";
import { Alert, Button, FormField, ImagePicker, Input } from "../../../ui";
import { uploadPhoto } from "../../../services/uploadPhoto.service";
import { HttpError } from "../../../lib/httpClient";

type StaffForm = {
  firstName: string;
  lastName: string;
  nationality: string;
  pictureUrl: string;
  teamId: string;
  jobTitle: string;
  leftAt: string;
  joinedAt: string;
};
const initialValues: StaffForm = {
  firstName: "",
  lastName: "",
  nationality: "",
  pictureUrl: "",
  teamId: "",
  jobTitle: "",
  leftAt: "",
  joinedAt: "",
};

export default function CreateStaffMemberPage() {
  const navigate = useNavigate();
  const mutation = useCreateStaffMember();
  const [teamPage, setTeamPage] = useState(1);
  const teams = useTeamList({
    page: teamPage,
    pageSize: 20,
    status: "ALL",
    sortBy: "name",
    sortOrder: "asc",
  });
  const [values, setValues] = useState(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pending = isSubmitting || mutation.isPending;

  const set = (field: keyof StaffForm, value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setError(null);
    if (
      !values.firstName.trim() ||
      !values.lastName.trim() ||
      !values.nationality.trim()
    ) {
      setError("Le prénom, le nom et la nationalité sont obligatoires.");
      return;
    }
    const hasAssignment = Boolean(
      values.teamId || values.jobTitle || values.joinedAt || values.leftAt,
    );
    if (
      hasAssignment &&
      (!values.teamId || !values.jobTitle.trim() || !values.joinedAt)
    ) {
      setError(
        "L’équipe, l’intitulé de poste et la date d’arrivée sont obligatoires pour une affectation.",
      );
      return;
    }
    const result = createStaffMemberInputSchema.safeParse({
      firstName: values.firstName,
      lastName: values.lastName,
      nationality: values.nationality,
      pictureUrl: photo ? null : values.pictureUrl || null,
      ...(hasAssignment
        ? {
          teamId: values.teamId,
          jobTitle: values.jobTitle,
          joinedAt: values.joinedAt,
          leftAt: values.leftAt || null,
        }
        : {}),
    });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Vérifiez les informations.");
      return;
    }

    setIsSubmitting(true);

    try {
      let pictureUrl = result.data.pictureUrl ?? null;

      if (photo) {
        pictureUrl = uploadedPhotoUrl ?? (await uploadPhoto(photo));
        setUploadedPhotoUrl(pictureUrl);
      }

      const staffMember = await mutation.mutateAsync({
        ...result.data,
        pictureUrl,
      });

      void navigate(`/dashboard/staff-members/${staffMember.id}`, {
        state: {
          successMessage: "Le membre du staff a été créé avec succès.",
        },
      });
    } catch (failure) {
      setError(
        failure instanceof HttpError && failure.status === 413
          ? "La photo ne doit pas dépasser 5 Mo."
          : failure instanceof HttpError && failure.status < 500
            ? failure.message
            : "Impossible de créer le membre du staff. Vos informations et votre photo sont conservées.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  const totalPages = teams.data?.pagination.totalPages ?? 1;
  return (
    <section className={staffStyles.formPage} aria-labelledby="create-staff-title">
      <div className={staffStyles.container}>
        <Button
          className="min-h-9! justify-self-start px-3!"
          variant="ghost"
          onClick={() => void navigate("/dashboard/staff-members")}
        >
          ← Retour à la liste
        </Button>
        <DashboardPageHeader
          resource="staff"
          mode="create"
          headingId="create-staff-title"
          title="Créer un membre du staff"
          description="Ajoutez ses informations principales et son affectation éventuelle."
        />
        <form
          className={staffStyles.formCard}
          noValidate
          onSubmit={(event) => {
            void submit(event);
          }}
        >
          <header className={staffStyles.formFields}>
            <h2 className={staffStyles.formTitle}>Informations du staff</h2>
            <p className={staffStyles.description}>
              Les champs marqués d’un astérisque sont obligatoires.
            </p>
          </header>
          <div className={staffStyles.formFields}>
            <FormField htmlFor="staff-first-name" label="Prénom" required>
              <Input
                id="staff-first-name"
                value={values.firstName}
                onChange={(event) => set("firstName", event.target.value)}
              />
            </FormField>
            <FormField htmlFor="staff-last-name" label="Nom" required>
              <Input
                id="staff-last-name"
                value={values.lastName}
                onChange={(event) => set("lastName", event.target.value)}
              />
            </FormField>
            <FormField htmlFor="staff-nationality" label="Nationalité" required>
              <Input
                id="staff-nationality"
                value={values.nationality}
                onChange={(event) => set("nationality", event.target.value)}
              />
            </FormField>
            <ImagePicker
              id="create-staff-photo"
              label="Photo du membre du staff"
              inputLabel="Fichier photo"
              removeLabel="Retirer la photo"
              previewAlt="Aperçu de la photo sélectionnée"
              file={photo}
              disabled={pending}
              onChange={(file) => {
                setPhoto(file);
                setUploadedPhotoUrl(null);
              }}
            />
            <FormField htmlFor="staff-team-id" label="Équipe">
              <select
                className={staffStyles.select}
                disabled={pending || teams.isPending}
                id="staff-team-id"
                value={values.teamId}
                onChange={(event) => set("teamId", event.target.value)}
              >
                <option value="">Aucune équipe</option>
                {teams.data?.data.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
              {teams.isPending ? <p role="status">Chargement des équipes…</p> : null}
              {teams.isError ? (
                <Alert variant="danger">Impossible de charger les équipes.</Alert>
              ) : null}
              {totalPages > 1 ? (
                <div>
                  <Button
                    disabled={teamPage === 1}
                    type="button"
                    variant="outline"
                    onClick={() => setTeamPage((page) => page - 1)}
                  >
                    Équipes précédentes
                  </Button>
                  <span>
                    {" "}
                    Page {teamPage} sur {totalPages}{" "}
                  </span>
                  <Button
                    disabled={teamPage === totalPages}
                    type="button"
                    variant="outline"
                    onClick={() => setTeamPage((page) => page + 1)}
                  >
                    Équipes suivantes
                  </Button>
                </div>
              ) : null}
            </FormField>
            <FormField htmlFor="staff-job-title" label="Intitulé de poste">
              <Input
                id="staff-job-title"
                disabled={pending}
                value={values.jobTitle}
                onChange={(event) => set("jobTitle", event.target.value)}
              />
            </FormField>
            <FormField htmlFor="staff-joined-at" label="Date d’arrivée">
              <Input
                id="staff-joined-at"
                disabled={pending}
                type="date"
                value={values.joinedAt}
                onChange={(event) => set("joinedAt", event.target.value)}
              />
            </FormField>
            <FormField htmlFor="staff-left-at" label="Date de fin (incluse)">
              <Input
                id="staff-left-at"
                disabled={pending}
                type="date"
                value={values.leftAt}
                onChange={(event) => set("leftAt", event.target.value)}
              />
            </FormField>
          </div>
          {error || mutation.isError ? (
            <Alert variant="danger">
              {error ??
                "Impossible de créer le membre du staff. Vérifiez les informations saisies."}
            </Alert>
          ) : null}
          <div className={staffStyles.formActions}>
            <Button disabled={pending} type="submit" variant="primary">
              {pending ? "Création…" : "Créer le membre du staff"}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
