import { useState, useEffect } from 'react';
import { db } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  deleteDoc
} from 'firebase/firestore';
import {
  Package,
  PlusCircle,
  Edit3,
  Trash2,
  Layers,
  DollarSign,
  Image as ImageIcon,
  FileText,
  Tag,
  Sparkles,
  Check,
  X,
  Search,
  ExternalLink
} from 'lucide-react';

const CATEGORIES = [
  'NEW ARRIVALS', 'READY TO WEAR', 'UNSTITCHED FABRIC', 'SS WESST',
  'KIDS', 'ACCESSORIES', 'COUTURE', 'BRIDAL', 'HOME'
];

const STANDARD_SIZES = ['XS', 'S', 'M', 'L', 'XL'] as const;

interface SizeStockItem {
  size: string;
  stock: number;
}

interface ProductItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  quantity: number;
  image?: string;       // legacy cover
  images?: string[];   // [cover, img2, img3, img4, img5]
  isOnSale?: boolean;
  description?: string;
  sizes?: SizeStockItem[];
}

export default function App() {
  const [items, setItems] = useState<ProductItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State — cover photo required, 4 additional optional
  const [form, setForm] = useState({
    name: '',
    sku: '',
    category: 'READY TO WEAR',
    price: '',
    coverImage: '',
    extraImages: ['', '', '', ''] as string[],
    description: '',
    isOnSale: false,
  });

  const handleExtraImageChange = (idx: number, val: string) => {
    setForm(prev => {
      const updated = [...prev.extraImages];
      updated[idx] = val;
      return { ...prev, extraImages: updated };
    });
  };

  // Size availability and stock quantity state
  const [sizesState, setSizesState] = useState<{ [key: string]: number }>({
    XS: 0,
    S: 5,
    M: 10,
    L: 5,
    XL: 0
  });

  // Enabled sizes toggle
  const [enabledSizes, setEnabledSizes] = useState<{ [key: string]: boolean }>({
    XS: false,
    S: true,
    M: true,
    L: true,
    XL: false
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "products"));
      const data = querySnapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          ...d,
          sizes: d.sizes || []
        } as ProductItem;
      });
      setItems(data);
    } catch (err) {
      console.error("Error fetching items:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSizeStockChange = (size: string, val: string) => {
    const num = Math.max(0, parseInt(val) || 0);
    setSizesState(prev => ({ ...prev, [size]: num }));
  };

  const toggleSizeActive = (size: string) => {
    setEnabledSizes(prev => {
      const willBeActive = !prev[size];
      if (willBeActive && (sizesState[size] === 0 || !sizesState[size])) {
        setSizesState(s => ({ ...s, [size]: 5 }));
      }
      return { ...prev, [size]: willBeActive };
    });
  };

  const resetForm = () => {
    setForm({
      name: '',
      sku: '',
      category: 'READY TO WEAR',
      price: '',
      coverImage: '',
      extraImages: ['', '', '', ''],
      description: '',
      isOnSale: false,
    });
    setSizesState({ XS: 0, S: 5, M: 10, L: 5, XL: 0 });
    setEnabledSizes({ XS: false, S: true, M: true, L: true, XL: false });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Compute sizes array and overall quantity
    const sizesArray: SizeStockItem[] = STANDARD_SIZES.map(sz => ({
      size: sz,
      stock: enabledSizes[sz] ? (Number(sizesState[sz]) || 0) : 0
    }));

    const totalCalculatedQuantity = sizesArray.reduce((acc, curr) => acc + curr.stock, 0);

    // Build images array: cover first, then up to 4 optional non-empty urls
    const validExtras = form.extraImages
      .map(u => u.trim())
      .filter(u => u.length > 0)
      .slice(0, 4);
    const allImages = [form.coverImage.trim(), ...validExtras];

    const productPayload = {
      name: form.name.trim(),
      sku: form.sku.trim().toUpperCase(),
      category: form.category,
      price: Number(form.price) || 0,
      quantity: totalCalculatedQuantity,
      image: form.coverImage.trim(),   // backward compat
      images: allImages,               // full array for main site
      description: form.description.trim(),
      isOnSale: Boolean(form.isOnSale),
      sizes: sizesArray,
      updatedAt: new Date().toISOString()
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, "products", editingId), productPayload);
      } else {
        await addDoc(collection(db, "products"), {
          ...productPayload,
          createdAt: new Date().toISOString()
        });
      }
      resetForm();
      await fetchItems();
    } catch (err) {
      console.error("Error saving product:", err);
      alert("Error saving product to Firebase. Check console.");
    }
  };

  const handleEdit = (item: ProductItem) => {
    setEditingId(item.id);

    // Determine cover and extra images
    let cover = '';
    let extras: string[] = ['', '', '', ''];
    if (Array.isArray(item.images) && item.images.length > 0) {
      cover = item.images[0] || '';
      const rest = item.images.slice(1, 5);
      extras = [rest[0] || '', rest[1] || '', rest[2] || '', rest[3] || ''];
    } else if (item.image) {
      cover = item.image;
    }

    setForm({
      name: item.name || '',
      sku: item.sku || '',
      category: item.category || 'READY TO WEAR',
      price: item.price ? String(item.price) : '',
      coverImage: cover,
      extraImages: extras,
      description: item.description || '',
      isOnSale: Boolean(item.isOnSale),
    });

    const newSizesState: { [key: string]: number } = { XS: 0, S: 0, M: 0, L: 0, XL: 0 };
    const newEnabledSizes: { [key: string]: boolean } = { XS: false, S: false, M: false, L: false, XL: false };

    if (Array.isArray(item.sizes) && item.sizes.length > 0) {
      item.sizes.forEach((s) => {
        if (s.size) {
          const qty = Number(s.stock) || 0;
          newSizesState[s.size] = qty;
          newEnabledSizes[s.size] = qty > 0;
        }
      });
    } else {
      // Legacy fallback
      const total = Number(item.quantity) || 0;
      newSizesState['M'] = total;
      newEnabledSizes['M'] = total > 0;
    }

    setSizesState(newSizesState);
    setEnabledSizes(newEnabledSizes);

    // Scroll smoothly to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name || 'this product'}"?`)) {
      try {
        await deleteDoc(doc(db, "products", id));
        fetchItems();
      } catch (err) {
        console.error("Delete failed:", err);
      }
    }
  };

  // Filter items
  const filteredItems = items.filter(it => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch = !term ||
      (it.sku || '').toLowerCase().includes(term) ||
      (it.name || '').toLowerCase().includes(term) ||
      (it.category || '').toLowerCase().includes(term);

    let matchesCat = true;
    if (selectedCategoryFilter === 'ON_SALE') {
      matchesCat = Boolean(it.isOnSale);
    } else if (selectedCategoryFilter !== 'ALL') {
      matchesCat = it.category === selectedCategoryFilter;
    }

    return matchesSearch && matchesCat;
  });

  const totalCalculatedUnits = Object.entries(sizesState).reduce(
    (acc, [sz, qty]) => acc + (enabledSizes[sz] ? (Number(qty) || 0) : 0),
    0
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      {/* Header Bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">FAMA</h1>
                <span className="text-[11px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200/60 uppercase tracking-wider">
                  Admin Panel
                </span>
              </div>
              <p className="text-xs text-slate-500">Inventory &amp; Product Catalog Manager</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="text-xs text-slate-400 block font-medium">Total Products</span>
              <span className="text-sm font-bold text-slate-700">{items.length} SKUs</span>
            </div>
            <a
              href="http://localhost:5173"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <span>Visit Website</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 mt-8 space-y-8">
        {/* Product Add / Edit Form Card */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {editingId ? (
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <PlusCircle className="w-4 h-4" />
                </div>
              )}
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {editingId ? 'Edit Product Details' : 'Add New Product'}
                </h2>
                <p className="text-xs text-slate-500">
                  {editingId ? 'Update details, sizes, pricing, and description.' : 'Fill in the specifications to publish immediately to the store.'}
                </p>
              </div>
            </div>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel Editing</span>
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Primary Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Product Name *
                </label>
                <div className="relative">
                  <input
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                    placeholder="e.g. Embroidered Organza Dupatta Set"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  SKU (Stock Keeping Unit) *
                </label>
                <input
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 uppercase transition"
                  placeholder="e.g. FAMA-RTW-2026-01"
                  value={form.sku}
                  onChange={e => setForm({ ...form, sku: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category *
                </label>
                <select
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Price (PKR) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">PKR</span>
                  <input
                    className="w-full pl-12 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                    type="number"
                    min="0"
                    placeholder="e.g. 18500"
                    value={form.price}
                    onChange={e => setForm({ ...form, price: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* ── Product Photos: 1 mandatory cover + 4 optional ── */}
              <div className="md:col-span-2">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-4">
                  {/* Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Product Photos</span>
                      <span className="text-[10px] text-slate-400 font-normal">(Max 5)</span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      <span className="text-rose-600 font-semibold">Cover</span> is required · photos 2–5 are optional
                    </span>
                  </div>

                  {/* Cover image (mandatory) */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
                      <span className="inline-block w-2 h-2 rounded-full bg-rose-500"></span>
                      Photo 1 — Cover Image (Required)
                    </label>
                    <div className="flex gap-3">
                      <input
                        required
                        className="flex-1 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                        placeholder="https://... (main catalog thumbnail)"
                        value={form.coverImage}
                        onChange={e => setForm({ ...form, coverImage: e.target.value })}
                      />
                      {form.coverImage ? (
                        <div className="w-12 h-14 rounded-lg border border-slate-200 overflow-hidden bg-slate-100 shrink-0">
                          <img src={form.coverImage} alt="Cover" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-12 h-14 rounded-lg border-2 border-dashed border-rose-200 bg-rose-50 flex items-center justify-center text-[9px] text-rose-400 font-semibold shrink-0">
                          COVER
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 4 optional extra images */}
                  <div className="border-t border-slate-200 pt-3">
                    <label className="block text-xs font-semibold text-slate-600 mb-2">Photos 2–5 (Optional extra views)</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {([0, 1, 2, 3] as const).map(idx => {
                        const val = form.extraImages[idx] ?? '';
                        return (
                          <div key={idx} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 py-1.5">
                            <span className="text-[10px] font-bold text-slate-400 w-4 text-center shrink-0">#{idx + 2}</span>
                            <input
                              type="text"
                              placeholder={`Photo ${idx + 2} URL (optional)`}
                              value={val}
                              onChange={e => handleExtraImageChange(idx, e.target.value)}
                              className="flex-1 text-xs bg-transparent focus:outline-none text-slate-700 placeholder-slate-400"
                            />
                            {val && (
                              <div className="w-7 h-8 rounded border border-slate-200 overflow-hidden bg-slate-100 shrink-0">
                                <img src={val} alt={`Photo ${idx + 2}`} className="w-full h-full object-cover" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Size Availability & How Much (Requested by user) */}
            <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/40 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Size Availability &amp; Stock Count
                  </span>
                </div>
                <span className="text-xs font-medium text-indigo-700 bg-indigo-100/80 px-2.5 py-0.5 rounded-full">
                  Total Units: <strong className="font-bold">{totalCalculatedUnits}</strong>
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Click each size to enable or disable it, then set how much quantity is available for that size.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
                {STANDARD_SIZES.map(sz => {
                  const isActive = enabledSizes[sz];
                  const stock = sizesState[sz] ?? 0;

                  return (
                    <div
                      key={sz}
                      className={`p-3 rounded-lg border transition-all ${isActive
                          ? 'bg-white border-indigo-200 shadow-xs'
                          : 'bg-slate-100/70 border-slate-200 opacity-60'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <button
                          type="button"
                          onClick={() => toggleSizeActive(sz)}
                          className={`w-7 h-7 rounded-md font-bold text-xs flex items-center justify-center transition cursor-pointer ${isActive
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                            }`}
                        >
                          {sz}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleSizeActive(sz)}
                          className="text-[11px] text-slate-500 hover:text-slate-800"
                        >
                          {isActive ? (
                            <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                              <Check className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="text-slate-400">Off</span>
                          )}
                        </button>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-0.5">
                          How much:
                        </label>
                        <input
                          type="number"
                          min="0"
                          disabled={!isActive}
                          value={stock}
                          onChange={(e) => handleSizeStockChange(sz, e.target.value)}
                          placeholder="0"
                          className="w-full px-2 py-1 text-sm bg-slate-50 border border-slate-200 rounded text-center font-bold text-slate-800 disabled:bg-slate-200/50 disabled:text-slate-400 focus:outline-none focus:border-indigo-600"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Product Description (Requested by user) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>Product Description</span>
                </label>
                <span className="text-[11px] text-slate-400">Shows in product popup on main site</span>
              </div>
              <textarea
                rows={3}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                placeholder="Write detailed styling notes, fabric weave, embroidery details, and fit guidance..."
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </div>

            {/* Sale Checkbox & Submit */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.isOnSale}
                  onChange={e => setForm({ ...form, isOnSale: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-rose-500" />
                  Mark as On Sale (Discount badge displayed)
                </span>
              </label>

              <div className="flex items-center gap-3">
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 text-sm font-medium rounded-lg transition"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow transition flex items-center gap-2"
                >
                  {editingId ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Update Product</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Publish Product</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </section>

        {/* Inventory Table Section */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Table Header & Controls */}
          <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Current Inventory</h2>
              <p className="text-xs text-slate-500">Live products synced with Firebase Firestore database</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Category Filter */}
              <select
                value={selectedCategoryFilter}
                onChange={e => setSelectedCategoryFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              >
                <option value="ALL">All Categories</option>
                <option value="ON_SALE">🔥 On Sale Only</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              {/* SKU & Name Search Box */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by SKU (e.g. FAMA-...) or name..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 w-60 sm:w-72 font-medium"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="py-3 px-4">Item</th>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Sizes &amp; Stock</th>
                  <th className="py-3 px-4">Total Qty</th>
                  <th className="py-3 px-4">Sale</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Loading inventory items...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No products found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map(item => {
                    const sizesList = item.sizes || [];

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Image + Name + Description preview */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-14 rounded-md overflow-hidden bg-slate-100 border border-slate-200 shrink-0 relative group">
                              {(item.images?.[0] || item.image) ? (
                                <img
                                  src={item.images?.[0] || item.image}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                  <ImageIcon className="w-4 h-4" />
                                </div>
                              )}
                              {/* image count badge */}
                              {item.images && item.images.length > 1 && (
                                <span className="absolute bottom-0.5 right-0.5 bg-black/60 text-white text-[9px] font-bold px-1 rounded">
                                  {item.images.length}
                                </span>
                              )}
                            </div>
                            <div className="max-w-[200px]">
                              <p className="font-semibold text-slate-900 truncate" title={item.name}>
                                {item.name || 'Unnamed Product'}
                              </p>
                              {item.description && (
                                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5" title={item.description}>
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* SKU */}
                        <td className="py-3 px-4 font-mono font-medium text-slate-700">
                          {item.sku}
                        </td>

                        {/* Category */}
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            {item.category}
                          </span>
                        </td>

                        {/* Price */}
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          PKR {Number(item.price).toLocaleString()}
                        </td>

                        {/* Sizes breakdown pill tags */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 flex-wrap max-w-xs">
                            {sizesList.length > 0 ? (
                              sizesList.map(s => (
                                <span
                                  key={s.size}
                                  className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${s.stock > 0
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold'
                                      : 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                                    }`}
                                  title={`${s.size}: ${s.stock} in stock`}
                                >
                                  {s.size}:{s.stock}
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-slate-400">Standard (M)</span>
                            )}
                          </div>
                        </td>

                        {/* Total Qty */}
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {item.quantity}
                        </td>

                        {/* Sale */}
                        <td className="py-3 px-4">
                          {item.isOnSale ? (
                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                              ON SALE
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => handleEdit(item)}
                              className="p-1.5 rounded text-indigo-600 hover:bg-indigo-50 transition-colors"
                              title="Edit product"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id, item.name)}
                              className="p-1.5 rounded text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete product"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
