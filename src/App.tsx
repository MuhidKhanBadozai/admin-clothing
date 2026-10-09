import { useState, useEffect, useRef } from 'react';
import { db } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import {
  Package,
  ShoppingBag,
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
  ExternalLink,
  Upload,
  Download,
  LogOut,
  Lock,
  Eye,
  EyeOff,
  User,
  HardDrive
} from 'lucide-react';
import { OrdersDashboard } from './components/OrdersDashboard';
import { ImageUploadDropzone } from './components/ImageUploadDropzone';
import { GoogleDriveConfigModal } from './components/GoogleDriveConfigModal';
import { googleDriveService } from './services/googleDriveService';

// ─── Hardcoded Credentials ───────────────────────────────────────────────────
const ADMIN_USERNAME = 'Famma clothing';
const ADMIN_PASSWORD = 'Famma8989';

// ─── CSV Helpers ─────────────────────────────────────────────────────────────
const CSV_HEADERS = [
  'name', 'sku', 'category', 'gender', 'fabricTag', 'price', 'isOnSale',
  'description', 'image_1', 'image_2', 'image_3', 'image_4', 'image_5',
  'size_XS', 'size_S', 'size_M', 'size_L', 'size_XL'
];

function generateExampleCsv(): string {
  const rows = [
    CSV_HEADERS.join(','),
    [
      'Embroidered Lawn Suit',
      'FAMA-2026-001',
      'WOMEN',
      'WOMEN',
      'Lawn',
      '4500',
      'false',
      'Beautiful embroidered lawn 3-piece suit',
      'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
      '', '', '',
      '0', '5', '10', '5', '0'
    ].join(','),
    [
      'Khaddar Winter Unstitched',
      'FAMA-2026-002',
      'UNSTITCHED FABRIC',
      'WOMEN',
      'Khaddar',
      '3200',
      'true',
      'Warm khaddar unstitched fabric for winter',
      'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=800',
      '', '', '', '',
      '0', '0', '5', '5', '2'
    ].join(','),
    [
      'Men Kurta Classic White',
      'FAMA-2026-003',
      'MEN',
      'MEN',
      'Linen',
      '2800',
      'false',
      'Classic white linen kurta for men',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800',
      '', '', '', '',
      '0', '3', '8', '6', '2'
    ].join(',')
  ];
  return rows.join('\n');
}

function parseCsvToProducts(csv: string): Omit<any, 'id'>[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  const products: Omit<any, 'id'>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.every(v => !v)) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
    const sizes = (['XS', 'S', 'M', 'L', 'XL'] as const).map(sz => ({
      size: sz,
      stock: Number(row[`size_${sz}`]) || 0
    }));
    const images = [row.image_1, row.image_2, row.image_3, row.image_4, row.image_5]
      .filter(Boolean);
    products.push({
      name: row.name || '',
      sku: (row.sku || '').toUpperCase(),
      category: row.category || 'READY TO WEAR',
      gender: row.gender || 'WOMEN',
      fabricTag: row.fabricTag || 'Lawn',
      fabric: row.fabricTag || 'Lawn',
      price: Number(row.price) || 0,
      quantity: sizes.reduce((a, s) => a + s.stock, 0),
      isOnSale: row.isOnSale?.toLowerCase() === 'true',
      description: row.description || '',
      images,
      image: images[0] || '',
      sizes,
      createdAt: new Date().toISOString()
    });
  }
  return products;
}

function exportItemsToCsv(items: any[]): string {
  const rows = [CSV_HEADERS.join(',')];
  for (const it of items) {
    const imgs = Array.isArray(it.images) ? it.images : (it.image ? [it.image] : []);
    const sizeMap: Record<string, number> = {};
    (it.sizes || []).forEach((s: any) => { sizeMap[s.size] = s.stock || 0; });
    rows.push([
      `"${(it.name || '').replace(/"/g, '""')}"`,
      it.sku || '',
      it.category || '',
      it.gender || 'WOMEN',
      it.fabricTag || it.fabric || '',
      it.price || 0,
      it.isOnSale ? 'true' : 'false',
      `"${(it.description || '').replace(/"/g, '""')}"`,
      imgs[0] || '', imgs[1] || '', imgs[2] || '', imgs[3] || '', imgs[4] || '',
      sizeMap['XS'] || 0, sizeMap['S'] || 0, sizeMap['M'] || 0, sizeMap['L'] || 0, sizeMap['XL'] || 0
    ].join(','));
  }
  return rows.join('\n');
}

