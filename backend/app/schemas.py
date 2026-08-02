from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = "ok"
    app_name: str
    environment: str
    version: str


class ContractEndpoint(BaseModel):
    method: str
    path: str
    purpose: str


class ContractResponse(BaseModel):
    service: str
    endpoints: list[ContractEndpoint]
    note: str = Field(default="Initial foundation contract")
