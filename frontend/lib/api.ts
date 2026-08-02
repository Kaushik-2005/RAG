const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export async function getHealth() {
  const response = await fetch(`${apiBaseUrl}/api/v1/health`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Health request failed: ${response.status}`);
  }

  return response.json() as Promise<{
    status: string;
    app_name: string;
    environment: string;
    version: string;
  }>;
}

export async function getContracts() {
  const response = await fetch(`${apiBaseUrl}/api/v1/contracts`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Contracts request failed: ${response.status}`);
  }

  return response.json() as Promise<{
    service: string;
    endpoints: Array<{ method: string; path: string; purpose: string }>;
    note: string;
  }>;
}
