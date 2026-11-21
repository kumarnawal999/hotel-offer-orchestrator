import { Router } from 'express';
import { SupplierController } from '../controllers/supplier.controller';

export const supplierARouter = Router();
export const supplierBRouter = Router();

// GET /supplierA/hotels
supplierARouter.get('/hotels', SupplierController.getSupplierAHotels);

// GET /supplierB/hotels
supplierBRouter.get('/hotels', SupplierController.getSupplierBHotels);
