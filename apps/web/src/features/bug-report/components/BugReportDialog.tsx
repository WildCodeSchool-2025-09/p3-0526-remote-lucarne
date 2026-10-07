import { zodResolver } from "@hookform/resolvers/zod";
import type { CreateBugReportInput } from "@lucarne/shared";
import { useEffect, useId, useRef } from "react";
import { useForm } from "react-hook-form";
import { createBugReportInputSchema } from "@lucarne/shared";
import { Alert, Button, FormField, Input } from "../../../ui";

interface BugReportDialogProps {
  error?: string;
  onCancel: () => void;
  onSubmit: (input: CreateBugReportInput) => void | Promise<void>;
  open: boolean;
  pending?: boolean;
}

function BugReportDialog({ error, onCancel, onSubmit, open, pending = false }: BugReportDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<CreateBugReportInput>({
    defaultValues: {
      description: "",
      pagePath: window.location.pathname,
      title: "",
    },
    resolver: zodResolver(createBugReportInputSchema),
  });

  useEffect(() => {
    if (!open) return undefined;

    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.querySelector<HTMLInputElement>("#bug-report-title")?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) {
        onCancel();
      }

      if (event.key !== "Tab") return;

      const focusableElements = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          "button:not([disabled]), input:not([disabled]), textarea:not([disabled])",
        ) ?? [],
      );

      if (focusableElements.length < 2) return;

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousFocus.current?.focus();
    };
  }, [onCancel, open, pending]);

  useEffect(() => {
    if (open) {
      reset({ description: "", pagePath: window.location.pathname, title: "" });
    }
  }, [open, reset]);

  if (!open) return null;

  const handleFormSubmit = (input: CreateBugReportInput) => {
    void onSubmit({ ...input, pagePath: window.location.pathname });
  };

  return (
    <div className="lucarne-dialog-backdrop">
      <div
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="lucarne-dialog bug-report-dialog"
        ref={dialogRef}
        role="dialog"
      >
        <header className="bug-report-dialog__header">
          <h2 id={titleId}>Signaler un bug</h2>
          <p id={descriptionId}>Décrivez le problème rencontré sur cette page.</p>
        </header>

        <form noValidate onSubmit={(event) => { void handleSubmit(handleFormSubmit)(event); }}>
          <div className="bug-report-dialog__fields">
            <FormField error={errors.title?.message} htmlFor="bug-report-title" label="Titre" required>
              <Input
                id="bug-report-title"
                aria-describedby={errors.title ? "bug-report-title-error" : undefined}
                hasError={errors.title != null}
                placeholder="Ex. Le bouton Enregistrer ne répond pas"
                type="text"
                {...register("title")}
              />
            </FormField>

            <FormField error={errors.description?.message} htmlFor="bug-report-description" label="Description" required>
              <textarea
                id="bug-report-description"
                aria-describedby={errors.description ? "bug-report-description-error" : undefined}
                aria-invalid={errors.description != null}
                className="lucarne-input bug-report-dialog__description"
                placeholder="Décrivez les étapes pour reproduire le problème."
                {...register("description")}
              />
            </FormField>
          </div>

          {error ? <Alert variant="danger">{error}</Alert> : null}

          <div className="lucarne-dialog__actions">
            <Button disabled={pending} onClick={onCancel} variant="outline">Annuler</Button>
            <Button disabled={pending} type="submit" variant="primary">
              {pending ? "Enregistrement…" : "Envoyer"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export { BugReportDialog };
export type { BugReportDialogProps };
