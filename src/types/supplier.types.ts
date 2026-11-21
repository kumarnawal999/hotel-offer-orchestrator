export type SupplierName = 'Supplier A' | 'Supplier B';

export interface ComponentHealth {
  status: 'UP' | 'DOWN';
  responseTimeMs?: number;
  error?: string;
}

export interface HealthCheckResponse {
  status: 'UP' | 'DEGRADED' | 'DOWN';
  timestamp: string;
  uptimeSeconds: number;
  services: {
    supplierA: ComponentHealth;
    supplierB: ComponentHealth;
    redis: ComponentHealth;
    temporal: ComponentHealth;
  };
}
