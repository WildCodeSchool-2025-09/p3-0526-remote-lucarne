import type { ReactNode } from "react";

interface FormFieldProps {
  children: ReactNode;
  error?: string;
  htmlFor: string;
  label: string;
  required?: boolean;
}

function FormField({ children, error, htmlFor, label, required = false }: FormFieldProps) {
  const errorId = `${htmlFor}-error`;

  return (
    <div className="lucarne-form-field">
      <label className="lucarne-form-field__label" htmlFor={htmlFor}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {children}
      {error ? (
        <p className="lucarne-form-field__error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export { FormField };
export type { FormFieldProps };
