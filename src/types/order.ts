export type ProductSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'UNSTITCHED';

export interface OrderItem {
  sku: string;
  name: string;
  size: ProductSize | string;
  price: number;
  quantity: number;
  image?: string;
  productId?: string;
  color?: string;
}

export type OrderStatus = 'PENDING' | 'PROCESSING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type PaymentMethod = 'COD' | 'CARD' | 'BANK_TRANSFER';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED';

export interface CustomerOrder {
  id?: string; // Firebase Doc ID
  orderId: string;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province?: string;
  postalCode?: string;
  country?: string;
  orderNotes?: string;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  discount?: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus?: PaymentStatus;
  courier?: string;
  trackingNumber?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt?: string;
}
