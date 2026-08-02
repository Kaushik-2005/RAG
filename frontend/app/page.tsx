import { getContracts, getHealth } from "@/lib/api";

type HealthData = Awaited<ReturnType<typeof getHealth>>;
type ContractsData = Awaited<ReturnType<typeof getContracts>>;

export default async function HomePage() {
  let health: HealthData | undefined;
  let contracts: ContractsData | undefined;
  let error: string | null = null;

  try {
    [health, contracts] = await Promise.all([getHealth(), getContracts()]);
  } catch (err) {
    error = err instanceof Error ? err.message : "Unable to reach the backend.";
  }

  return (
    <main>
      <div className="card">
        <h1>RAG Lab</h1>
        <p>Foundation scaffold for the educational RAG platform.</p>

        {error ? (
          <p>Backend status: {error}</p>
        ) : (
          <>
            <p>
              Backend status: {health?.status} — {health?.app_name} ({health?.environment})
            </p>
            <p>API version: {health?.version}</p>
            <h2>Contract preview</h2>
            <ul>
              {contracts?.endpoints.map((endpoint) => (
                <li key={`${endpoint.method}-${endpoint.path}`}>
                  {endpoint.method} {endpoint.path} — {endpoint.purpose}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}
