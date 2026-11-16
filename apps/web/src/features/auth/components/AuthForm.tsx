import { useEffect, useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authenticationErrorMessage, loginInputSchema, registerInputSchema } from "@lucarne/shared";
import { login, register as registerAccount } from "../../../services/auth.service";
import { HttpError } from "../../../lib/httpClient";
import { Alert, Button, FormField, Input } from "../../../ui";
import type { AuthMode } from "../AuthContext";

function AuthForm({ mode, onSuccess, onRequest }: { mode: AuthMode; onSuccess: () => void; onRequest: (controller: AbortController) => void }) {
  const registration = mode === "register";
  const id = useId();
  const controllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const schema = z.object({ email: z.string(), password: z.string(), firstName: z.string(), lastName: z.string(), confirmation: z.string() })
    .superRefine((values, context) => {
      const input = registration
        ? { email: values.email, password: values.password, firstName: values.firstName, lastName: values.lastName }
        : { email: values.email, password: values.password };
      const parsed = (registration ? registerInputSchema : loginInputSchema).safeParse(input);
      if (!parsed.success) parsed.error.issues.forEach((issue) => context.addIssue({ code: "custom", path: issue.path, message: issue.message }));
      if (registration && values.password !== values.confirmation) context.addIssue({ code: "custom", path: ["confirmation"], message: "Les mots de passe doivent être identiques" });
    });
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema), defaultValues: { email: "", password: "", firstName: "", lastName: "", confirmation: "" },
  });
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; controllerRef.current?.abort(); };
  }, []);
  const submit = async (values: z.infer<typeof schema>) => {
    if (!mountedRef.current || controllerRef.current) return;
    setError(null);
    const controller = new AbortController(); controllerRef.current = controller;
    onRequest(controller);
    const signal = controller.signal;
    try {
      if (registration) await registerAccount(registerInputSchema.parse({ email: values.email, password: values.password, firstName: values.firstName, lastName: values.lastName }), signal);
      else await login({ email: values.email, password: values.password }, signal);
      if (!signal.aborted) onSuccess();
    } catch (failure) {
      if (signal.aborted) return;
      if (failure instanceof HttpError && failure.status === 401) setError(authenticationErrorMessage);
      else if (failure instanceof HttpError && failure.status === 429) setError("Trop de tentatives. Réessayez dans quelques instants.");
      else setError("Impossible de contacter le service d’authentification. Réessayez.");
    } finally {
      controllerRef.current = null;
    }
  };
  const fields = [
    ...(registration ? [{ name: "firstName", label: "Prénom", autocomplete: "given-name", type: "text" }, { name: "lastName", label: "Nom", autocomplete: "family-name", type: "text" }] as const : []),
    { name: "email", label: "Email", autocomplete: "username", type: "email" },
    { name: "password", label: "Mot de passe", autocomplete: registration ? "new-password" : "current-password", type: "password" },
    ...(registration ? [{ name: "confirmation", label: "Confirmer le mot de passe", autocomplete: "new-password", type: "password" }] as const : []),
  ] as const;
  return (
    <form aria-busy={isSubmitting} noValidate onSubmit={(event) => { void handleSubmit(submit)(event); }}>
      <div className="grid gap-4">
        {fields.map((field) => (
          <FormField error={errors[field.name]?.message} htmlFor={`${id}-${field.name}`} key={field.name} label={field.label} required>
            <Input autoComplete={field.autocomplete} aria-describedby={errors[field.name] ? `${id}-${field.name}-error` : field.name === "password" && registration ? `${id}-password-hint` : undefined} hasError={errors[field.name] !== undefined} id={`${id}-${field.name}`} required type={field.type} {...register(field.name)} />
          </FormField>
        ))}
        {registration ? <p className="m-0 text-sm text-[var(--color-text-secondary)]" id={`${id}-password-hint`}>Au moins 8 caractères, un chiffre et une majuscule.</p> : null}
        {error ? <Alert variant="danger">{error}</Alert> : null}
        <Button className="w-full" disabled={isSubmitting} type="submit">{isSubmitting ? "Traitement…" : registration ? "Créer mon compte" : "Se connecter"}</Button>
      </div>
    </form>
  );
}

export default AuthForm;
