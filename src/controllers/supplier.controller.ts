import { Request, Response } from 'express';
import { SupplierService } from '../services/supplier.service';
import { logger } from '../utils/logger';

export class SupplierController {
  /**
   * GET /supplierA/hotels
   * Returns static JSON array of hotel offers from Supplier A.
   * Query params:
   *   - city (optional): filter by city
   *   - simulateDown (optional): simulate supplier outage
   */
  public static getSupplierAHotels(req: Request, res: Response): void {
    const city = req.query.city as string | undefined;
    const simulateDown = req.query.simulateDown === 'true' || req.headers['x-simulate-down'] === 'true';

    if (simulateDown) {
      logger.warn('Supplier A outage simulation triggered via request parameter');
      res.status(503).json({
        error: 'Service Unavailable',
        supplier: 'Supplier A',
        message: 'Supplier A is currently experiencing downtime (simulated)',
      });
      return;
    }

    try {
      const hotels = SupplierService.getMockSupplierAHotels(city);
      logger.info(`Supplier A returned ${hotels.length} hotels${city ? ` for city: ${city}` : ''}`);
      res.status(200).json(hotels);
    } catch (err: any) {
      logger.error('Error fetching Supplier A hotels:', { error: err.message });
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  /**
   * GET /supplierB/hotels
   * Returns static JSON array of hotel offers from Supplier B.
   * Query params:
   *   - city (optional): filter by city
   *   - simulateDown (optional): simulate supplier outage
   */
  public static getSupplierBHotels(req: Request, res: Response): void {
    const city = req.query.city as string | undefined;
    const simulateDown = req.query.simulateDown === 'true' || req.headers['x-simulate-down'] === 'true';

    if (simulateDown) {
      logger.warn('Supplier B outage simulation triggered via request parameter');
      res.status(503).json({
        error: 'Service Unavailable',
        supplier: 'Supplier B',
        message: 'Supplier B is currently experiencing downtime (simulated)',
      });
      return;
    }

    try {
      const hotels = SupplierService.getMockSupplierBHotels(city);
      logger.info(`Supplier B returned ${hotels.length} hotels${city ? ` for city: ${city}` : ''}`);
      res.status(200).json(hotels);
    } catch (err: any) {
      logger.error('Error fetching Supplier B hotels:', { error: err.message });
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }
}
