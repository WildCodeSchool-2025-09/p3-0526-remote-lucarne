import { PHOTO_MAX_BYTES, PHOTO_MIME_TYPES } from "@lucarne/shared";
import { useEffect, useRef, useState } from "react";
import { Alert } from "./Alert";
import { Button } from "./Button";

interface ImagePickerProps {
  id: string;
  label: string;
  file: File | null;
  disabled: boolean;
  onChange: (file: File | null) => void;
  inputLabel?: string;
  removeLabel?: string;
  previewAlt?: string;
}

function ImagePicker({
  id,
  label,
  file,
  disabled,
  onChange,
  inputLabel = "Fichier image",
  removeLabel = "Retirer l’image",
  previewAlt = "Aperçu de l’image sélectionnée",
}: ImagePickerProps) {
  const input = useRef<HTMLInputElement>(null);
  const preview = useRef<HTMLImageElement>(null);
  const [error, setError] = useState<string | null>(null);
  const helpId = id + "-help";
  const errorId = id + "-error";

  useEffect(() => {
    if (!file || !preview.current) return;

    const url = URL.createObjectURL(file);

    preview.current.src = url;

    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="grid gap-3 [&_p]:m-0">
      <label htmlFor={id}>{label}</label>
      <p className="m-0 text-[var(--color-text-secondary)]" id={helpId}>
        JPEG, PNG ou WebP, 5 Mo maximum. L’image sera envoyée lors de l’enregistrement.
      </p>
      <input
        ref={input}
        id={id}
        aria-label={inputLabel}
        aria-describedby={error ? helpId + " " + errorId : helpId}
        aria-invalid={error != null}
        className="sr-only"
        tabIndex={-1}
        type="file"
        accept={PHOTO_MIME_TYPES.join(",")}
        disabled={disabled}
        onChange={(event) => {
          const selected = event.target.files?.[0];

          event.target.value = "";

          if (!selected) return;
          if (
            !PHOTO_MIME_TYPES.some((type) => type === selected.type) ||
            selected.size === 0
          ) {
            setError("Sélectionnez une image JPEG, PNG ou WebP.");

            return;
          }
          if (selected.size > PHOTO_MAX_BYTES) {
            setError("L’image ne doit pas dépasser 5 Mo.");

            return;
          }

          setError(null);
          onChange(selected);
        }}
      />
      <div className="flex flex-wrap items-center gap-3 [overflow-wrap:anywhere]">
        <Button
          disabled={disabled}
          type="button"
          variant="outline"
          onClick={() => input.current?.click()}
        >
          Parcourir…
        </Button>
        {file ? (
          <>
            <span>{file.name}</span>
            <Button
              disabled={disabled}
              type="button"
              variant="ghost"
              onClick={() => {
                setError(null);
                onChange(null);
              }}
            >
              {removeLabel}
            </Button>
          </>
        ) : null}
      </div>
      {file ? (
        <img
          ref={preview}
          className="size-24 rounded-lg object-cover"
          alt={previewAlt}
        />
      ) : null}
      {error ? <Alert id={errorId} variant="danger">{error}</Alert> : null}
    </div>
  );
}

export { ImagePicker };
export type { ImagePickerProps };
