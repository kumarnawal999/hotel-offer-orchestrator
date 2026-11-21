export interface SupplierHotel {
  hotelId: string;
  name: string;
  price: number;
  city: string;
  commissionPct: number;
}

export interface DeduplicatedHotel {
  name: string;
  price: number;
  supplier: 'Supplier A' | 'Supplier B';
  commissionPct: number;
}

export interface HotelQueryParams {
  city: string;
  minPrice?: number;
  maxPrice?: number;
  allowPartial?: boolean;
}

export interface WorkflowInput {
  city: string;
  minPrice?: number;
  maxPrice?: number;
  allowPartial?: boolean;
}
