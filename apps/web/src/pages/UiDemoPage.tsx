import type { League } from "@lucarne/shared";
import { useState } from "react";
import { CreateLeagueForm } from "../features/league/components/CreateLeagueForm";
import { Button, Checkbox, FormField, Input } from "../ui";

const demoLeague: League = {
  id: "demo-league-id",
  name: "Ligue Nationale",
  country: "France",
  logoUrl: null,
  status: "ACTIVE",
  isActive: true,
  version: 1,
  createdAt: "2026-09-11T10:00:00.000Z",
};

function UiDemoPage() {
  const [isChecked, setIsChecked] = useState(true);

  return (
    <main className="ui-demo-page">
      <header className="ui-demo-page__header">
        <p className="ui-demo-page__eyebrow">Lucarne UI</p>
        <h1>Page de démonstration</h1>
        <p>
          Aperçu des composants UI et du formulaire de création de ligue.
        </p>
      </header>

      <section className="ui-demo-page__section" aria-labelledby="buttons-title">
        <h2 id="buttons-title">Boutons</h2>
        <div className="ui-demo-page__row">
          <Button variant="primary">Primary</Button>
          <Button variant="dark">Dark</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button disabled variant="primary">Disabled</Button>
        </div>
      </section>

      <section className="ui-demo-page__section" aria-labelledby="fields-title">
        <h2 id="fields-title">Champs</h2>
        <div className="ui-demo-page__fields">
          <FormField htmlFor="demo-default-input" label="Champ standard">
            <Input id="demo-default-input" placeholder="Saisissez une valeur" />
          </FormField>
          <FormField
            error="Le champ contient une erreur"
            htmlFor="demo-error-input"
            label="Champ en erreur"
          >
            <Input
              id="demo-error-input"
              aria-describedby="demo-error-input-error"
              aria-invalid="true"
              defaultValue="Valeur invalide"
            />
          </FormField>
          <FormField htmlFor="demo-disabled-input" label="Champ désactivé">
            <Input disabled id="demo-disabled-input" placeholder="Indisponible" />
          </FormField>
          <label className="ui-demo-page__checkbox" htmlFor="demo-checkbox">
            <Checkbox
              checked={isChecked}
              id="demo-checkbox"
              onChange={(event) => setIsChecked(event.target.checked)}
            />
            Checkbox native ({isChecked ? "activée" : "désactivée"})
          </label>
        </div>
      </section>

      <section className="ui-demo-page__section" aria-labelledby="league-title">
        <h2 id="league-title">Format League</h2>
        <article aria-label={`Ligue ${demoLeague.name}`} className="ui-demo-page__league-card">
          <header>
            <p className="ui-demo-page__eyebrow">{demoLeague.status}</p>
            <h3>{demoLeague.name}</h3>
          </header>
          <dl>
            <div><dt>Pays</dt><dd>{demoLeague.country}</dd></div>
            <div><dt>Statut</dt><dd>{demoLeague.isActive ? "Active" : "Inactive"}</dd></div>
            <div><dt>Version</dt><dd>{demoLeague.version}</dd></div>
            <div><dt>Identifiant</dt><dd>{demoLeague.id}</dd></div>
          </dl>
        </article>
      </section>

      <section className="ui-demo-page__section" aria-labelledby="form-title">
        <h2 id="form-title">Formulaire métier</h2>
        <CreateLeagueForm />
      </section>
    </main>
  );
}

export default UiDemoPage;