// ─── Login Screen ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    await new Promise(r => setTimeout(r, 700)); // simulate auth
    if (username.trim() === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      onLogin();
    } else {
      setError('Incorrect username or password. Please try again.');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo card */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 shadow-xl shadow-indigo-900/50 mb-4">
            <Package className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">FAMMA</h1>
          <p className="text-indigo-300/80 text-sm mt-1 font-medium">Admin Panel · Fashion for Every Moment</p>
        </div>

        {/* Login form card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-2 mb-6">
            <Lock className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-semibold text-slate-200">Secure Admin Login</span>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Username</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={username}
                  onChange={e => { setUsername(e.target.value); setError(''); }}
                  className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  placeholder="Enter username"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  className="w-full pl-9 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  placeholder="Enter password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs px-3 py-2 rounded-lg">
                <X className="w-3.5 h-3.5 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm transition-all shadow-lg shadow-indigo-900/40 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Authenticating...</span></>
              ) : (
                <><Lock className="w-4 h-4" /><span>Sign In</span></>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-white/10">
            <p className="text-center text-[11px] text-slate-500">FAMMA Admin Panel · Restricted Access Only</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const CATEGORIES = [
  'WOMEN', 'MEN', 'NEW ARRIVALS', 'READY TO WEAR', 'UNSTITCHED FABRIC', 'HOME'
];

export const FABRIC_TYPES = [
  'Linen',
  'Khaddar',
  'Karandi',
  'Marina',
  'Jacquard',
  'Pashmina',
  'Wool',
  'Printed silk',
  'Lawn'
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
  gender?: 'WOMEN' | 'MEN' | 'ALL' | string;
  fabricTag?: string;
  fabric?: string;
  price: number;
  quantity: number;
  image?: string;       // legacy cover
  images?: string[];   // [cover, img2, img3, img4, img5]
  isOnSale?: boolean;
  description?: string;
  sizes?: SizeStockItem[];
}

export default function App() {
  // ─── Auth Gate ───────────────────────────────────────────────────────────
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return sessionStorage.getItem('famma_admin_auth') === '1';
  });

  const handleLogin = () => {
    sessionStorage.setItem('famma_admin_auth', '1');
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('famma_admin_auth');
    setIsLoggedIn(false);
  };

  // ─── CSV Import ──────────────────────────────────────────────────────────
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvStatus, setCsvStatus] = useState<string | null>(null);

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvImporting(true);
    setCsvStatus(null);
    try {
      const text = await file.text();
      const products = parseCsvToProducts(text);
      if (products.length === 0) {
        setCsvStatus('No valid rows found in CSV.');
        return;
      }
      let imported = 0;
      for (const p of products) {
        await addDoc(collection(db, 'products'), p);
        imported++;
      }
      setCsvStatus(`✅ Imported ${imported} product${imported !== 1 ? 's' : ''} successfully!`);
      await fetchItems();
    } catch (err) {
      console.error(err);
      setCsvStatus('❌ Import failed. Check console for details.');
    } finally {
      setCsvImporting(false);
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  const handleCsvExport = () => {
    const csv = exportItemsToCsv(items);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `famma-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadExampleCsv = () => {
    const csv = generateExampleCsv();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'famma-example-import.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const [activeTab, setActiveTab] = useState<'ORDERS' | 'PRODUCTS'>('ORDERS');
  const [unfulfilledCount, setUnfulfilledCount] = useState(0);

  useEffect(() => {
    try {
      const unsub = onSnapshot(collection(db, 'orders'), (snap) => {
        let count = 0;
        snap.forEach((d) => {
          const st = d.data().status;
          if (st === 'PROCESSING' || st === 'PENDING') count++;
        });
        setUnfulfilledCount(count);
      });
      return () => unsub();
    } catch (e) {
      console.warn('Orders count snapshot error:', e);
    }
  }, []);

  const [items, setItems] = useState<ProductItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [selectedGenderFilter, setSelectedGenderFilter] = useState('ALL');
  const [selectedFabricFilter, setSelectedFabricFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);

  // Form State — direct photos array from drag & drop or camera/file picker
  const [form, setForm] = useState({
    name: '',
    sku: '',
    category: 'READY TO WEAR',
    gender: 'WOMEN' as 'WOMEN' | 'MEN' | 'ALL',
    fabricTag: 'Lawn',
    price: '',
    images: [] as string[],
    description: '',
    isOnSale: false,
    isUnstitched: false,
  });

  // Stock for unstitched option
  const [unstitchedStock, setUnstitchedStock] = useState<number>(0);

  const driveConfig = googleDriveService.getConfig();
  const isDriveConfigured = Boolean(driveConfig.scriptUrl && driveConfig.scriptUrl.trim());

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
        let parsedImages = d.images || [];
        if (Array.isArray(parsedImages)) {
          parsedImages = parsedImages.map((u: string) => googleDriveService.convertToDirectGoogleDriveUrl(u));
        }
        return {
          id: doc.id,
          ...d,
          images: parsedImages,
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
      gender: 'WOMEN',
      fabricTag: 'Lawn',
      price: '',
      images: [],
      description: '',
      isOnSale: false,
      isUnstitched: false,
    });
    setSizesState({ XS: 0, S: 5, M: 10, L: 5, XL: 0 });
    setEnabledSizes({ XS: false, S: true, M: true, L: true, XL: false });
    setUnstitchedStock(0);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Compute sizes array and overall quantity
    let sizesArray: SizeStockItem[];
    let totalCalculatedQuantity: number;

    if (form.isUnstitched) {
      const stock = Math.max(0, Number(unstitchedStock) || 0);
      sizesArray = [{ size: 'UNSTITCHED', stock }];
      totalCalculatedQuantity = stock;
    } else {
      sizesArray = STANDARD_SIZES.map(sz => ({
        size: sz,
        stock: enabledSizes[sz] ? (Number(sizesState[sz]) || 0) : 0
      }));
      totalCalculatedQuantity = sizesArray.reduce((acc, curr) => acc + curr.stock, 0);
    }

    const validImages = form.images.length > 0
      ? form.images
      : ['https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80'];

    const productPayload = {
      name: form.name.trim(),
      sku: form.sku.trim().toUpperCase(),
      category: form.category,
      gender: form.gender,
      fabricTag: form.fabricTag,
      fabric: form.fabricTag,
      price: Number(form.price) || 0,
      quantity: totalCalculatedQuantity,
      image: validImages[0] || '',   // backward compat
      images: validImages,           // full array for main site
      description: form.description.trim(),
      isOnSale: Boolean(form.isOnSale),
      isUnstitched: Boolean(form.isUnstitched),
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

    let parsedImgs: string[] = [];
    if (Array.isArray(item.images) && item.images.length > 0) {
      parsedImgs = item.images.filter(Boolean);
    } else if (item.image) {
      parsedImgs = [item.image];
    }

    const itemGender = (item.gender || (item.category === 'MEN' ? 'MEN' : 'WOMEN')) as 'WOMEN' | 'MEN' | 'ALL';

    // Detect if item is unstitched
    const itemIsUnstitched = Boolean((item as any).isUnstitched) ||
      (Array.isArray(item.sizes) && item.sizes.length === 1 && item.sizes[0]?.size === 'UNSTITCHED');

    setForm({
      name: item.name || '',
      sku: item.sku || '',
      category: item.category || 'READY TO WEAR',
      gender: itemGender,
      fabricTag: item.fabricTag || item.fabric || 'Lawn',
      price: item.price ? String(item.price) : '',
      images: parsedImgs,
      description: item.description || '',
      isOnSale: Boolean(item.isOnSale),
      isUnstitched: itemIsUnstitched,
    });

    if (itemIsUnstitched) {
      const unstitchedEntry = (item.sizes || []).find((s: any) => s.size === 'UNSTITCHED');
      setUnstitchedStock(Number(unstitchedEntry?.stock) || 0);
      setSizesState({ XS: 0, S: 0, M: 0, L: 0, XL: 0 });
      setEnabledSizes({ XS: false, S: false, M: false, L: false, XL: false });
    } else {
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
      setUnstitchedStock(0);
    }

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

    let matchesFabric = true;
    if (selectedFabricFilter !== 'ALL') {
      const itemFab = (it.fabricTag || it.fabric || '').toLowerCase();
      matchesFabric = itemFab.includes(selectedFabricFilter.toLowerCase());
    }

    let matchesGender = true;
    if (selectedGenderFilter === 'WOMEN') {
      matchesGender = it.gender === 'WOMEN' || it.gender === 'ALL' || it.category === 'WOMEN' || (!it.gender && it.category !== 'MEN');
    } else if (selectedGenderFilter === 'MEN') {
      matchesGender = it.gender === 'MEN' || it.gender === 'ALL' || it.category === 'MEN';
    } else if (selectedGenderFilter === 'UNISEX') {
      matchesGender = it.gender === 'ALL';
    }

    return matchesSearch && matchesCat && matchesFabric && matchesGender;
  });

  const totalCalculatedUnits = form.isUnstitched
    ? (Number(unstitchedStock) || 0)
    : Object.entries(sizesState).reduce(
        (acc, [sz, qty]) => acc + (enabledSizes[sz] ? (Number(qty) || 0) : 0),
        0
      );

  // Auth gate — after all hooks
  if (!isLoggedIn) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      {/* Hidden CSV file input */}
      <input
        ref={csvInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleCsvImport}
      />

      {/* Header Bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">FAMMA</h1>
                <span className="text-[11px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200/60 uppercase tracking-wider">
                  Admin Panel
                </span>
              </div>
              <p className="text-xs text-slate-500">Live Orders &amp; Catalog Management · Fashion for Every Moment</p>
            </div>
          </div>

          {/* Shopify-style Navigation Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('ORDERS')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'ORDERS'
                ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <ShoppingBag className="w-4 h-4 text-indigo-600" />
              <span>Customer Orders</span>
              {unfulfilledCount > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
                  {unfulfilledCount}
                </span>
              ) : (
                <span className="w-2 h-2 rounded-full bg-emerald-500" title="All orders fulfilled" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('PRODUCTS')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'PRODUCTS'
                ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <Package className="w-4 h-4 text-slate-500" />
              <span>Products &amp; Inventory</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-700">
                {items.length}
              </span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeTab === 'PRODUCTS' && (
              <>
                {/* CSV Status toast */}
                {csvStatus && (
                  <span className={`text-xs font-medium px-3 py-1.5 rounded-lg border ${csvStatus.startsWith('✅')
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                    {csvStatus}
                  </span>
                )}

                {/* Download Example CSV */}
                <button
                  onClick={handleDownloadExampleCsv}
                  title="Download example CSV template"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-violet-200 bg-violet-50 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Example CSV</span>
                </button>

                {/* Import CSV */}
                <button
                  onClick={() => csvInputRef.current?.click()}
                  disabled={csvImporting}
                  title="Import products from CSV file"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60 transition-colors"
                >
                  {csvImporting
                    ? <><div className="w-3.5 h-3.5 border-2 border-indigo-300 border-t-indigo-700 rounded-full animate-spin" /><span>Importing...</span></>
                    : <><Upload className="w-3.5 h-3.5" /><span className="hidden sm:inline">Import CSV</span></>
                  }
                </button>

                {/* Export CSV */}
                <button
                  onClick={handleCsvExport}
                  title="Export current inventory to CSV"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Export CSV</span>
                </button>

                <div className="w-px h-6 bg-slate-200" />
              </>
            )}

            {/* Google Drive Storage Config Button */}
            <button
              type="button"
              onClick={() => setIsDriveModalOpen(true)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${isDriveConfigured
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 animate-pulse'
                }`}
              title="Configure Personal Google Drive Storage"
            >
              <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isDriveConfigured ? 'Drive Storage' : 'Connect Drive'}</span>
            </button>

            <a
              href="http://localhost:3000"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <span>Visit Store</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>

            <button
              onClick={handleLogout}
              title="Logout"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 mt-8 space-y-8">
        {activeTab === 'ORDERS' ? (
          <OrdersDashboard />
        ) : (
          <>
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

                  {/* Audience / Gender Selection Buttons */}
                  <div className="md:col-span-2 bg-gradient-to-r from-slate-50 via-indigo-50/20 to-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex flex-wrap items-center justify-between gap-1 mb-2.5">
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Target Audience / Gender *
                      </label>
                      <span className="text-[11px] text-slate-500 font-medium">
                        Choosing Men or Women makes this item appear under Men or Women on website
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, gender: 'WOMEN' })}
                        className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold transition-all border cursor-pointer ${form.gender === 'WOMEN'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-200 ring-2 ring-rose-600/30'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                      >
                        <span className="text-base">👩</span>
                        <span>WOMEN</span>
                        {form.gender === 'WOMEN' && <Check className="w-4 h-4 ml-1" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => setForm({ ...form, gender: 'MEN' })}
                        className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold transition-all border cursor-pointer ${form.gender === 'MEN'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200 ring-2 ring-indigo-600/30'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                      >
                        <span className="text-base">👨</span>
                        <span>MEN</span>
                        {form.gender === 'MEN' && <Check className="w-4 h-4 ml-1" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => setForm({ ...form, gender: 'ALL' })}
                        className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold transition-all border cursor-pointer ${form.gender === 'ALL'
                          ? 'bg-slate-800 text-white border-slate-800 shadow-md ring-2 ring-slate-800/30'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                      >
                        <span className="text-base">👥</span>
                        <span>BOTH / UNISEX</span>
                        {form.gender === 'ALL' && <Check className="w-4 h-4 ml-1" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Category *
                    </label>
                    <select
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                      value={form.category}
                      onChange={e => {
                        const val = e.target.value;
                        let g = form.gender;
                        if (val === 'MEN') g = 'MEN';
                        else if (val === 'WOMEN') g = 'WOMEN';
                        setForm({ ...form, category: val, gender: g });
                      }}
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Fabric Type Tag *
                    </label>
                    <select
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition font-medium text-slate-800"
                      value={form.fabricTag}
                      onChange={e => setForm({ ...form, fabricTag: e.target.value })}
                    >
                      {FABRIC_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
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

                  {/* ── Product Photos: Drag & Drop Google Drive Cloud Uploader ── */}
                  <div className="md:col-span-2">
                    <ImageUploadDropzone
                      images={form.images}
                      onChange={(newImages) => setForm(prev => ({ ...prev, images: newImages }))}
                      onOpenConfig={() => setIsDriveModalOpen(true)}
                    />
                  </div>
                </div>

                {/* Size Availability & Stock Count */}
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

                  {/* Unstitched toggle */}
                  <div className="flex items-center gap-3 pb-1 border-b border-indigo-100">
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, isUnstitched: !prev.isUnstitched }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                        form.isUnstitched ? 'bg-amber-500' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          form.isUnstitched ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <div>
                      <span className={`text-xs font-bold ${form.isUnstitched ? 'text-amber-700' : 'text-slate-600'}`}>
                        {form.isUnstitched ? '🧵 UNSTITCHED MODE — No stitching sizes needed' : 'Standard Sizes (XS – XL)'}
                      </span>
                      <p className="text-[11px] text-slate-400">
                        {form.isUnstitched
                          ? 'This is unstitched fabric/cloth. Customer will get it stitched themselves.'
                          : 'Toggle ON if this product is unstitched fabric (no ready-to-wear sizes).'
                        }
                      </p>
                    </div>
                  </div>

                  {form.isUnstitched ? (
                    /* Unstitched: single stock input */
                    <div className="flex items-center gap-4 pt-1">
                      <div className="flex-1 p-3 rounded-lg border-2 border-amber-300 bg-amber-50 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">UNSTITCHED</span>
                          <p className="text-[11px] text-amber-600 mt-0.5">Single option shown to customer</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] uppercase font-semibold text-slate-500">Stock:</label>
                          <input
                            type="number"
                            min="0"
                            value={unstitchedStock}
                            onChange={e => setUnstitchedStock(Math.max(0, parseInt(e.target.value) || 0))}
                            placeholder="0"
                            className="w-20 px-2 py-1.5 text-sm bg-white border-2 border-amber-300 rounded-lg text-center font-bold text-slate-800 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Standard XS–XL size grid */
                    <>
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
                    </>
                  )}
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
                  {/* Audience / Gender Filter */}
                  <select
                    value={selectedGenderFilter}
                    onChange={e => setSelectedGenderFilter(e.target.value)}
                    className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  >
                    <option value="ALL">All Audiences</option>
                    <option value="WOMEN">👩 Women</option>
                    <option value="MEN">👨 Men</option>
                    <option value="UNISEX">👥 Unisex / Both</option>
                  </select>

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

                  {/* Fabric Tag Filter */}
                  <select
                    value={selectedFabricFilter}
                    onChange={e => setSelectedFabricFilter(e.target.value)}
                    className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  >
                    <option value="ALL">All Fabric Types</option>
                    {FABRIC_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
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
                      <th className="py-3 px-4">Audience</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Fabric Tag</th>
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
                        <td colSpan={10} className="py-8 text-center text-slate-400">
                          Loading inventory items...
                        </td>
                      </tr>
                    ) : filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-slate-400">
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

                            {/* Audience / Gender Badge */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              {item.gender === 'MEN' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  👨 Men
                                </span>
                              ) : item.gender === 'ALL' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                  👥 Both
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  👩 Women
                                </span>
                              )}
                            </td>

                            {/* Category */}
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                {item.category}
                              </span>
                            </td>

                            {/* Fabric Tag */}
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                {item.fabricTag || item.fabric || 'Lawn'}
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
          </>
        )}
      </main>

      {/* Google Drive Cloud Storage Modal */}
      <GoogleDriveConfigModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
      />
    </div>
  );
}
