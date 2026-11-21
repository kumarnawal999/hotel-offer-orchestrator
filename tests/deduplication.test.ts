import { SupplierService } from '../src/services/supplier.service';
import { SupplierHotel } from '../src/types/hotel.types';

describe('Hotel Deduplication and Price Comparison Logic', () => {
  it('should select the cheaper offer when a hotel is present in both suppliers', () => {
    const supplierAOffers: SupplierHotel[] = [
      { hotelId: 'a1', name: 'Holtin', price: 6000, city: 'delhi', commissionPct: 10 },
      { hotelId: 'a2', name: 'Radison', price: 5900, city: 'delhi', commissionPct: 13 },
    ];

    const supplierBOffers: SupplierHotel[] = [
      { hotelId: 'b1', name: 'Holtin', price: 5340, city: 'delhi', commissionPct: 20 },
      { hotelId: 'b2', name: 'Radison', price: 6500, city: 'delhi', commissionPct: 15 },
    ];

    const deduplicated = SupplierService.deduplicateHotels(supplierAOffers, supplierBOffers);

    expect(deduplicated).toHaveLength(2);

    // Holtin: Supplier B is 5340 vs Supplier A 6000 -> Supplier B wins
    const holtin = deduplicated.find((h) => h.name.toLowerCase() === 'holtin');
    expect(holtin).toBeDefined();
    expect(holtin?.price).toBe(5340);
    expect(holtin?.supplier).toBe('Supplier B');
    expect(holtin?.commissionPct).toBe(20);

    // Radison: Supplier A is 5900 vs Supplier B 6500 -> Supplier A wins
    const radison = deduplicated.find((h) => h.name.toLowerCase() === 'radison');
    expect(radison).toBeDefined();
    expect(radison?.price).toBe(5900);
    expect(radison?.supplier).toBe('Supplier A');
    expect(radison?.commissionPct).toBe(13);
  });

  it('should retain a hotel if it is only offered by Supplier A', () => {
    const supplierAOffers: SupplierHotel[] = [
      { hotelId: 'a3', name: 'The Imperial', price: 9800, city: 'delhi', commissionPct: 14 },
    ];
    const supplierBOffers: SupplierHotel[] = [];

    const deduplicated = SupplierService.deduplicateHotels(supplierAOffers, supplierBOffers);

    expect(deduplicated).toHaveLength(1);
    expect(deduplicated[0]).toEqual({
      name: 'The Imperial',
      price: 9800,
      supplier: 'Supplier A',
      commissionPct: 14,
    });
  });

  it('should retain a hotel if it is only offered by Supplier B', () => {
    const supplierAOffers: SupplierHotel[] = [];
    const supplierBOffers: SupplierHotel[] = [
      { hotelId: 'b5', name: 'Leela Ambience', price: 8200, city: 'delhi', commissionPct: 16 },
    ];

    const deduplicated = SupplierService.deduplicateHotels(supplierAOffers, supplierBOffers);

    expect(deduplicated).toHaveLength(1);
    expect(deduplicated[0]).toEqual({
      name: 'Leela Ambience',
      price: 8200,
      supplier: 'Supplier B',
      commissionPct: 16,
    });
  });

  it('should handle equal prices cleanly by picking higher commission', () => {
    const supplierAOffers: SupplierHotel[] = [
      { hotelId: 'a4', name: 'Taj Palace', price: 11000, city: 'delhi', commissionPct: 10 },
    ];
    const supplierBOffers: SupplierHotel[] = [
      { hotelId: 'b4', name: 'Taj Palace', price: 11000, city: 'delhi', commissionPct: 15 },
    ];

    const deduplicated = SupplierService.deduplicateHotels(supplierAOffers, supplierBOffers);

    expect(deduplicated).toHaveLength(1);
    expect(deduplicated[0].price).toBe(11000);
    expect(deduplicated[0].supplier).toBe('Supplier B');
    expect(deduplicated[0].commissionPct).toBe(15);
  });

  it('should handle empty lists from both suppliers gracefully', () => {
    const deduplicated = SupplierService.deduplicateHotels([], []);
    expect(deduplicated).toEqual([]);
  });
});
