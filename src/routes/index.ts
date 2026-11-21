import { Router } from 'express';
import { hotelRouter } from './hotel.routes';
import { supplierARouter, supplierBRouter } from './supplier.routes';
import { healthRouter } from './health.routes';

export const mainRouter = Router();

// Mounting routes according to the functional requirements:
// 1. GET /api/hotels?city=...
mainRouter.use('/api', hotelRouter);

// 2. GET /supplierA/hotels
mainRouter.use('/supplierA', supplierARouter);

// 3. GET /supplierB/hotels
mainRouter.use('/supplierB', supplierBRouter);

// 4. GET /health
mainRouter.use('/', healthRouter);
