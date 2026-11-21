import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',

  temporal: {
    address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
    namespace: process.env.TEMPORAL_NAMESPACE || 'default',
    taskQueue: process.env.TEMPORAL_TASK_QUEUE || 'hotel-offer-tasks',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    ttlSeconds: parseInt(process.env.REDIS_TTL_SECONDS || '3600', 10),
  },

  suppliers: {
    supplierAUrl: process.env.SUPPLIER_A_URL || `http://localhost:${process.env.PORT || '3000'}/supplierA/hotels`,
    supplierBUrl: process.env.SUPPLIER_B_URL || `http://localhost:${process.env.PORT || '3000'}/supplierB/hotels`,
  },
};
