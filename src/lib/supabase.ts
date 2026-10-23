import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Order, NewOrderInput, OrderStatus, PaymentStatus, Profile } from '../types';
import {
  getStoredMockOrders,
  saveStoredMockOrders,
  saveMockPdfBlob,
  getMockPdfBlobUrl,
  MOCK_CUSTOMER_PROFILE,
} from './mockData';

const envSupabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const envSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const SHOP_UPI_ID = import.meta.env.VITE_SHOP_UPI_ID || 'sivaramsuresh2007@oksbi';
export const SHOP_NAME = import.meta.env.VITE_SHOP_NAME || 'siva ram';
export const SHOP_QR_IMAGE = import.meta.env.VITE_SHOP_QR_IMAGE || '/siva-qr.jpg';

// Verify if valid Supabase configuration is provided
export const isSupabaseConfigured = Boolean(
  envSupabaseUrl &&
  envSupabaseAnonKey &&
  envSupabaseUrl.startsWith('http') &&
  !envSupabaseUrl.includes('your-project-id') &&
  envSupabaseAnonKey !== 'your-anon-public-key-here'
);

// Single Supabase Client instance (or null if not yet configured)
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(envSupabaseUrl, envSupabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

/**
 * Uploads a customer's PDF file to the Supabase private 'pdfs' storage bucket.
 * Bucket folder structure: {userId}/{timestamp}-{sanitizedFilename}
 */
export async function uploadPdfToStorage(file: File, userId: string): Promise<{ path: string; error?: string }> {
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${userId}/${Date.now()}-${sanitizedName}`;

  if (!isSupabaseConfigured || !supabase) {
    // In demo/offline mode: cache the blob in memory for signed URL simulation
    saveMockPdfBlob(filePath, file);
    return { path: filePath };
  }

  try {
    const { data, error } = await supabase.storage
      .from('pdfs')
      .upload(filePath, file, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (error) {
      console.error('Supabase storage upload error:', error);
      throw error;
    }

    return { path: data.path };
  } catch (err: any) {
    return { path: '', error: err.message || 'Failed to upload PDF file to secure storage.' };
  }
}

/**
 * Creates a time-limited signed URL (valid for 1 hour) for secure viewing/downloading.
 */
export async function getSignedPdfUrl(path: string): Promise<string> {
  if (!isSupabaseConfigured || !supabase) {
    const mockBlobUrl = getMockPdfBlobUrl(path);
    if (mockBlobUrl) return mockBlobUrl;
    // Fallback sample PDF representation
    return 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
  }

  try {
    const { data, error } = await supabase.storage
      .from('pdfs')
      .createSignedUrl(path, 3600); // 1 hour validity

    if (error || !data?.signedUrl) {
      throw error || new Error('Could not generate signed URL');
    }

    return data.signedUrl;
  } catch (err) {
    console.error('Failed to generate signed URL:', err);
    throw err;
  }
}

/**
 * Fetches profile for a user ID.
 */
export async function getUserProfile(userId: string): Promise<Profile | null> {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.warn('Error fetching profile:', error.message);
      return null;
    }

    return data as Profile;
  } catch (err) {
    console.error('Failed to load profile:', err);
    return null;
  }
}

/**
 * Fetches orders placed by a specific customer (RLS enforced).
 */
export async function fetchCustomerOrders(userId: string): Promise<Order[]> {
  if (!isSupabaseConfigured || !supabase) {
    const all = getStoredMockOrders();
    return all.filter((o) => o.user_id === userId);
  }

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Order[];
  } catch (err) {
    console.error('Failed to fetch customer orders:', err);
    throw err;
  }
}

/**
 * Fetches all orders (Admin only - RLS enforced).
 */
export async function fetchAllOrdersAdmin(): Promise<Order[]> {
  if (!isSupabaseConfigured || !supabase) {
    return getStoredMockOrders();
  }

  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        profiles:user_id (
          id,
          email,
          full_name,
          role
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Order[];
  } catch (err) {
    console.error('Failed to fetch admin orders:', err);
    throw err;
  }
}

/**
 * Creates a new print order.
 */
export async function submitOrder(input: NewOrderInput, userId: string, userEmail?: string): Promise<Order> {
  if (!isSupabaseConfigured || !supabase) {
    const current = getStoredMockOrders();
    const newOrder: Order = {
      id: `ord-${Date.now().toString().slice(-5)}`,
      user_id: userId,
      name: input.name,
      pages: input.pages,
      amount: input.amount,
      pdf_path: input.pdf_path,
      payment_status: input.payment_status || 'paid',
      payment_method: input.payment_method || 'gpay',
      payment_ref: input.payment_ref || null,
      order_status: 'pending',
      created_at: new Date().toISOString(),
      profiles: {
        id: userId,
        email: userEmail || 'user@example.com',
        full_name: input.name,
        role: 'customer',
        created_at: new Date().toISOString(),
      },
    };
    const updated = [newOrder, ...current];
    saveStoredMockOrders(updated);
    return newOrder;
  }

  try {
    const { data, error } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        name: input.name,
        pages: input.pages,
        amount: input.amount,
        pdf_path: input.pdf_path,
        payment_status: input.payment_status || 'paid',
        payment_method: input.payment_method || 'gpay',
        payment_ref: input.payment_ref || null,
        order_status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting order:', error);
      throw error;
    }

    return data as Order;
  } catch (err) {
    console.error('Failed to submit order:', err);
    throw err;
  }
}

/**
 * Admin updates order payment status (verified / rejected).
 */
export async function updateOrderPaymentStatus(orderId: string, status: PaymentStatus): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    const orders = getStoredMockOrders().map((o) =>
      o.id === orderId ? { ...o, payment_status: status } : o
    );
    saveStoredMockOrders(orders);
    return;
  }

  const { error } = await supabase
    .from('orders')
    .update({ payment_status: status })
    .eq('id', orderId);

  if (error) throw error;
}

/**
 * Admin updates order fulfillment status (pending / printing / completed).
 */
export async function updateOrderFulfillmentStatus(orderId: string, status: OrderStatus): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    const orders = getStoredMockOrders().map((o) =>
      o.id === orderId ? { ...o, order_status: status } : o
    );
    saveStoredMockOrders(orders);
    return;
  }

  const { error } = await supabase
    .from('orders')
    .update({ order_status: status })
    .eq('id', orderId);

  if (error) throw error;
}
