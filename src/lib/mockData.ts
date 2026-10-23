import { Order, Profile } from '../types';

export const MOCK_CUSTOMER_PROFILE: Profile = {
  id: 'usr-customer-001',
  email: 'rahul.sharma@example.com',
  full_name: 'Rahul Sharma',
  role: 'customer',
  created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
};

export const MOCK_ADMIN_PROFILE: Profile = {
  id: 'usr-admin-001',
  email: 'shopowner@printflow.in',
  full_name: 'Suresh Kumar (Shop Owner)',
  role: 'admin',
  created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
};

export const INITIAL_MOCK_ORDERS: Order[] = [];

const LOCAL_STORAGE_KEY = 'printflow_orders_v2';
const LOCAL_STORAGE_PDFS = 'printflow_mock_pdfs';

export function getStoredMockOrders(): Order[] {
  try {
    // Clear legacy mock orders cache if present
    localStorage.removeItem('printflow_mock_orders');
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([]));
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveStoredMockOrders(orders: Order[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(orders));
  } catch (e) {
    console.error('Failed to save mock orders to localStorage', e);
  }
}

export function saveMockPdfBlob(path: string, file: File): void {
  try {
    // Store in-memory/blob mapping for signed URL simulations
    (window as any).__MOCK_PDF_CACHE = (window as any).__MOCK_PDF_CACHE || {};
    (window as any).__MOCK_PDF_CACHE[path] = URL.createObjectURL(file);
  } catch (e) {
    console.error('Failed to save mock PDF blob', e);
  }
}

export function getMockPdfBlobUrl(path: string): string | null {
  if ((window as any).__MOCK_PDF_CACHE && (window as any).__MOCK_PDF_CACHE[path]) {
    return (window as any).__MOCK_PDF_CACHE[path];
  }
  return null;
}
