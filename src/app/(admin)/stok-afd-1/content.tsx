'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast, Toaster } from 'react-hot-toast';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import Select from 'react-select';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Key,
  Loader2,
  AlertTriangle,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronFirst,
  ChevronLast,
} from 'lucide-react';
import Button from '@/components/ui/button/Button';

/** =========================
 * Types
 * ========================= */
interface StokbarangItem {
  id: string;
  kode_material: string;
  material_desc?: string;
  satuan?: string;
  kode_gudang: string;
  bulan: number;
  tahun: number;
  stok_awal: number | null;
  tanggal_kadaluarsa: string | null;
}

interface ApiResponse {
  data: StokbarangItem[];
  recordsTotal: number;
  recordsFiltered: number;
  draw: number;
}

type SelectOption = {
  value: string;
  label: string;
};

/** =========================
 * Helpers
 * ========================= */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

const decodeJWT = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

const isTokenValid = (token: string): boolean => {
  try {
    const tokenData = decodeJWT(token);
    if (!tokenData?.exp) return false;
    const tokenExp = tokenData.exp * 1000;
    return Date.now() < tokenExp;
  } catch {
    return false;
  }
};

const createApiInstance = (router: any) => {
  const instance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || '',
    headers: { 'Content-Type': 'application/json' },
  });

  instance.interceptors.request.use(
    (config) => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('auth_token');
        if (token) config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (
        error.config?.url?.includes('/login') ||
        error.config?.url?.includes('/register') ||
        error.config?.url?.includes('/validate')
      ) {
        return Promise.reject(error);
      }

      if (error.response?.status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('last_validation');

        setTimeout(() => toast.error('Session expired. Please login again.'), 100);
        router.push('/login');
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

/** =========================
 * Validation (Zod) - PERBAIKAN UTAMA
 * - Menggunakan transform untuk memastikan stok_awal menjadi integer
 * - Menghilangkan .000 dengan memparse ke integer
 * ========================= */
const stokbarangSchema = z.object({
  id: z.string().optional().default(''),
  kode_material: z.string().min(1, 'Kode material wajib diisi'),
  kode_gudang: z.string().min(1, 'Kode gudang wajib diisi'),
  bulan: z.coerce.number().int().min(1, 'Bulan minimal 1').max(12, 'Bulan maksimal 12'),
  tahun: z.coerce.number().int().min(2000, 'Tahun minimal 2000').max(2100, 'Tahun maksimal 2100'),
  stok_awal: z.preprocess(
    (val) => {
      if (val === '' || val === undefined || val === null) return null;

      // Jika nilai adalah string, ganti koma dengan titik untuk konversi number
      if (typeof val === 'string') {
        // Ganti koma dengan titik untuk format desimal
        const normalizedValue = val.replace(/,/g, '.');
        const num = Number(normalizedValue);
        return isNaN(num) ? null : num;
      }

      // Jika sudah number, langsung gunakan
      const num = Number(val);
      return isNaN(num) ? null : num;
    },
    z.number().nullable().optional()
  ),
  tanggal_kadaluarsa: z.preprocess(
    (v) => {
      if (v === '' || v === undefined || v === null) return null;
      return String(v);
    },
    z.string().nullable().optional()
  ),
});

type StokbarangFormData = z.infer<typeof stokbarangSchema>;

/** =========================
 * Delete Confirmation Modal
 * ========================= */
const DeleteConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  item,
  theme,
  isBulk = false,
  bulkCount = 0,
  loading = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  item?: StokbarangItem;
  theme: string;
  isBulk?: boolean;
  bulkCount?: number;
  loading?: boolean;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div
        className={`rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-100 ${theme === 'dark'
            ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700'
            : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'
          } border`}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100'}`}>
              <AlertTriangle className={`w-6 h-6 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
            </div>

            <div className="flex-1">
              <h3 className="text-xl font-bold">{isBulk ? `Delete ${bulkCount} Items` : 'Delete Item'}</h3>
              <p className={`mt-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                {isBulk ? (
                  `Are you sure you want to delete ${bulkCount} selected items? This action cannot be undone.`
                ) : (
                  <>
                    Are you sure you want to delete <span className="font-semibold">{item?.id}</span>? This action
                    cannot be undone.
                  </>
                )}
              </p>

              {!isBulk && item && (
                <div className={`mt-4 p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Kode Material:</span>
                      <p className="font-medium">{item.kode_material}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Kode Gudang:</span>
                      <p className="font-medium">{item.kode_gudang}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Bulan:</span>
                      <p className="font-medium">{item.bulan}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Tahun:</span>
                      <p className="font-medium">{item.tahun}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Stok Awal:</span>
                      <p className="font-medium">{item.stok_awal ?? '-'}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        Tanggal Kadaluarsa:
                      </span>
                      <p className="font-medium">{item.tanggal_kadaluarsa ?? '-'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <button
              onClick={onClose}
              disabled={loading}
              className={`flex-1 px-6 py-3 border rounded-xl font-medium transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 ${theme === 'dark'
                  ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white font-medium rounded-xl hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-[1.02] shadow-lg flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
              {isBulk ? `Delete ${bulkCount} Items` : 'Delete Item'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/** =========================
 * Pagination Component
 * ========================= */
const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  theme,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  theme: string;
}) => {
  const renderPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => onPageChange(i)}
          className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200 ${currentPage === i
              ? 'bg-blue-600 text-white shadow-lg'
              : theme === 'dark'
                ? 'hover:bg-gray-700 text-gray-300'
                : 'hover:bg-gray-100 text-gray-600'
            }`}
        >
          {i}
        </button>
      );
    }

    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Page {currentPage} of {totalPages}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className={`p-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
            }`}
        >
          <ChevronFirst className="w-4 h-4" />
        </button>

        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`p-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
            }`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {renderPageNumbers()}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`p-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
            }`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className={`p-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
            }`}
        >
          <ChevronLast className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default function StokbarangContent() {
  const [items, setItems] = useState<StokbarangItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingItem, setDeletingItem] = useState<StokbarangItem | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [sortField, setSortField] = useState<keyof StokbarangItem>('kode_material');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [stats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
  });

  const [columnIndexMap, setColumnIndexMap] = useState<Record<string, number>>({});

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    draw: 1,
  });

  const { theme } = useTheme();
  const { logout } = useAuth();
  const router = useRouter();

  const [api] = useState(() => createApiInstance(router));

  const currentYear = 2026;



  /** =========================
   * Auth protect
   * ========================= */
  useEffect(() => {
    const checkAuth = async () => {
      if (typeof window === 'undefined') return;

      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Please login to access this page');
        router.push('/login');
        return;
      }

      if (!isTokenValid(token)) {
        toast.error('Session expired. Please login again.');
        logout();
        router.push('/login');
        return;
      }
    };

    checkAuth();
  }, [router, logout]);

  /** =========================
   * Column index map (DataTables)
   * ========================= */
  useEffect(() => {
    const fields = ['kode_material', 'kode_gudang', 'bulan', 'tahun', 'stok_awal', 'tanggal_kadaluarsa'];
    const indexMap: Record<string, number> = {};
    fields.forEach((field, index) => (indexMap[field] = index));
    setColumnIndexMap(indexMap);
  }, []);

  /** =========================
   * Dropdown options
   * ========================= */
  const [barangOptions, setMaterialOptions] = useState<SelectOption[]>([]);
  const [gudangOptions, setGudangOptions] = useState<SelectOption[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);

  const fetchDropdownOptions = useCallback(async () => {
    try {
      setLoadingDropdowns(true);

      const materialResponse = await api.get('au53/get-dropdown-material-2');
      if (Array.isArray(materialResponse.data)) setMaterialOptions(materialResponse.data);

      const gudangResponse = await api.get('au53/get-dropdown-gudang');
      if (Array.isArray(gudangResponse.data)) setGudangOptions(gudangResponse.data);
    } catch (error) {
      console.error('Error fetching dropdown options:', error);
      toast.error('Failed to load dropdown options');
    } finally {
      setLoadingDropdowns(false);
    }
  }, [api]);

// Tambahkan fungsi helper di bagian atas component atau di dalam component
const formatStokAwal = (value: number | null) => {
  if (value === null || value === undefined) return '-';
  
  // Pisahkan bagian bulat dan desimal
  const [integerPart, decimalPart] = value.toString().split('.');
  
  // Format bagian ribuan dengan titik
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  // Gabungkan dengan koma untuk desimal (jika ada)
  if (decimalPart) {
    // Ambil maksimal 2 digit desimal
    const formattedDecimal = decimalPart.substring(0, 2);
    return `${formattedInteger},${formattedDecimal}`;
  }
  
  return formattedInteger;
}
  /** =========================
   * Fetch Data (DataTables format)
   * ========================= */
  const fetchData = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);

        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('auth_token');
          if (!token) {
            toast.error('Please login to access this page');
            router.push('/login');
            return;
          }
          if (!isTokenValid(token)) {
            toast.error('Session expired. Please login again.');
            logout();
            router.push('/login');
            return;
          }
        }

        const start = (page - 1) * pagination.limit;

        const columnIndex = columnIndexMap[String(sortField)] ?? 0;

        const params: Record<string, any> = {
          draw: pagination.draw,
          start,
          length: pagination.limit,
          'order[0][column]': columnIndex,
          'order[0][dir]': sortDirection,
        };

        if (debouncedSearchTerm) params['search[value]'] = debouncedSearchTerm;

        const response = await api.get<ApiResponse>('stokbarang/getAll', {
          params,
          paramsSerializer: { indexes: null },
        });

        const dt = response.data;
        const data = Array.isArray(dt?.data) ? dt.data : [];
        const recordsTotal = dt?.recordsTotal ?? 0;
        const recordsFiltered = dt?.recordsFiltered ?? recordsTotal;
        const draw = dt?.draw ?? pagination.draw + 1;

        setItems(data);

        setPagination((prev) => ({
          ...prev,
          page,
          total: recordsTotal,
          totalPages: Math.ceil(recordsFiltered / prev.limit) || 1,
          draw,
        }));
      } catch (error: any) {
        console.error('Fetch error details:', error);

        if (axios.isAxiosError(error)) {
          if (error.response?.status === 401) {
            // interceptor handle
          } else if (error.response?.status === 404) {
            toast.error('API endpoint not found. Please check the endpoint URL.');
          } else if (error.response?.status === 500) {
            toast.error('Server error. Please try again later.');
          } else {
            toast.error('Failed to fetch data. Please check API connection.');
          }
        } else {
          toast.error('An unexpected error occurred.');
        }

        setItems([]);
        setPagination((prev) => ({ ...prev, page: 1, total: 0, totalPages: 1 }));
      } finally {
        setLoading(false);
      }
    },
    [
      api,
      columnIndexMap,
      debouncedSearchTerm,
      logout,
      pagination.draw,
      pagination.limit,
      router,
      sortDirection,
      sortField,
    ]
  );

  useEffect(() => {
    fetchData(pagination.page);
  }, [fetchData, pagination.page]);

  const handleSort = (field: keyof StokbarangItem) => {
    if (sortField === field) setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDirection('asc');
    }
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (page: number) => setPagination((prev) => ({ ...prev, page }));
  const handleLimitChange = (limit: number) => setPagination((prev) => ({ ...prev, limit, page: 1 }));

  /** =========================
   * Modal open/close
   * ========================= */
 



 
  /** =========================
   * Selection handlers
   * ========================= */
  const toggleRowSelection = (id: string) => {
    setSelectedRows((prev) => (prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (items.length === 0) return;
    if (selectedRows.length === items.length) setSelectedRows([]);
    else setSelectedRows(items.map((i) => i.id));
  };


  const cardClass =
    theme === 'dark'
      ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700'
      : 'bg-gradient-to-br from-white to-gray-50 border-gray-200';

  const inputClass =
    theme === 'dark'
      ? `bg-gray-800/50 border-gray-700 text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 backdrop-blur-sm`
      : `bg-white/80 border-gray-200 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 backdrop-blur-sm`;

  const tableHeaderClass =
    theme === 'dark' ? 'bg-gray-800/50 text-gray-300 border-gray-700' : 'bg-gray-50/80 text-gray-600 border-gray-200';

  const tableRowClass = (index: number) =>
    theme === 'dark'
      ? `bg-gray-900/30 hover:bg-gray-800/50 text-gray-100 ${index % 2 === 0 ? 'bg-gray-900/20' : ''}`
      : `hover:bg-gray-50/80 text-gray-900 ${index % 2 === 0 ? 'bg-gray-50/50' : ''}`;



  const columns = [
['nomor_manual', 'Nomor'],
['tanggal_formatted', 'Tanggal'],
['unit', 'Unit'],
['bagian', 'Bagian'],

['kode_material', 'Kode Material'],
['material_desc', 'Uraian'],
['satuan_material', 'Satuan'],

['tahun_tanam', 'Tahun Tanam'],
['nomor_blok', 'Nomor Blok'],
['luas_ha', 'Luas (Ha)'],
['jumlah_pokok', 'Jumlah Pokok'],
['dosis_cc_ha', 'Dosis cc/Ha'],

['banyaknya_diminta_formatted', 'Banyak Diminta'],
['banyaknya_dikeluarkan_formatted', 'Banyak Dikeluarkan'],

['stok_awal', 'Stok Awal'],
['stok_keluar', 'Stok Keluar'],
['total_stok_keluar_sampai_tanggal', 'Total Keluar'],
['sisa_stok', 'Stok Akhir'],

['harga_satuan_formatted', 'Harga Satuan'],
['jumlah_formatted', 'Jumlah'],

['barang_untuk_kegiatan', 'Barang Untuk Kegiatan'],
['plant_desc', 'Plant'],

['status_badge', 'Status'],

['created_by_name', 'Created By'],
['created_at_formatted', 'Created At'],

['updated_by_name', 'Updated By'],
['updated_at_formatted', 'Updated At'],

['approved1_by_name', 'Approved 1'],
['approved1_at_formatted', 'Approved 1 At'],

['approved2_by_name', 'Approved 2'],
['approved2_at_formatted', 'Approved 2 At'],

['approved_final_by_name', 'Approved Final'],
['approved_final_at_formatted', 'Approved Final At'],
] as const

  /** =========================
   * Render
   * ========================= */
  return (
    <div className="min-h-screen p-6">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: theme === 'dark' ? '#1f2937' : '#fff',
            color: theme === 'dark' ? '#f3f4f6' : '#111827',
            borderRadius: '12px',
            border: theme === 'dark' ? '1px solid #374151' : '1px solid #e5e7eb',
          },
        }}
      />

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6" style={{ textTransform: 'capitalize' }}>
          <div>
            <h1
              className={`text-4xl font-bold bg-gradient-to-r ${theme === 'dark' ? 'from-blue-100 to-sky-100' : 'from-blue-600 to-sky-600'
                } bg-clip-text text-transparent`}
            >
              stok barang
            </h1>
            <p className={`mt-2 text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Manage your stok barang efficiently
            </p>
          </div>

          <div className="flex gap-4">
  
          </div>
        </div>
      </div>

      {/* Search + Actions */}
      <div className={`mb-6 p-6 rounded-2xl border shadow-lg backdrop-blur-sm ${cardClass}`}>
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative flex-1 max-w-xl w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
            </div>
            <input
              type="text"
              placeholder="Search stok barang..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Per Page:
              </label>
              <select
                value={pagination.limit}
                onChange={(e) => handleLimitChange(Number(e.target.value))}
                className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
                  }`}
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>

      
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Total: <span className="font-bold">{pagination.total}</span>
              </span>
            </div>

            {stats.active > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Active: <span className="font-bold">{stats.active}</span>
                </span>
              </div>
            )}

            {stats.inactive > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Inactive: <span className="font-bold">{stats.inactive}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className={`rounded-2xl border shadow-xl overflow-hidden backdrop-blur-sm ${cardClass}`}>
        {loading ? (
          <div className="flex flex-col justify-center items-center h-96 p-8">
            <div className="relative">
              <div
                className={`w-16 h-16 border-4 rounded-full animate-spin ${theme === 'dark' ? 'border-blue-500/30 border-t-blue-400' : 'border-blue-200 border-t-blue-600'
                  }`}
              />
              <Loader2 className="w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin text-blue-600 dark:text-blue-400" />
            </div>
            <p className={`mt-4 text-lg font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Loading stok barang...
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className={tableHeaderClass}>
                  <tr>
                    <th className="px-6 py-4 text-left w-12">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={items.length > 0 && selectedRows.length === items.length}
                          onChange={toggleSelectAll}
                          className={`rounded ${theme === 'dark'
                              ? 'bg-gray-700 border-gray-600 checked:bg-blue-500 focus:ring-blue-500'
                              : 'border-gray-300 checked:bg-blue-600 focus:ring-blue-500'
                            } focus:ring-2 focus:ring-offset-0`}
                        />
                      </div>
                    </th>
{(columns).map(([field, label]) => (
                      <th key={field} className="px-6 py-4 text-left text-sm font-semibold">
                        <button
                          onClick={() => handleSort(field as keyof StokbarangItem)}
                          className="flex items-center gap-2 hover:text-blue-500 transition-colors"
                        >
                          {label}
                          {sortField === field ? (
                            sortDirection === 'asc' ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )
                          ) : (
                            <ChevronsUpDown className="w-4 h-4 opacity-50" />
                          )}
                        </button>
                      </th>
                    ))}

                    <th className="px-6 py-4 text-left text-sm font-semibold w-32">Actions</th>
                  </tr>
                </thead>

