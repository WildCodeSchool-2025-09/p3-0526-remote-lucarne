import type { HealthResponse } from "@lucarne/shared";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { httpClient } from "../lib/httpClient";

function HomePage() {
  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: () => httpClient.get<HealthResponse>("/health"),
  });

  return (
    <section>
      <h1 className="w-full bg-amber-300">Lucarne</h1>
      <Link className="lucarne-button" to="/matches">Consulter le calendrier des matchs</Link>
      {healthQuery.isPending ? <p>Vérification de l’API...</p> : null}
      {healthQuery.isError ? <p role="alert">API inaccessible : {healthQuery.error.message}</p> : null}
      {healthQuery.isSuccess ? <p>État de l’API : {healthQuery.data.status}</p> : null}
    </section>
  );
}

export default HomePage;
