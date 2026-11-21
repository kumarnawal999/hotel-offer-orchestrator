import { SupplierService } from '../src/services/supplier.service';

describe('Supplier Service Mock Data & Filtering', () => {
  it('should return all hotels when no city filter is applied', () => {
    const hotelsA = SupplierService.getMockSupplierAHotels();
    const hotelsB = SupplierService.getMockSupplierBHotels();

    expect(hotelsA.length).toBeGreaterThan(0);
    expect(hotelsB.length).toBeGreaterThan(0);
  });

  it('should filter hotels by city case-insensitively', () => {
    const delhiHotelsA = SupplierService.getMockSupplierAHotels('DELHI');
    expect(delhiHotelsA.length).toBeGreaterThan(0);
    delhiHotelsA.forEach((h) => expect(h.city.toLowerCase()).toBe('delhi'));

    const mumbaiHotelsB = SupplierService.getMockSupplierBHotels('mUmBaI');
    expect(mumbaiHotelsB.length).toBeGreaterThan(0);
    mumbaiHotelsB.forEach((h) => expect(h.city.toLowerCase()).toBe('mumbai'));
  });

  it('should return empty array for non-existent city', () => {
    const hotels = SupplierService.getMockSupplierAHotels('nonexistentcity');
    expect(hotels).toEqual([]);
  });

  it('should throw an error when simulateDown is true', () => {
    expect(() => {
      SupplierService.getMockSupplierAHotels('delhi', true);
    }).toThrow('Supplier A service is unavailable');

    expect(() => {
      SupplierService.getMockSupplierBHotels('delhi', true);
    }).toThrow('Supplier B service is unavailable');
  });
});