<tbody className="divide-y divide-gray-200 dark:divide-gray-800">
  {items.length > 0 ? (
    items.map((item: any, index: number) => (
      <tr
        key={item.id}
        className={`transition-all duration-200 hover:scale-[1.002] ${tableRowClass(index)}`}
      >
        <td className="px-6 py-4">
          <input
            type="checkbox"
            checked={selectedRows.includes(item.id)}
            onChange={() => toggleRowSelection(item.id)}
          />
        </td>

        {columns.map(([field]) => {
          const value = item[field as keyof typeof item]

          if (field === 'status_badge') {
            return (
              <td
                key={field}
                className="px-6 py-4"
                dangerouslySetInnerHTML={{ __html: value || '-' }}
              />
            )
          }

          return (
            <td key={field} className="px-6 py-4">
              {value ?? '-'}
            </td>
          )
        })}

      </tr>
    ))
  ) : (
    <tr>
      <td colSpan={columns.length + 2} className="px-6 py-12 text-center">
        No data found
      </td>
    </tr>
  )}
</tbody>
                
              </table>
            </div>

            {pagination.totalPages > 1 && (
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
                theme={theme}
              />
            )}
          </>
        )}
      </div>



      {/* Custom global styles */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          10%,
          30%,
          50%,
          70%,
          90% {
            transform: translateX(-5px);
          }
          20%,
          40%,
          60%,
          80% {
            transform: translateX(5px);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }

        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        ::-webkit-scrollbar-track {
          background: ${theme === 'dark' ? '#1f2937' : '#f3f4f6'};
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb {
          background: ${theme === 'dark' ? '#4b5563' : '#9ca3af'};
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: ${theme === 'dark' ? '#6b7280' : '#6b7280'};
        }
      `}</style>
    </div>
  );
}