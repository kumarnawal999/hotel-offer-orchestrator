import { proxyActivities, log } from '@temporalio/workflow';
import type * as activities from './activities';
import type { DeduplicatedHotel, SupplierHotel, WorkflowInput } from '../types/hotel.types';

// Configure activity execution with timeouts and retry policy
const {
  fetchSupplierAHotelsActivity,
  fetchSupplierBHotelsActivity,
  saveHotelsToRedisActivity,
  filterHotelsInRedisActivity,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '10 seconds',
  retry: {
    initialInterval: '500 milliseconds',
    backoffCoefficient: 2,
    maximumAttempts: 3,
    maximumInterval: '5 seconds',
  },
});

/**
 * Pure deterministic deduplication function executed inside Temporal workflow.
 */
function deduplicateHotelsWorkflow(
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
      // Both suppliers returned this hotel: select the cheaper price
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
        // Equal price: select offer with higher commission or Supplier A
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

  return deduplicated.sort((a, b) => a.price - b.price);
}

/**
 * Main Temporal Workflow for Hotel Offer Orchestration.
 *
 * Steps:
 * 1. Fetch offers from Supplier A and Supplier B in parallel via activities.
 * 2. Deduplicate hotels by name, picking the best price.
 * 3. Persist the deduplicated list into Redis.
 * 4. Execute price filtering inside Redis to fetch matching offers.
 * 5. Return the resulting list.
 */
export async function hotelAggregationWorkflow(input: WorkflowInput): Promise<DeduplicatedHotel[]> {
  const { city, minPrice, maxPrice, allowPartial } = input;

  log.info(`[Workflow: hotelAggregationWorkflow] Started for city: ${city}`, {
    minPrice,
    maxPrice,
    allowPartial,
  });

  // Step 1: Call Supplier A and Supplier B in parallel
  log.info(`[Workflow: hotelAggregationWorkflow] Calling Supplier A and Supplier B in parallel...`);
  const [supplierAOffers, supplierBOffers] = await Promise.all([
    fetchSupplierAHotelsActivity(city, { allowPartial }),
    fetchSupplierBHotelsActivity(city, { allowPartial }),
  ]);

  log.info(
    `[Workflow: hotelAggregationWorkflow] Supplier responses received. Supplier A: ${supplierAOffers.length}, Supplier B: ${supplierBOffers.length}`
  );

  // Step 2: Deduplicate hotels by name and choose cheaper price
  const deduplicated = deduplicateHotelsWorkflow(supplierAOffers, supplierBOffers);
  log.info(
    `[Workflow: hotelAggregationWorkflow] Deduplication complete. Total unique hotels: ${deduplicated.length}`
  );

  // Step 3: Save deduplicated list into Redis
  log.info(`[Workflow: hotelAggregationWorkflow] Saving deduplicated list to Redis for city: ${city}`);
  await saveHotelsToRedisActivity(city, deduplicated);

  // Step 4: Implement price filtering inside Redis
  log.info(
    `[Workflow: hotelAggregationWorkflow] Querying filtered hotels inside Redis: min=${minPrice}, max=${maxPrice}`
  );
  const filteredHotels = await filterHotelsInRedisActivity(city, minPrice, maxPrice);

  log.info(
    `[Workflow: hotelAggregationWorkflow] Successfully completed. Returning ${filteredHotels.length} hotels.`
  );

  return filteredHotels;
}
