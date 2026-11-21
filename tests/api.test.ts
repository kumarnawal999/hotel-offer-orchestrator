import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('API Route Integration Tests', () => {
  describe('GET /', () => {
    it('should return 200 with API info', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.body.title).toContain('Hotel Offer Orchestrator');
      expect(res.body.endpoints).toBeDefined();
    });
  });

  describe('GET /supplierA/hotels', () => {
    it('should return Supplier A hotels for Delhi', async () => {
      const res = await request(app).get('/supplierA/hotels?city=delhi');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('hotelId');
      expect(res.body[0]).toHaveProperty('name');
      expect(res.body[0]).toHaveProperty('price');
      expect(res.body[0]).toHaveProperty('city', 'delhi');
      expect(res.body[0]).toHaveProperty('commissionPct');
    });

    it('should simulate outage when simulateDown=true', async () => {
      const res = await request(app).get('/supplierA/hotels?city=delhi&simulateDown=true');
      expect(res.status).toBe(503);
      expect(res.body.error).toBe('Service Unavailable');
    });
  });

  describe('GET /supplierB/hotels', () => {
    it('should return Supplier B hotels for Delhi', async () => {
      const res = await request(app).get('/supplierB/hotels?city=delhi');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('hotelId');
      expect(res.body[0]).toHaveProperty('city', 'delhi');
    });

    it('should simulate outage when simulateDown=true', async () => {
      const res = await request(app).get('/supplierB/hotels?city=delhi&simulateDown=true');
      expect(res.status).toBe(503);
      expect(res.body.error).toBe('Service Unavailable');
    });
  });

  describe('GET /api/hotels validation', () => {
    it('should return 400 when city query parameter is missing', async () => {
      const res = await request(app).get('/api/hotels');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid query parameters');
    });

    it('should return 400 when minPrice > maxPrice', async () => {
      const res = await request(app).get('/api/hotels?city=delhi&minPrice=8000&maxPrice=5000');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid price range');
    });
  });

  describe('GET /unknown-endpoint', () => {
    it('should return 404 for unknown endpoints', async () => {
      const res = await request(app).get('/some-nonexistent-route');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Not Found');
    });
  });
});
