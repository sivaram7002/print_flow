import React, { useEffect, useState } from 'react';
import {
  Shield,
  Search,
  RefreshCw,
  FileText,
  CheckCircle2,
  XCircle,
  Copy,
  Package,
  AlertCircle,
  Download,
  Check,
} from 'lucide-react';
import { Order, PaymentStatus, OrderStatus } from '../types';
import {
  fetchAllOrdersAdmin,
  updateOrderPaymentStatus,
  updateOrderFulfillmentStatus,
  getSignedPdfUrl,
} from '../lib/supabase';
import { PRICE_PER_PAGE } from '../lib/pdfUtils';

interface AdminDashboardProps {
  onViewPdf: (url: string, fileName: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onViewPdf }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [orderFilter, setOrderFilter] = useState<string>('all');
  const [copiedRefId, setCopiedRefId] = useState<string | null>(null);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);

  const loadAllOrders = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchAllOrdersAdmin();
      setOrders(data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to load orders. Please make sure you have admin permissions.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllOrders();
  }, []);

  const handleUpdatePayment = async (orderId: string, newStatus: PaymentStatus) => {
    try {
      await updateOrderPaymentStatus(orderId, newStatus);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, payment_status: newStatus } : o))
      );
    } catch (err) {
      console.error(err);
      alert('Failed to update payment status. Please try again.');
    }
  };

  const handleUpdateFulfillment = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateOrderFulfillmentStatus(orderId, newStatus);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, order_status: newStatus } : o))
      );
    } catch (err) {
      console.error(err);
      alert('Failed to update order status. Please try again.');
    }
  };

  const handleOpenPdf = async (order: Order) => {
    setPdfLoadingId(order.id);
    try {
      const signedUrl = await getSignedPdfUrl(order.pdf_path);
      const fileName = order.pdf_path.split('/').pop()?.replace(/^\d+-/, '') || 'Document.pdf';
      onViewPdf(signedUrl, fileName);
    } catch (err) {
      console.error(err);
      alert('Could not generate signed URL for PDF download.');
    } finally {
      setPdfLoadingId(null);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRefId(id);
    setTimeout(() => setCopiedRefId(null), 2000);
  };

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      order.name.toLowerCase().includes(q) ||
      order.id.toLowerCase().includes(q) ||
      order.pdf_path.toLowerCase().includes(q) ||
      (order.payment_ref && order.payment_ref.toLowerCase().includes(q)) ||
      (order.profiles?.email && order.profiles.email.toLowerCase().includes(q));

    const matchesPayment = paymentFilter === 'all' || order.payment_status === paymentFilter;
    const matchesOrder = orderFilter === 'all' || order.order_status === orderFilter;

    return matchesSearch && matchesPayment && matchesOrder;
  });

  // Calculate KPIs
  const totalOrdersCount = orders.length;
  const pendingVerificationCount = orders.filter((o) => o.payment_status === 'paid' || o.payment_status === 'pending').length;
  const printingCount = orders.filter((o) => o.order_status === 'printing').length;
  const completedCount = orders.filter((o) => o.order_status === 'completed').length;
  const totalRevenue = orders
    .filter((o) => o.payment_status === 'verified')
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold mb-1">
            <Shield className="w-3.5 h-3.5 text-purple-400" />
            <span>Shop Owner Admin Control</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Print Order Management
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
            Verify UPI payments, download customer PDFs, and dispatch print jobs.
          </p>
        </div>

        <button
          type="button"
          onClick={loadAllOrders}
          className="self-start sm:self-center px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-semibold text-xs sm:text-sm shadow-xs transition flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh All</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-2xl flex items-start gap-3 text-sm text-rose-300">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-md backdrop-blur-md">
          <p className="text-xs font-semibold text-slate-400">Total Orders</p>
          <p className="text-2xl font-black text-white mt-1">{totalOrdersCount}</p>
        </div>

        <div className="bg-amber-950/20 p-4 rounded-2xl border border-amber-500/30 shadow-md backdrop-blur-md">
          <p className="text-xs font-semibold text-amber-300">Needs Verification</p>
          <p className="text-2xl font-black text-amber-400 mt-1">{pendingVerificationCount}</p>
        </div>

        <div className="bg-indigo-950/20 p-4 rounded-2xl border border-indigo-500/30 shadow-md backdrop-blur-md">
          <p className="text-xs font-semibold text-indigo-300">Currently Printing</p>
          <p className="text-2xl font-black text-indigo-400 mt-1">{printingCount}</p>
        </div>

        <div className="bg-emerald-950/20 p-4 rounded-2xl border border-emerald-500/30 shadow-md backdrop-blur-md">
          <p className="text-xs font-semibold text-emerald-300">Completed</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">{completedCount}</p>
        </div>

        <div className="bg-purple-950/20 p-4 rounded-2xl border border-purple-500/30 shadow-md backdrop-blur-md col-span-2 md:col-span-1">
          <p className="text-xs font-semibold text-purple-300">Verified Revenue</p>
          <p className="text-2xl font-black text-purple-400 mt-1">₹{totalRevenue.toFixed(2)}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-md space-y-3.5 backdrop-blur-md">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by customer name, email, UTR, or file..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm border border-slate-700 bg-slate-950/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition"
            />
          </div>

          {/* Payment Status Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs font-bold text-slate-500 uppercase mr-1">Payment:</span>
            {['all', 'paid', 'verified', 'pending', 'rejected'].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setPaymentFilter(status)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize whitespace-nowrap transition ${
                  paymentFilter === status
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Order Fulfillment Status Filter */}
        <div className="flex items-center gap-1.5 pt-2.5 border-t border-slate-800 overflow-x-auto">
          <span className="text-xs font-bold text-slate-500 uppercase mr-1">Fulfillment:</span>
          {['all', 'pending', 'printing', 'completed'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setOrderFilter(status)}
              className={`px-3 py-1 rounded-lg text-xs font-bold capitalize whitespace-nowrap transition ${
                orderFilter === status
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table & Cards */}
      {isLoading ? (
        <div className="p-16 text-center bg-slate-900/80 rounded-3xl border border-slate-800 space-y-3">
          <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-400 font-medium">Fetching orders from database...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-16 text-center bg-slate-900/80 rounded-3xl border border-slate-800 space-y-3 backdrop-blur-md">
          <div className="w-16 h-16 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-2xl flex items-center justify-center mx-auto">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-white">No matching orders found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try adjusting your search criteria or filter to see more results.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const rawFileName = order.pdf_path.split('/').pop()?.replace(/^\d+-/, '') || 'Document.pdf';
            const formattedDate = new Date(order.created_at).toLocaleString('en-IN', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={order.id}
                className="bg-slate-900/80 rounded-2xl p-5 border border-slate-800 shadow-md hover:border-slate-700 transition space-y-4 backdrop-blur-md"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 rounded-md">
                      #{order.id.slice(-6).toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-400">{formattedDate}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Payment badge */}
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${
                        order.payment_status === 'verified'
                          ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                          : order.payment_status === 'paid'
                          ? 'bg-sky-500/15 border border-sky-500/30 text-sky-300'
                          : order.payment_status === 'rejected'
                          ? 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                          : 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                      }`}
                    >
                      Payment: {order.payment_status}
                    </span>

                    {/* Order status badge */}
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${
                        order.order_status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                          : order.order_status === 'printing'
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      Status: {order.order_status}
                    </span>
                  </div>
                </div>

                {/* Grid details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  {/* Customer & Document info */}
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white">{order.name}</p>
                    {order.profiles?.email && (
                      <p className="text-xs text-slate-400">{order.profiles.email}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-slate-300 pt-1">
                      <FileText className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span className="truncate max-w-[200px]" title={rawFileName}>
                        {rawFileName}
                      </span>
                    </div>
                  </div>

                  {/* Calculations & Payment Ref */}
                  <div className="space-y-1.5">
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-black text-indigo-400">
                        ₹{Number(order.amount).toFixed(2)}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        ({order.pages} pages × ₹{PRICE_PER_PAGE})
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400 font-semibold uppercase">UTR:</span>
                      {order.payment_ref ? (
                        <div className="flex items-center gap-1">
                          <code className="text-xs font-mono font-bold bg-slate-950 px-2 py-0.5 rounded text-indigo-300 border border-slate-800">
                            {order.payment_ref}
                          </code>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(order.payment_ref!, order.id)}
                            className="p-1 text-slate-400 hover:text-slate-200 rounded transition"
                            title="Copy UTR"
                          >
                            {copiedRefId === order.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 italic">None provided</span>
                      )}
                    </div>
                  </div>

                  {/* PDF Actions */}
                  <div className="flex items-center md:justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenPdf(order)}
                      disabled={pdfLoadingId === order.id}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 font-bold text-xs transition disabled:opacity-50"
                    >
                      {pdfLoadingId === order.id ? (
                        <div className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      <span>Open / Print PDF</span>
                    </button>
                  </div>
                </div>

                {/* Management Action Bar */}
                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  {/* Payment Verification actions */}
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-400">Payment:</span>
                    <button
                      type="button"
                      onClick={() => handleUpdatePayment(order.id, 'verified')}
                      disabled={order.payment_status === 'verified'}
                      className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 ${
                        order.payment_status === 'verified'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verify</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdatePayment(order.id, 'rejected')}
                      disabled={order.payment_status === 'rejected'}
                      className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 ${
                        order.payment_status === 'rejected'
                          ? 'bg-rose-600 text-white'
                          : 'bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20'
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>

                  {/* Order fulfillment status actions */}
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-400">Print Status:</span>
                    <select
                      value={order.order_status}
                      onChange={(e) => handleUpdateFulfillment(order.id, e.target.value as OrderStatus)}
                      className="bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg font-bold text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    >
                      <option value="pending">Pending</option>
                      <option value="printing">Printing</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
