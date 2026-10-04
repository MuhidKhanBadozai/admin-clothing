import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { CustomerOrder, OrderStatus, PaymentMethod, PaymentStatus } from '../types/order';
import {
  Search,
  Filter,
  Download,
  Printer,
  ExternalLink,
  ChevronRight,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Truck,
  CheckCircle,
  Clock,
  AlertCircle,
  Package,
  X,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  DollarSign,
  Send,
  MessageSquare,
  FileText,
  User,
  Check,
  Trash2
} from 'lucide-react';

export const OrdersDashboard: React.FC = () => {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | OrderStatus>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | PaymentMethod>('ALL');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);

  // Active Order Detail Modal
  const [activeOrder, setActiveOrder] = useState<CustomerOrder | null>(null);

  // Status updating state
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  // Logistics tracking inputs inside detail modal
  const [courierInput, setCourierInput] = useState('');
  const [trackingInput, setTrackingInput] = useState('');
  const [adminNotesInput, setAdminNotesInput] = useState('');
  const [savingLogistics, setSavingLogistics] = useState(false);

  // Print Invoice Modal
  const [printInvoiceOrder, setPrintInvoiceOrder] = useState<CustomerOrder | null>(null);

  // Real-time Firestore Subscription
  useEffect(() => {
    setLoading(true);
    try {
      const ordersRef = collection(db, 'orders');
      // Using query without strict composite index order requirement to avoid index warnings
      const unsubscribe = onSnapshot(
        ordersRef,
        (snapshot) => {
          const fetchedOrders: CustomerOrder[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              orderId: data.orderId || docSnap.id,
              customerName: data.customerName || 'Guest Customer',
              email: data.email || 'N/A',
              phone: data.phone || 'N/A',
              address: data.address || 'N/A',
              city: data.city || 'N/A',
              province: data.province || 'N/A',
              postalCode: data.postalCode || '',
              country: data.country || 'Pakistan',
              orderNotes: data.orderNotes || '',
              items: Array.isArray(data.items) ? data.items : [],
              subtotal: Number(data.subtotal) || 0,
              shippingFee: Number(data.shippingFee) || 0,
              discount: Number(data.discount) || 0,
              total: Number(data.total) || 0,
              status: (data.status as OrderStatus) || 'PROCESSING',
              paymentMethod: (data.paymentMethod as PaymentMethod) || 'COD',
              paymentStatus: (data.paymentStatus as PaymentStatus) || (data.paymentMethod === 'CARD' ? 'PAID' : 'PENDING'),
              courier: data.courier || '',
              trackingNumber: data.trackingNumber || '',
              adminNotes: data.adminNotes || '',
              createdAt: data.createdAt || new Date().toISOString(),
              updatedAt: data.updatedAt || new Date().toISOString(),
            };
          });

          // Sort in memory by createdAt descending
          fetchedOrders.sort((a, b) => {
            const dateA = new Date(a.createdAt).getTime() || 0;
            const dateB = new Date(b.createdAt).getTime() || 0;
            return dateB - dateA;
          });

          setOrders(fetchedOrders);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error('Error fetching real-time orders:', err);
          setError('Failed to connect to real-time orders stream.');
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (e: any) {
      console.error('Firestore init error:', e);
      setError(e.message || 'Firestore connection error');
      setLoading(false);
    }
  }, []);

  // Update logistics fields when opening an active order
  useEffect(() => {
    if (activeOrder) {
      setCourierInput(activeOrder.courier || 'Leopards Courier');
      setTrackingInput(activeOrder.trackingNumber || '');
      setAdminNotesInput(activeOrder.adminNotes || '');
    }
  }, [activeOrder]);

  // Keep activeOrder in sync if the list updates
  useEffect(() => {
    if (activeOrder) {
      const current = orders.find((o) => o.orderId === activeOrder.orderId);
      if (current) {
        setActiveOrder(current);
      }
    }
  }, [orders]);

  // Status Change Handler
  const handleUpdateStatus = async (order: CustomerOrder, newStatus: OrderStatus) => {
    setUpdatingStatusId(order.orderId);
    try {
      const orderDocRef = doc(db, 'orders', order.orderId);
      await updateDoc(orderDocRef, {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to update order status:', err);
      alert('Could not update order status in Firebase.');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // Payment Status Toggle
  const handleTogglePaymentStatus = async (order: CustomerOrder) => {
    const nextStatus: PaymentStatus = order.paymentStatus === 'PAID' ? 'PENDING' : 'PAID';
    try {
      const orderDocRef = doc(db, 'orders', order.orderId);
      await updateDoc(orderDocRef, {
        paymentStatus: nextStatus,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to update payment status:', err);
    }
  };

  // Save Courier & Tracking Details
  const handleSaveLogistics = async () => {
    if (!activeOrder) return;
    setSavingLogistics(true);
    try {
      const orderDocRef = doc(db, 'orders', activeOrder.orderId);
      await updateDoc(orderDocRef, {
        courier: courierInput.trim(),
        trackingNumber: trackingInput.trim(),
        adminNotes: adminNotesInput.trim(),
        updatedAt: new Date().toISOString(),
      });
      alert('Tracking & logistics updated successfully!');
    } catch (err) {
      console.error('Error saving logistics:', err);
      alert('Failed to save logistics details.');
    } finally {
      setSavingLogistics(false);
    }
  };

  // Delete Order
  const handleDeleteOrder = async (orderId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete order #${orderId}? This cannot be undone.`)) {
      try {
        await deleteDoc(doc(db, 'orders', orderId));
        if (activeOrder?.orderId === orderId) {
          setActiveOrder(null);
        }
      } catch (err) {
        console.error('Failed to delete order:', err);
        alert('Failed to delete order.');
      }
    }
  };

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Search match
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !term ||
        o.orderId.toLowerCase().includes(term) ||
        o.customerName.toLowerCase().includes(term) ||
        o.email.toLowerCase().includes(term) ||
        o.phone.toLowerCase().includes(term) ||
        o.city.toLowerCase().includes(term) ||
        o.items.some(
          (it) =>
            it.name.toLowerCase().includes(term) ||
            it.sku.toLowerCase().includes(term) ||
            it.size.toLowerCase().includes(term)
        );

      // Status match
      let matchesStatus = true;
      if (statusFilter === 'PROCESSING') {
        matchesStatus = o.status === 'PROCESSING' || o.status === 'PENDING';
      } else if (statusFilter !== 'ALL') {
        matchesStatus = o.status === statusFilter;
      }

      // Payment match
      let matchesPayment = true;
      if (paymentFilter !== 'ALL') {
        matchesPayment = o.paymentMethod === paymentFilter;
      }

      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [orders, searchTerm, statusFilter, paymentFilter]);

  // Summary Metrics (Shopify Style)
  const stats = useMemo(() => {
    const totalOrdersCount = orders.length;
    const totalRevenue = orders.reduce((sum, o) => (o.status !== 'CANCELLED' ? sum + o.total : sum), 0);
    const unfulfilledCount = orders.filter((o) => o.status === 'PROCESSING' || o.status === 'PENDING').length;
    const confirmedCount = orders.filter((o) => o.status === 'CONFIRMED').length;
    const deliveredCount = orders.filter((o) => o.status === 'DELIVERED').length;
    const aov = totalOrdersCount > 0 ? Math.round(totalRevenue / (totalOrdersCount - orders.filter(o => o.status === 'CANCELLED').length || 1)) : 0;

    return {
      totalOrdersCount,
      totalRevenue,
      unfulfilledCount,
      confirmedCount,
      deliveredCount,
      aov,
    };
  }, [orders]);

  // Export to CSV (Shopify orders format)
  const handleExportCsv = () => {
    const headers = [
      'Order ID',
      'Date',
      'Customer Name',
      'Email',
      'Phone',
      'Address',
      'City',
      'Province',
      'Postal Code',
      'Items Ordered (SKU - Size - Qty)',
      'Subtotal PKR',
      'Shipping PKR',
      'Total PKR',
      'Payment Method',
      'Payment Status',
      'Order Status',
      'Courier',
      'Tracking Number',
      'Customer Notes'
    ];

    const rows = filteredOrders.map((o) => {
      const itemsString = o.items
        .map((i) => `${i.name} [Size: ${i.size}, SKU: ${i.sku}, Qty: ${i.quantity}]`)
        .join(' | ');

      return [
        `"${o.orderId}"`,
        `"${new Date(o.createdAt).toLocaleString()}"`,
        `"${o.customerName.replace(/"/g, '""')}"`,
        `"${o.email}"`,
        `"${o.phone}"`,
        `"${o.address.replace(/"/g, '""')}"`,
        `"${o.city}"`,
        `"${o.province || ''}"`,
        `"${o.postalCode || ''}"`,
        `"${itemsString.replace(/"/g, '""')}"`,
        o.subtotal,
        o.shippingFee,
        o.total,
        `"${o.paymentMethod}"`,
        `"${o.paymentStatus || 'PENDING'}"`,
        `"${o.status}"`,
        `"${o.courier || ''}"`,
        `"${o.trackingNumber || ''}"`,
        `"${(o.orderNotes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `fama-orders-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper for Formatting PKR
  const formatPkr = (val: number) => {
    return `Rs. ${val.toLocaleString('en-PK')}`;
  };

  // Status Badge Component
  const renderStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING':
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span>Unfulfilled</span>
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>Confirmed</span>
          </span>
        );
      case 'SHIPPED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200">
            <Truck className="w-3 h-3 text-purple-600" />
            <span>In Transit</span>
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle className="w-3 h-3 text-emerald-600" />
            <span>Delivered</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>Cancelled</span>
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  // Payment Badge Component
  const renderPaymentBadge = (method: PaymentMethod, paymentStatus?: PaymentStatus) => {
    if (paymentStatus === 'PAID') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Check className="w-3 h-3 text-emerald-600" />
          <span>Paid ({method})</span>
        </span>
      );
    }
    if (method === 'COD') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
          <span>COD (Due)</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
        <span>Wire ({paymentStatus || 'Pending'})</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* ─── Shopify KPI Cards Row ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Sales</span>
            <span className="text-2xl font-bold text-slate-900 tracking-tight mt-1 block">
              {formatPkr(stats.totalRevenue)}
            </span>
            <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" />
              <span>{stats.totalOrdersCount} orders placed</span>
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Unfulfilled Orders */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">To Fulfill</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold text-slate-900 tracking-tight">
                {stats.unfulfilledCount}
              </span>
              {stats.unfulfilledCount > 0 && (
                <span className="text-[10px] uppercase font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full animate-pulse">
                  Action Needed
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">Awaiting confirmation/dispatch</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Confirmed & In Transit */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Confirmed &amp; Shipped</span>
            <span className="text-2xl font-bold text-slate-900 tracking-tight mt-1 block">
              {stats.confirmedCount + (orders.filter(o => o.status === 'SHIPPED').length)}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">Processing with couriers</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Truck className="w-6 h-6" />
          </div>
        </div>

        {/* Average Order Value (AOV) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Avg Order Value</span>
            <span className="text-2xl font-bold text-slate-900 tracking-tight mt-1 block">
              {formatPkr(stats.aov)}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">Per customer transaction</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ─── Shopify Filter & Search Bar ──────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Top Tab Bar (All, Unfulfilled, Confirmed, Shipped, Delivered, Cancelled) */}
        <div className="border-b border-slate-200 px-4 flex items-center justify-between overflow-x-auto">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`py-3.5 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === 'ALL'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>All Orders</span>
              <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-full text-[10px]">
                {orders.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('PROCESSING')}
              className={`py-3.5 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === 'PROCESSING'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Unfulfilled</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                stats.unfulfilledCount > 0 ? 'bg-amber-100 text-amber-800 font-bold' : 'bg-slate-100 text-slate-700'
              }`}>
                {stats.unfulfilledCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('CONFIRMED')}
              className={`py-3.5 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === 'CONFIRMED'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Confirmed</span>
              <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-full text-[10px]">
                {stats.confirmedCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('SHIPPED')}
              className={`py-3.5 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === 'SHIPPED'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Shipped</span>
              <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-full text-[10px]">
                {orders.filter((o) => o.status === 'SHIPPED').length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('DELIVERED')}
              className={`py-3.5 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === 'DELIVERED'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Delivered</span>
              <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-full text-[10px]">
                {stats.deliveredCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('CANCELLED')}
              className={`py-3.5 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === 'CANCELLED'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Cancelled</span>
              <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-full text-[10px]">
                {orders.filter((o) => o.status === 'CANCELLED').length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 pl-4 py-2 shrink-0">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Row */}
        <div className="p-3.5 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by order ID, customer, phone, city, SKU or size..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Payment:</span>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as any)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Payments</option>
              <option value="COD">Cash on Delivery (COD)</option>
              <option value="CARD">Credit / Debit Card</option>
              <option value="BANK_TRANSFER">Direct Bank Wire</option>
            </select>
          </div>
        </div>

        {/* ─── Shopify Orders Table ────────────────────────────────────── */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-16 text-center text-slate-500 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
              <p className="text-sm font-medium">Listening for orders from FAMA in real-time...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-16 text-center text-slate-500 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Package className="w-6 h-6" />
              </div>
              <p className="text-base font-semibold text-slate-800">No orders match your criteria</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                When customers place an order on the FAMA luxury website, their details, items, and sizes will immediately show up here.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4">Order ID &amp; Date</th>
                  <th className="py-3 px-4">Customer Details</th>
                  <th className="py-3 px-4">Items &amp; Size Breakdown</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Fulfillment Status</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredOrders.map((order) => {
                  const orderDate = new Date(order.createdAt);
                  const isRecent = Date.now() - orderDate.getTime() < 1000 * 60 * 30; // within 30 mins

                  return (
                    <tr
                      key={order.orderId}
                      onClick={() => setActiveOrder(order)}
                      className="hover:bg-slate-50/90 transition-colors cursor-pointer group"
                    >
                      {/* 1. Order ID & Date */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            #{order.orderId}
                          </span>
                          {isRecent && (
                            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded-full uppercase tracking-wider">
                              New
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          {orderDate.toLocaleDateString('en-PK', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}{' '}
                          ·{' '}
                          {orderDate.toLocaleTimeString('en-PK', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>

                      {/* 2. Customer */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{order.customerName}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{order.city}{order.province ? `, ${order.province}` : ''}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{order.phone}</span>
                        </div>
                      </td>

                      {/* 3. Items & Size Breakdown */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1.5 max-w-sm">
                          {order.items.slice(0, 2).map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              {item.image && (
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="w-7 h-9 object-cover rounded-xs border border-slate-200 shrink-0"
                                />
                              )}
                              <div className="min-w-0">
                                <div className="font-medium text-slate-800 truncate text-[11px]">
                                  {item.name}
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                  <span className="font-mono bg-slate-100 text-slate-700 px-1 rounded-xs">
                                    SKU: {item.sku}
                                  </span>
                                  {/* PROMINENT SIZE BADGE */}
                                  <span className="font-bold bg-neutral-900 text-white px-1.5 py-0.2 rounded-xs">
                                    Size: {item.size}
                                  </span>
                                  <span className="font-semibold">Qty: {item.quantity}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                          {order.items.length > 2 && (
                            <span className="text-[10px] text-indigo-600 font-medium block">
                              +{order.items.length - 2} more item(s) in order
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 4. Payment */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderPaymentBadge(order.paymentMethod, order.paymentStatus)}
                      </td>

                      {/* 5. Fulfillment Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderStatusBadge(order.status)}
                      </td>

                      {/* 6. Total Amount */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className="font-bold text-slate-900 block font-mono text-sm">
                          {formatPkr(order.total)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {order.items.length} item{order.items.length > 1 ? 's' : ''}
                        </span>
                      </td>

                      {/* 7. Action Button */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveOrder(order);
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 text-xs font-medium transition-colors inline-flex items-center gap-1"
                        >
                          <span>Details</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ─── SHOPIFY-STYLE ORDER DETAIL DRAWER / MODAL ────────────────────── */}
      {activeOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setActiveOrder(null)}
          />

          <div className="min-h-full flex items-center justify-center p-3 sm:p-6">
            <div className="relative w-full max-w-4xl bg-slate-50 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 text-slate-800">
              {/* Header Bar */}
              <div className="bg-white px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900 font-mono">
                        #{activeOrder.orderId}
                      </h2>
                      {renderStatusBadge(activeOrder.status)}
                      {renderPaymentBadge(activeOrder.paymentMethod, activeOrder.paymentStatus)}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Placed on {new Date(activeOrder.createdAt).toLocaleString('en-PK', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Status Dropdown */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
                    <span className="text-[11px] font-semibold text-slate-500 px-2">Status:</span>
                    <select
                      value={activeOrder.status}
                      disabled={updatingStatusId === activeOrder.orderId}
                      onChange={(e) => handleUpdateStatus(activeOrder, e.target.value as OrderStatus)}
                      className="bg-white border border-slate-300 rounded-md px-2.5 py-1 font-semibold text-slate-800 focus:outline-none cursor-pointer"
                    >
                      <option value="PROCESSING">Processing / Unfulfilled</option>
                      <option value="CONFIRMED">Confirmed</option>
                      <option value="SHIPPED">Shipped (In Transit)</option>
                      <option value="DELIVERED">Delivered</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>

                  {/* Print Packing Slip / Invoice */}
                  <button
                    type="button"
                    onClick={() => setPrintInvoiceOrder(activeOrder)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-500" />
                    <span>Print Slip</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteOrder(activeOrder.orderId)}
                    title="Delete order"
                    className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveOrder(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Content - Two Column Shopify Layout */}
              <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 max-h-[78vh] overflow-y-auto">
                {/* ─── LEFT COLUMN: ITEMS & FINANCIALS (2 Cols) ─────────── */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Items Ordered Card */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-indigo-600" />
                        <h3 className="text-sm font-bold text-slate-900">
                          Items Ordered ({activeOrder.items.length})
                        </h3>
                      </div>
                      <span className="text-xs text-slate-500 font-mono">
                        {activeOrder.items.reduce((s, it) => s + it.quantity, 0)} Total Units
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {activeOrder.items.map((item, idx) => (
                        <div key={idx} className="py-3.5 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-14 h-18 object-cover rounded-md border border-slate-200 shrink-0"
                              />
                            ) : (
                              <div className="w-14 h-18 bg-slate-100 rounded-md flex items-center justify-center text-slate-400 shrink-0">
                                <Package className="w-6 h-6" />
                              </div>
                            )}

                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-slate-900 truncate">
                                {item.name}
                              </h4>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className="text-[11px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded-sm">
                                  SKU: {item.sku}
                                </span>
                                {/* PROMINENT SIZE BADGE */}
                                <span className="text-xs font-bold bg-neutral-900 text-white px-2.5 py-0.5 rounded-sm shadow-2xs">
                                  SIZE: {item.size}
                                </span>
                              </div>
                              <span className="text-xs text-slate-500 mt-1 block">
                                {formatPkr(item.price)} × {item.quantity} unit{item.quantity > 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-sm font-bold text-slate-900 font-mono block">
                              {formatPkr(item.price * item.quantity)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Financial Summary */}
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs">
                      <div className="flex justify-between text-slate-500">
                        <span>Subtotal:</span>
                        <span className="font-mono font-medium">{formatPkr(activeOrder.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Shipping Delivery Fee:</span>
                        <span className="font-mono font-medium">
                          {activeOrder.shippingFee === 0 ? 'FREE' : formatPkr(activeOrder.shippingFee)}
                        </span>
                      </div>
                      {activeOrder.discount ? (
                        <div className="flex justify-between text-emerald-600 font-medium">
                          <span>Discount Applied:</span>
                          <span className="font-mono">-{formatPkr(activeOrder.discount)}</span>
                        </div>
                      ) : null}
                      <div className="flex justify-between border-t border-slate-200 pt-2.5 text-sm font-bold text-slate-900">
                        <span>Total Paid / Payable:</span>
                        <span className="font-mono text-base">{formatPkr(activeOrder.total)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Fulfillment & Courier Logistics Card */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-indigo-600" />
                        <h3 className="text-sm font-bold text-slate-900">Fulfillment &amp; Courier Logistics</h3>
                      </div>
                      <button
                        type="button"
                        onClick={handleSaveLogistics}
                        disabled={savingLogistics}
                        className="px-3 py-1 bg-indigo-600 text-white rounded-md text-xs font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                      >
                        {savingLogistics ? 'Saving...' : 'Save Logistics'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-slate-500 font-medium mb-1">Courier Partner</label>
                        <select
                          value={courierInput}
                          onChange={(e) => setCourierInput(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-indigo-500"
                        >
                          <option value="Leopards Courier">Leopards Courier</option>
                          <option value="TCS Express">TCS Express</option>
                          <option value="Trax Logistics">Trax Logistics</option>
                          <option value="Call Courier">Call Courier</option>
                          <option value="PostEx">PostEx</option>
                          <option value="M&P Logistics">M&amp;P Logistics</option>
                          <option value="Store Rider (Karachi)">Store Rider (Karachi Same Day)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-500 font-medium mb-1">Tracking Number / Airway Bill</label>
                        <input
                          type="text"
                          placeholder="e.g. LPC10482950"
                          value={trackingInput}
                          onChange={(e) => setTrackingInput(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-500 font-medium mb-1">Internal Admin Notes</label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Customer called to confirm morning delivery slot; parcel packed in bag #4..."
                        value={adminNotesInput}
                        onChange={(e) => setAdminNotesInput(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* ─── RIGHT RAIL: CUSTOMER & SHIPPING (1 Col) ──────────── */}
                <div className="space-y-6">
                  {/* Customer Card */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <User className="w-4 h-4 text-indigo-600" />
                      <h3 className="text-sm font-bold text-slate-900">Customer Details</h3>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Full Name</span>
                        <span className="font-bold text-slate-900 text-sm">{activeOrder.customerName}</span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[11px]">Contact Phone</span>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <span className="font-mono font-medium text-slate-800">{activeOrder.phone}</span>
                          <div className="flex items-center gap-1">
                            {/* Direct WhatsApp message link */}
                            <a
                              href={`https://wa.me/${activeOrder.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                                `Hello ${activeOrder.customerName}, this is regarding your FAMA order #${activeOrder.orderId}.`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-0.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-md font-semibold text-[10px] flex items-center gap-1 transition-colors"
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>WhatsApp</span>
                            </a>
                            <a
                              href={`tel:${activeOrder.phone}`}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[11px]">Email Address</span>
                        <a
                          href={`mailto:${activeOrder.email}?subject=FAMA Order ${activeOrder.orderId}`}
                          className="font-medium text-indigo-600 hover:underline flex items-center gap-1 mt-0.5"
                        >
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span className="truncate">{activeOrder.email}</span>
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Delivery Address Card */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <MapPin className="w-4 h-4 text-indigo-600" />
                      <h3 className="text-sm font-bold text-slate-900">Delivery Address</h3>
                    </div>

                    <div className="text-xs space-y-1.5">
                      <div className="text-slate-800 font-medium leading-relaxed">
                        {activeOrder.address}
                      </div>
                      <div className="text-slate-600 font-semibold">
                        {activeOrder.city}, {activeOrder.province || 'Pakistan'} {activeOrder.postalCode ? `(${activeOrder.postalCode})` : ''}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Country: {activeOrder.country || 'Pakistan'}
                      </div>
                    </div>

                    {/* Customer Delivery Notes */}
                    {activeOrder.orderNotes && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                          Special Instructions:
                        </span>
                        <div className="p-2.5 bg-amber-50/60 border border-amber-200/80 rounded-lg text-amber-900 text-xs italic">
                          "{activeOrder.orderNotes}"
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Payment Details Card */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-indigo-600" />
                        <h3 className="text-sm font-bold text-slate-900">Payment Status</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleTogglePaymentStatus(activeOrder)}
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md transition-colors ${
                          activeOrder.paymentStatus === 'PAID'
                            ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                            : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        }`}
                      >
                        {activeOrder.paymentStatus === 'PAID' ? 'Mark as Unpaid' : 'Mark as Paid'}
                      </button>
                    </div>

                    <div className="text-xs space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Method:</span>
                        <span className="font-semibold text-slate-900">
                          {activeOrder.paymentMethod === 'COD'
                            ? 'Cash on Delivery'
                            : activeOrder.paymentMethod === 'CARD'
                            ? 'Credit / Debit Card'
                            : 'Direct Bank Wire'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Payment Status:</span>
                        <span>{renderPaymentBadge(activeOrder.paymentMethod, activeOrder.paymentStatus)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── PRINTABLE INVOICE / PACKING SLIP MODAL ───────────────────────── */}
      {printInvoiceOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto print:p-0 print:shadow-none">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-6">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">FAMMA</h1>
                <p className="text-xs text-slate-500 uppercase tracking-widest mt-0.5">Luxury Apparel &amp; Pret</p>
                <p className="text-xs text-slate-500 mt-1">support@fama.pk · +92 300 1234567</p>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold font-mono text-slate-900 block">
                  ORDER #{printInvoiceOrder.orderId}
                </span>
                <span className="text-xs text-slate-500 block mt-0.5">
                  Date: {new Date(printInvoiceOrder.createdAt).toLocaleDateString()}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 rounded-sm mt-1 inline-block">
                  {printInvoiceOrder.paymentMethod} · {printInvoiceOrder.paymentStatus || 'PENDING'}
                </span>
              </div>
            </div>

            {/* Recipient & Shipping info */}
            <div className="grid grid-cols-2 gap-6 text-xs border-b border-slate-200 pb-6">
              <div>
                <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px] block mb-1">
                  Deliver To:
                </span>
                <p className="font-bold text-slate-900 text-sm">{printInvoiceOrder.customerName}</p>
                <p className="text-slate-600 mt-0.5">{printInvoiceOrder.address}</p>
                <p className="text-slate-600">{printInvoiceOrder.city}, {printInvoiceOrder.province} {printInvoiceOrder.postalCode}</p>
                <p className="text-slate-800 font-mono mt-1 font-medium">{printInvoiceOrder.phone}</p>
              </div>

              <div>
                <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px] block mb-1">
                  Logistics &amp; Courier:
                </span>
                <p className="text-slate-700">Courier: <strong>{printInvoiceOrder.courier || 'Leopards / TCS'}</strong></p>
                <p className="text-slate-700 font-mono">Tracking: <strong>{printInvoiceOrder.trackingNumber || 'Pending Dispatch'}</strong></p>
                {printInvoiceOrder.orderNotes && (
                  <p className="text-amber-800 italic mt-2 bg-amber-50 p-2 rounded-xs">
                    "{printInvoiceOrder.orderNotes}"
                  </p>
                )}
              </div>
            </div>

            {/* Itemized Table */}
            <div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase font-bold text-left">
                    <th className="py-2">Item Description</th>
                    <th className="py-2">SKU</th>
                    <th className="py-2 text-center">Size</th>
                    <th className="py-2 text-center">Qty</th>
                    <th className="py-2 text-right">Price</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {printInvoiceOrder.items.map((item, i) => (
                    <tr key={i} className="py-2">
                      <td className="py-2 font-medium text-slate-900">{item.name}</td>
                      <td className="py-2 font-mono text-slate-500">{item.sku}</td>
                      <td className="py-2 text-center font-bold">{item.size}</td>
                      <td className="py-2 text-center">{item.quantity}</td>
                      <td className="py-2 text-right font-mono">{formatPkr(item.price)}</td>
                      <td className="py-2 text-right font-bold font-mono">{formatPkr(item.price * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-4 pt-4 border-t border-slate-200 space-y-1 text-xs text-right">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal:</span>
                  <span className="font-mono">{formatPkr(printInvoiceOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Shipping:</span>
                  <span className="font-mono">{printInvoiceOrder.shippingFee === 0 ? 'FREE' : formatPkr(printInvoiceOrder.shippingFee)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-2">
                  <span>Total Due / Paid:</span>
                  <span className="font-mono text-base">{formatPkr(printInvoiceOrder.total)}</span>
                </div>
              </div>
            </div>

            {/* Actions for modal */}
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 print:hidden">
              <button
                type="button"
                onClick={() => setPrintInvoiceOrder(null)}
                className="px-4 py-2 border border-slate-200 text-xs font-semibold rounded-lg hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 shadow-md flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Invoice / Slip</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
