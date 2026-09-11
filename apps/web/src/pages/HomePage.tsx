import type { HealthResponse } from "@lucarne/shared";
import { useQuery } from "@tanstack/react-query";
import { httpClient } from "../lib/httpClient";

function HomePage() {
  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: () => httpClient.get<HealthResponse>("/health"),
  });

  if (healthQuery.isPending) {
    return <p>Vérification de l’API...</p>;
  }

  if (healthQuery.isError) {
    return (
      <p role="alert">
        API inaccessible : {healthQuery.error.message}
      </p>
    );
  }

  return (
    <section>
      <h1 className="w-full bg-amber-300">Lucarne</h1>
      <p>État de l’API : {healthQuery.data.status}</p>
    </section>
  );
}

export default HomePage;
