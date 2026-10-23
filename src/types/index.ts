export type UserRole = 'customer' | 'admin';

export type PaymentStatus = 'pending' | 'paid' | 'verified' | 'rejected';

export type OrderStatus = 'pending' | 'printing' | 'completed';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  created_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  name: string;
  pages: number;
  amount: number;
  pdf_path: string;
  payment_status: PaymentStatus;
  payment_method: string;
  payment_ref: string | null;
  order_status: OrderStatus;
  created_at: string;
  profiles?: Profile | null;
}

export interface NewOrderInput {
  name: string;
  pages: number;
  amount: number;
  pdf_path: string;
  payment_method: string;
  payment_ref?: string;
  payment_status?: PaymentStatus;
}

export interface AppConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  shopUpiId: string;
  shopName: string;
  pricePerPage: number;
}
