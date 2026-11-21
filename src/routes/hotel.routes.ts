import { Router } from 'express';
import { HotelController } from '../controllers/hotel.controller';

export const hotelRouter = Router();

// GET /api/hotels?city=delhi
// GET /api/hotels?city=delhi&minPrice=<min>&maxPrice=<max>
hotelRouter.get('/hotels', HotelController.getHotels);
