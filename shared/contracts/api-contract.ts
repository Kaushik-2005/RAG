export type HealthResponse = {
  status: "ok";
  app_name: string;
  environment: string;
  version: string;
};

export type ContractEndpoint = {
  method: string;
  path: string;
  purpose: string;
};

export type ContractResponse = {
  service: string;
  endpoints: ContractEndpoint[];
  note: string;
};
