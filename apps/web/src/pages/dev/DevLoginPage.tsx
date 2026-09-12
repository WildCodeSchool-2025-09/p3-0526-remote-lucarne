import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { z } from "zod";
import { getCurrentAppRole } from "../../auth/authRole";
import type { AppRole } from "../../auth/authRole";
import { clearAccessToken, getAccessToken } from "../../lib/authToken";
import { HttpError } from "../../lib/httpClient";
import { login } from "../../services/auth.service";
import { Alert, Button, FormField, Input } from "../../ui";

const devLoginSchema = z.object({
  email: z.email({ error: "Email requis" }),
  password: z.string({ error: "Mot de passe requis" })
    .min(12, { error: "Le mot de passe doit contenir au moins 12 caractères" }),
});

type DevLoginFormValues = z.infer<typeof devLoginSchema>;
type DevSessionState =
  | { status: "anonymous" }
  | { role: AppRole; status: "authenticated" }
  | { status: "invalid" };

function getSessionState(): DevSessionState {
  const accessToken = getAccessToken();

  if (accessToken == null) {
    return { status: "anonymous" };
  }

  const role = getCurrentAppRole();

  return role == null
    ? { status: "invalid" }
    : { role, status: "authenticated" };
}

function getDevLoginErrorMessage(error: unknown): string {
  if (error instanceof HttpError) {
    if (error.status === 401) {
      return "Email ou mot de passe incorrect.";
    }

    if (error.status >= 500) {
      return "Une erreur est survenue pendant la connexion.";
    }

    if (error.status === 400) {
      return "Les informations de connexion sont invalides.";
    }
  }

  return "Impossible de contacter le serveur.";
}

function DevLoginPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<DevSessionState>(getSessionState);
  const [loginError, setLoginError] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<DevLoginFormValues>({
    defaultValues: {
      email: "admin@lucarne.test",
      password: "",
    },
    resolver: zodResolver(devLoginSchema),
  });

  const onSubmit = async (values: DevLoginFormValues) => {
    setLoginError(null);

    try {
      await login(values);
      setSession(getSessionState());
    } catch (error) {
      setLoginError(getDevLoginErrorMessage(error));
    }
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    void handleSubmit(onSubmit)(event);
  };

  const handleLogout = () => {
    clearAccessToken();
    reset({ email: "admin@lucarne.test", password: "" });
    setLoginError(null);
    setSession({ status: "anonymous" });
  };

  if (session.status === "authenticated") {
    return (
      <main className="dev-login-page">
        <section className="dev-login-card" aria-labelledby="dev-login-title">
          <p className="dev-login-card__eyebrow">Développement uniquement</p>
          <h1 id="dev-login-title">Connexion de test</h1>
          <Alert variant="success">
            Connexion réussie — rôle : <strong>{session.role}</strong>
          </Alert>
          <div className="dev-login-card__actions">
            <Button
              onClick={() => {
                void navigate("/dashboard/league");
              }}
              type="button"
            >
              Ligue
            </Button>
            <Button
              onClick={() => {
                void navigate("/dashboard/teams");
              }}
              type="button"
            >
              Équipe
            </Button>
            <Button onClick={handleLogout} type="button" variant="outline">
              Se déconnecter
            </Button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="dev-login-page">
      <section className="dev-login-card" aria-labelledby="dev-login-title">
        <p className="dev-login-card__eyebrow">Développement uniquement</p>
        <h1 id="dev-login-title">Connexion de test</h1>
        <p className="dev-login-card__description">
          Cette page temporaire sert uniquement à tester les rôles de LEAGUE-001.
        </p>

        {session.status === "invalid" ? (
          <Alert variant="danger">La session existante est invalide.</Alert>
        ) : null}
        {loginError ? <Alert variant="danger">{loginError}</Alert> : null}

        <form className="dev-login-card__form" noValidate onSubmit={handleFormSubmit}>
          <FormField error={errors.email?.message} htmlFor="dev-login-email" label="Email" required>
            <Input
              id="dev-login-email"
              aria-describedby={errors.email ? "dev-login-email-error" : undefined}
              hasError={errors.email != null}
              type="email"
              {...register("email")}
            />
          </FormField>
          <FormField
            error={errors.password?.message}
            htmlFor="dev-login-password"
            label="Mot de passe"
            required
          >
            <Input
              id="dev-login-password"
              aria-describedby={errors.password ? "dev-login-password-error" : undefined}
              hasError={errors.password != null}
              type="password"
              {...register("password")}
            />
          </FormField>
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting ? "Connexion..." : "Se connecter"}
          </Button>
          <Link to="/dashboard/teams/new">Ajouter une équipe</Link>
        </form>
      </section>
    </main>
  );
}

export default DevLoginPage;
