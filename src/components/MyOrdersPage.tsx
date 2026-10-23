import React, { useEffect, useState } from 'react';
import {
  Package,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Search,
  Eye,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Order, PaymentStatus, OrderStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { fetchCustomerOrders, getSignedPdfUrl } from '../lib/supabase';
import { PRICE_PER_PAGE } from '../lib/pdfUtils';

interface MyOrdersPageProps {
  onNewOrderClick: () => void;
  onViewPdf: (url: string, fileName: string) => void;
}

export const MyOrdersPage: React.FC<MyOrdersPageProps> = ({ onNewOrderClick, onViewPdf }) => {
  const { user, profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loadingPdfId, setLoadingPdfId] = useState<string | null>(null);

  const userId = user?.id || profile?.id || 'demo-customer';

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const data = await fetchCustomerOrders(userId);
      setOrders(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [userId]);

  const handleOpenPdf = async (order: Order) => {
    setLoadingPdfId(order.id);
    try {
      const signedUrl = await getSignedPdfUrl(order.pdf_path);
      const fileName = order.pdf_path.split('/').pop()?.replace(/^\d+-/, '') || 'Document.pdf';
      onViewPdf(signedUrl, fileName);
    } catch (err) {
      console.error(err);
      alert('Could not generate secure link for this PDF. Please try again.');
    } finally {
      setLoadingPdfId(null);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.pdf_path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.payment_ref && order.payment_ref.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' ||
      order.payment_status === statusFilter ||
      order.order_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getPaymentStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Verified
          </span>
        );
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-500/15 border border-sky-500/30 text-sky-300">
            <Clock className="w-3.5 h-3.5" />
            Paid (Reviewing)
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 border border-rose-500/30 text-rose-300">
            <XCircle className="w-3.5 h-3.5" />
            Rejected
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5" />
            Payment Pending
          </span>
        );
    }
  };

  const getOrderStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Ready for Pickup
          </span>
        );
      case 'printing':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 animate-pulse-subtle">
            <Layers className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
            Printing Now
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-800 border border-slate-700 text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            In Queue
          </span>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            My Print Orders
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
            Track status, verify payments, and access your printed documents.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadOrders}
            className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300 shadow-xs transition"
            title="Refresh Orders"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={onNewOrderClick}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/30 transition flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4" />
            <span>New Print</span>
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 shadow-md backdrop-blur-md flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by file name or UTR reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm border border-slate-700 bg-slate-950/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['all', 'paid', 'verified', 'printing', 'completed'].map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize whitespace-nowrap transition ${
                statusFilter === filter
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List / Empty State */}
      {isLoading ? (
        <div className="p-16 text-center bg-slate-900/80 rounded-3xl border border-slate-800 space-y-3">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-400 font-medium">Loading your print orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-16 text-center bg-slate-900/80 rounded-3xl border border-slate-800 space-y-4 backdrop-blur-md">
          <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto">
            <Package className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-base font-bold text-white">No print orders found</h3>
            <p className="text-xs text-slate-400">
              {searchQuery || statusFilter !== 'all'
                ? 'Try clearing your search or filter criteria.'
                : 'Upload your first PDF document to get high-quality prints at ₹3/page!'}
            </p>
          </div>
          <button
            type="button"
            onClick={onNewOrderClick}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-md shadow-indigo-600/30"
          >
            <span>Upload Document</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredOrders.map((order) => {
            const rawFileName = order.pdf_path.split('/').pop()?.replace(/^\d+-/, '') || 'Document.pdf';
            const formattedDate = new Date(order.created_at).toLocaleString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={order.id}
                className="bg-slate-900/80 rounded-2xl p-5 border border-slate-800 shadow-md hover:border-slate-700 transition space-y-4 backdrop-blur-md"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                      #{order.id.slice(-6).toUpperCase()}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-xs text-slate-400">{formattedDate}</span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {getPaymentStatusBadge(order.payment_status)}
                    {getOrderStatusBadge(order.order_status)}
                  </div>
                </div>

                {/* Main details */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center shrink-0 mt-0.5">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white break-all">{rawFileName}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Recipient: <span className="font-semibold text-slate-200">{order.name}</span>
                      </p>
                      {order.payment_ref && (
                        <p className="text-[11px] text-slate-400 font-mono mt-1">
                          UTR / Ref: <span className="text-indigo-300 font-semibold">{order.payment_ref}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Pricing Breakdown & Action */}
                  <div className="flex items-center justify-between md:justify-end gap-4 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                    <div className="text-left md:text-right">
                      <div className="text-xs text-slate-400 font-medium">
                        {order.pages} {order.pages === 1 ? 'page' : 'pages'} × ₹{PRICE_PER_PAGE}
                      </div>
                      <div className="text-xl font-black text-indigo-400 tracking-tight">
                        ₹{Number(order.amount).toFixed(2)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenPdf(order)}
                      disabled={loadingPdfId === order.id}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition disabled:opacity-50 shrink-0"
                    >
                      {loadingPdfId === order.id ? (
                        <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Eye className="w-4 h-4 text-indigo-400" />
                      )}
                      <span>View PDF</span>
                    </button>
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
