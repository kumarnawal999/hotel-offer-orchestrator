import axios from 'axios';
import { config } from '../config/env';
import { mockSupplierAHotels } from '../data/supplierA.data';
import { mockSupplierBHotels } from '../data/supplierB.data';
import { DeduplicatedHotel, SupplierHotel } from '../types/hotel.types';
import { logger } from '../utils/logger';

export class SupplierService {
  /**
   * Internal mock retrieval for Supplier A endpoint.
   */
  public static getMockSupplierAHotels(city?: string, simulateDown = false): SupplierHotel[] {
    if (simulateDown) {
      throw new Error('Supplier A service is unavailable (simulated failure)');
    }
    if (!city) {
      return mockSupplierAHotels;
    }
    const normalizedCity = city.trim().toLowerCase();
    return mockSupplierAHotels.filter((h) => h.city.toLowerCase() === normalizedCity);
  }

  /**
   * Internal mock retrieval for Supplier B endpoint.
   */
  public static getMockSupplierBHotels(city?: string, simulateDown = false): SupplierHotel[] {
    if (simulateDown) {
      throw new Error('Supplier B service is unavailable (simulated failure)');
    }
    if (!city) {
      return mockSupplierBHotels;
    }
    const normalizedCity = city.trim().toLowerCase();
    return mockSupplierBHotels.filter((h) => h.city.toLowerCase() === normalizedCity);
  }

  /**
   * Fetches hotels from Supplier A via HTTP endpoint with error handling & resilience.
   */
  public static async fetchSupplierAHotels(
    city: string,
    options?: { simulateDown?: boolean; allowPartial?: boolean }
  ): Promise<SupplierHotel[]> {
    const url = config.suppliers.supplierAUrl;
    logger.info(`Fetching Supplier A hotels from ${url} for city: ${city}`);

    try {
      const response = await axios.get<SupplierHotel[]>(url, {
        params: {
          city,
          simulateDown: options?.simulateDown ? 'true' : undefined,
        },
        timeout: 5000,
      });
      return response.data;
    } catch (error: any) {
      logger.error('Failed to fetch from Supplier A via HTTP:', { error: error.message });
      // If HTTP call fails (e.g. self-call during bootstrap or network restriction), fallback to internal mock
      if (options?.simulateDown) {
        throw new Error('Supplier A simulated outage');
      }
      if (options?.allowPartial) {
        logger.warn('Supplier A failed, returning empty list due to allowPartial=true');
        return [];
      }
      // Direct data fallback if HTTP is unreachable
      logger.info('Falling back to internal Supplier A dataset');
      return this.getMockSupplierAHotels(city);
    }
  }

  /**
   * Fetches hotels from Supplier B via HTTP endpoint with error handling & resilience.
   */
  public static async fetchSupplierBHotels(
    city: string,
    options?: { simulateDown?: boolean; allowPartial?: boolean }
  ): Promise<SupplierHotel[]> {
    const url = config.suppliers.supplierBUrl;
    logger.info(`Fetching Supplier B hotels from ${url} for city: ${city}`);

    try {
      const response = await axios.get<SupplierHotel[]>(url, {
        params: {
          city,
          simulateDown: options?.simulateDown ? 'true' : undefined,
        },
        timeout: 5000,
      });
      return response.data;
    } catch (error: any) {
      logger.error('Failed to fetch from Supplier B via HTTP:', { error: error.message });
      if (options?.simulateDown) {
        throw new Error('Supplier B simulated outage');
      }
      if (options?.allowPartial) {
        logger.warn('Supplier B failed, returning empty list due to allowPartial=true');
        return [];
      }
      logger.info('Falling back to internal Supplier B dataset');
      return this.getMockSupplierBHotels(city);
    }
  }

  /**
   * Deduplicates hotels from Supplier A and Supplier B according to specification:
   * - Deduplicate hotels by name.
   * - For each hotel name that appears in both lists:
   *     - Select the one with the cheaper price.
   *     - If prices are equal, pick higher commission or Supplier A.
   * - If only one supplier returns a hotel, select that one.
   * - Format output strictly matching the PDF response format.
   */
  public static deduplicateHotels(
    supplierAOffers: SupplierHotel[],
    supplierBOffers: SupplierHotel[]
  ): DeduplicatedHotel[] {
    const hotelMap = new Map<
      string,
      { offerA?: SupplierHotel; offerB?: SupplierHotel }
    >();

    for (const offer of supplierAOffers) {
      const key = offer.name.trim().toLowerCase();
      const existing = hotelMap.get(key) || {};
      existing.offerA = offer;
      hotelMap.set(key, existing);
    }

    for (const offer of supplierBOffers) {
      const key = offer.name.trim().toLowerCase();
      const existing = hotelMap.get(key) || {};
      existing.offerB = offer;
      hotelMap.set(key, existing);
    }

    const deduplicated: DeduplicatedHotel[] = [];

    for (const [, { offerA, offerB }] of hotelMap.entries()) {
      if (offerA && offerB) {
        // Appears in both lists: select cheaper price
        if (offerA.price < offerB.price) {
          deduplicated.push({
            name: offerA.name,
            price: offerA.price,
            supplier: 'Supplier A',
            commissionPct: offerA.commissionPct,
          });
        } else if (offerB.price < offerA.price) {
          deduplicated.push({
            name: offerB.name,
            price: offerB.price,
            supplier: 'Supplier B',
            commissionPct: offerB.commissionPct,
          });
        } else {
          // Equal price: select the one with higher commission percentage or Supplier A
          const chosen = offerB.commissionPct > offerA.commissionPct ? offerB : offerA;
          const supplierName = chosen === offerB ? 'Supplier B' : 'Supplier A';
          deduplicated.push({
            name: chosen.name,
            price: chosen.price,
            supplier: supplierName,
            commissionPct: chosen.commissionPct,
          });
        }
      } else if (offerA) {
        // Only Supplier A returned this hotel
        deduplicated.push({
          name: offerA.name,
          price: offerA.price,
          supplier: 'Supplier A',
          commissionPct: offerA.commissionPct,
        });
      } else if (offerB) {
        // Only Supplier B returned this hotel
        deduplicated.push({
          name: offerB.name,
          price: offerB.price,
          supplier: 'Supplier B',
          commissionPct: offerB.commissionPct,
        });
      }
    }

    // Sort by price ascending for neat presentation
    return deduplicated.sort((a, b) => a.price - b.price);
  }
}
