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

/** =========================
 * Types
 * ========================= */
interface StokbarangItem {
  id: string;
  kode_material: string;
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

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<StokbarangFormData>();

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
  
  // Format number dengan 2 digit desimal dan ganti titik dengan koma
  return value.toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).replace(/\./g, ','); // Ganti pemisah ribuan dengan format Indonesia
};

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
  const openModal = (item?: StokbarangItem) => {
    if (item) {
      setEditingId(item.id);
      setValue('id', item.id);
      setValue('kode_material', item.kode_material);
      setValue('kode_gudang', item.kode_gudang);
      setValue('bulan', item.bulan);
      setValue('tahun', item.tahun);
      setValue('stok_awal', item.stok_awal ?? null);
      setValue('tanggal_kadaluarsa', item.tanggal_kadaluarsa ?? null);
    } else {
      setEditingId(null);
      reset({
        id: '',
        kode_material: '',
        kode_gudang: '',
        bulan: 1,
        tahun: currentYear,
        stok_awal: null,
        tanggal_kadaluarsa: null,
      });
    }

    fetchDropdownOptions();
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    reset({
      id: '',
      kode_material: '',
      kode_gudang: '',
      bulan: 1,
      tahun: currentYear,
      stok_awal: null,
      tanggal_kadaluarsa: null,
    });
  };

  /** =========================
   * Delete handlers
   * ========================= */
  const openDeleteModal = (item: StokbarangItem) => {
    setDeletingItem(item);
    setIsDeleteModalOpen(true);
  };

  const openBulkDeleteModal = () => {
    if (selectedRows.length > 0) setIsBulkDeleteModalOpen(true);
  };

  const closeDeleteModals = () => {
    setIsDeleteModalOpen(false);
    setIsBulkDeleteModalOpen(false);
    setDeletingItem(null);
    setDeleteLoading(false);
  };

  const handleDelete = async () => {
    if (!deletingItem) return;

    try {
      setDeleteLoading(true);
      await api.post('stokbarang/remove', { id: deletingItem.id });
      toast.success('Deleted successfully!');
      await fetchData(pagination.page);
      setSelectedRows((prev) => prev.filter((rowId) => rowId !== deletingItem.id));
      closeDeleteModals();
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status !== 401) toast.error(error.response?.data?.message || 'Failed to delete');
      } else {
        toast.error('An error occurred');
      }
      console.error('Delete error:', error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) return;

    try {
      setDeleteLoading(true);

      await Promise.all(selectedRows.map((id) => api.post('stokbarang/remove', { id })));

      toast.success(`Successfully deleted ${selectedRows.length} items!`);
      setSelectedRows([]);
      await fetchData(pagination.page);
      closeDeleteModals();
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status !== 401) toast.error(error.response?.data?.message || 'Bulk delete failed');
      } else {
        toast.error('An error occurred');
      }
      console.error('Bulk delete error:', error);
    } finally {
      setDeleteLoading(false);
    }
  };

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

  /** =========================
   * Submit handler - PERBAIKAN: memastikan stok_awal integer
   * ========================= */
  const onSubmit = async (data: StokbarangFormData) => {
    try {
      // Pastikan stok_awal adalah integer (jika ada)
      const stokAwalValue = data.stok_awal !== null && data.stok_awal !== undefined
        ? data.stok_awal
        : null;

      const requestData = {
        id: data.id ? data.id : null,
        kode_material: data.kode_material,
        kode_gudang: data.kode_gudang,
        bulan: data.bulan,
        tahun: data.tahun,
        stok_awal: stokAwalValue,
        tanggal_kadaluarsa: data.tanggal_kadaluarsa ?? null,
      };

      if (editingId) {
        const response = await api.post(`stokbarang/edit/${editingId}`, requestData);
        if (response.status === 200) {
          toast.success('Updated successfully!');
          await fetchData(pagination.page);
          closeModal();
        }
      } else {
        const response = await api.post('stokbarang/add', requestData);
        if (response.status === 200 || response.status === 201) {
          toast.success('Created successfully!');
          await fetchData(pagination.page);
          closeModal();
        }
      }
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status !== 401) {
          const errorMessage = error.response?.data?.messages || error.response?.data?.message || 'Operation failed';
          toast.error(errorMessage);
        }
      } else toast.error('An error occurred');

      console.error('Submit error:', error);
    }
  };

  /** =========================
   * Theme classes / react-select styles
   * ========================= */
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

  const getSelectStyles = useCallback(
    () => ({
      control: (base: any, state: any) => ({
        ...base,
        backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
        borderColor:
          errors.kode_gudang || errors.kode_material ? '#ef4444' : theme === 'dark' ? '#374151' : '#e5e7eb',
        boxShadow: state.isFocused ? '0 0 0 2px #3b82f6' : 'none',
        borderRadius: '0.75rem',
        padding: '2px',
        minHeight: '46px',
        '&:hover': { borderColor: '#3b82f6' },
      }),
      menu: (base: any) => ({
        ...base,
        backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
        borderRadius: '0.75rem',
        boxShadow:
          theme === 'dark'
            ? '0 4px 6px -1px rgba(0, 0, 0, 0.5)'
            : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        zIndex: 60,
      }),
      option: (base: any, state: any) => ({
        ...base,
        backgroundColor: state.isSelected
          ? '#3b82f6'
          : state.isFocused
            ? theme === 'dark'
              ? '#374151'
              : '#f3f4f6'
            : 'transparent',
        color: state.isSelected ? '#ffffff' : theme === 'dark' ? '#f3f4f6' : '#111827',
        cursor: 'pointer',
        padding: '10px 12px',
        '&:active': { backgroundColor: state.isSelected ? '#2563eb' : '#d1d5db' },
      }),
      singleValue: (base: any) => ({ ...base, color: theme === 'dark' ? '#f3f4f6' : '#111827' }),
      input: (base: any) => ({ ...base, color: theme === 'dark' ? '#f3f4f6' : '#111827' }),
      placeholder: (base: any) => ({ ...base, color: theme === 'dark' ? '#9ca3af' : '#6b7280' }),
      dropdownIndicator: (base: any) => ({
        ...base,
        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
        '&:hover': { color: theme === 'dark' ? '#f3f4f6' : '#374151' },
      }),
    }),
    [errors.kode_gudang, errors.kode_material, theme]
  );

  const selectedKodeMaterial = watch('kode_material');
  const selectedKodeGudang = watch('kode_gudang');

  const selectedMaterialOption = useMemo(
    () => barangOptions.find((o) => o.value === selectedKodeMaterial) || null,
    [barangOptions, selectedKodeMaterial]
  );
  const selectedGudangOption = useMemo(
    () => gudangOptions.find((o) => o.value === selectedKodeGudang) || null,
    [gudangOptions, selectedKodeGudang]
  );

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
            <button
              onClick={() => openModal()}
              className="group px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              Add New stok barang
            </button>
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

            {selectedRows.length > 0 && (
              <button
                onClick={openBulkDeleteModal}
                className="group px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
              >
                <Trash2 className="w-5 h-5 group-hover:animate-pulse" />
                Delete ({selectedRows.length})
              </button>
            )}
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

                    {(
                      [
                        ['kode_material', 'Kode Material'],
                        ['kode_gudang', 'Kode Gudang'],
                        ['bulan', 'Bulan'],
                        ['tahun', 'Tahun'],
                        ['stok_awal', 'Stok Awal'],
                        ['tanggal_kadaluarsa', 'Tanggal Kadaluarsa'],
                      ] as const
                    ).map(([field, label]) => (
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
                    items.map((item, index) => (
                      <tr key={item.id} className={`transition-all duration-200 hover:scale-[1.002] ${tableRowClass(index)}`}>
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedRows.includes(item.id)}
                            onChange={() => toggleRowSelection(item.id)}
                            className={`rounded ${theme === 'dark'
                                ? 'bg-gray-700 border-gray-600 checked:bg-blue-500 focus:ring-blue-500'
                                : 'border-gray-300 checked:bg-blue-600 focus:ring-blue-500'
                              } focus:ring-2 focus:ring-offset-0`}
                          />
                        </td>

                        <td className="px-6 py-4">{item.kode_material}</td>
                        <td className="px-6 py-4">{item.kode_gudang}</td>
                        <td className="px-6 py-4">{item.bulan}</td>
                        <td className="px-6 py-4">{item.tahun}</td>
                        <td className="px-6 py-4">{item.stok_awal ?? '-'}</td>
                        <td className="px-6 py-4">
                          <span className="font-medium">{item.tanggal_kadaluarsa ?? '-'}</span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openModal(item)}
                              className={`p-2 rounded-lg transition-all duration-200 hover:scale-105 ${theme === 'dark'
                                  ? 'text-blue-400 hover:bg-blue-900/30 hover:text-blue-300'
                                  : 'text-blue-600 hover:bg-blue-50 hover:text-blue-800'
                                }`}
                              title="Edit"
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>

                            <button
                              onClick={() => openDeleteModal(item)}
                              className={`p-2 rounded-lg transition-all duration-200 hover:scale-105 ${theme === 'dark'
                                  ? 'text-red-400 hover:bg-red-900/30 hover:text-red-300'
                                  : 'text-red-600 hover:bg-red-50 hover:text-red-800'
                                }`}
                              title="Delete"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={100} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <Key className={`w-12 h-12 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'} mb-4`} />
                          <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                            No stok barang found
                          </h3>
                          <p className={`mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            {searchTerm ? 'Try adjusting your search terms' : 'Get started by adding your first item'}
                          </p>
                          {!searchTerm && (
                            <button
                              onClick={() => openModal()}
                              className="mt-4 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                            >
                              Create First Item
                            </button>
                          )}
                        </div>
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

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className={`${cardClass} rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border`}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
                    <Key className={`w-6 h-6 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  <h2 className="text-xl font-bold text-black dark:text-gray-100">{editingId ? 'Edit' : 'New'} stok barang</h2>
                </div>
                <button
                  onClick={closeModal}
                  className={`p-2 rounded-lg transition-colors ${theme === 'dark'
                      ? 'hover:bg-gray-800 text-gray-400 hover:text-gray-200'
                      : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                    }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* hidden id */}
                <input type="hidden" {...register('id')} />

                {/* Barang */}
                <div className="space-y-2">
                  <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Pilih Barang *
                  </label>

                  <Select
                    options={barangOptions}
                    value={selectedMaterialOption}
                    onChange={(selected) => {
                      setValue('kode_material', selected?.value || '', { shouldValidate: true, shouldDirty: true });
                    }}
                    onBlur={() => trigger('kode_material')}
                    isLoading={loadingDropdowns}
                    isDisabled={loadingDropdowns}
                    placeholder={loadingDropdowns ? 'Loading materials...' : 'Select material...'}
                    isClearable
                    isSearchable
                    styles={getSelectStyles()}
                    theme={(t) => ({ ...t, colors: { ...t.colors, primary: '#3b82f6' } })}
                  />

                  {errors.kode_material && (
                    <p className="text-sm text-red-500 mt-1 animate-shake">{errors.kode_material.message}</p>
                  )}
                </div>

                {/* Gudang */}
                <div className="space-y-2">
                  <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Kode Gudang Tujuan *
                  </label>

                  <Select
                    options={gudangOptions}
                    value={selectedGudangOption}
                    onChange={(selected) => {
                      setValue('kode_gudang', selected?.value || '', { shouldValidate: true, shouldDirty: true });
                    }}
                    onBlur={() => trigger('kode_gudang')}
                    isLoading={loadingDropdowns}
                    isDisabled={loadingDropdowns}
                    placeholder={loadingDropdowns ? 'Loading warehouses...' : 'Select warehouse...'}
                    isClearable
                    isSearchable
                    styles={getSelectStyles()}
                    theme={(t) => ({ ...t, colors: { ...t.colors, primary: '#3b82f6' } })}
                  />

                  {errors.kode_gudang && (
                    <p className="text-sm text-red-500 mt-1 animate-shake">{errors.kode_gudang.message}</p>
                  )}
                </div>

                {/* Bulan */}
                <div className="space-y-2">
                  <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Bulan *
                  </label>
                  <input
                    type="number"
                    {...register('bulan', { valueAsNumber: true })}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                    placeholder="1-12"
                    min={1}
                    max={12}
                  />
                  {errors.bulan && <p className="text-sm text-red-500 mt-1 animate-shake">{errors.bulan.message}</p>}
                </div>

                {/* Tahun */}
                <div className="space-y-2">
                  <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Tahun *
                  </label>
                  <input
                    type="number"
                    {...register('tahun', { valueAsNumber: true })}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                    placeholder="Enter Tahun"
                    min={2000}
                    max={2100}
                  />
                  {errors.tahun && <p className="text-sm text-red-500 mt-1 animate-shake">{errors.tahun.message}</p>}
                </div>

   {/* Stok Awal - dengan dukungan koma */}
<div className="space-y-2">
  <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
    Stok Awal
  </label>
  <input
    type="text"  // Ubah dari "number" menjadi "text"
    inputMode="decimal"  // Tambahkan untuk mobile keyboard
    {...register('stok_awal', {
      setValueAs: (v) => {
        if (v === '' || v === null || v === undefined) return null;
        
        // Jika string, ganti koma dengan titik untuk value as number
        if (typeof v === 'string') {
          const normalizedValue = v.replace(/,/g, '.');
          const parsed = Number(normalizedValue);
          return isNaN(parsed) ? null : parsed;
        }
        
        // Jika sudah number
        const parsed = Number(v);
        return isNaN(parsed) ? null : parsed;
      }
    })}
    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
    placeholder="Enter Stok Awal (contoh: 10,5 atau 10.5)"
    onChange={(e) => {
      // Biarkan user mengetik koma
      const value = e.target.value;
      // Hanya izinkan angka, koma, dan titik
      const validValue = value.replace(/[^0-9,.]/g, '');
      if (validValue !== value) {
        e.target.value = validValue;
      }
    }}
    onKeyDown={(e) => {
      // Izinkan tombol kontrol: Backspace, Tab, Arrow, Delete, dll
      const controlKeys = [
        'Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 
        'ArrowUp', 'ArrowDown', 'Delete', 'Home', 'End'
      ];
      
      if (controlKeys.includes(e.key)) {
        return; // Izinkan tombol kontrol
      }
      
      // Izinkan angka, koma, dan titik
      const allowedChars = ['0','1','2','3','4','5','6','7','8','9',',','.'];
      if (!allowedChars.includes(e.key)) {
        e.preventDefault();
      }
      
      // Cegah multiple koma/titik
      if ((e.key === ',' || e.key === '.') && e.currentTarget.value.includes(',')) {
        e.preventDefault();
      }
    }}
  />
  {errors.stok_awal && (
    <p className="text-sm text-red-500 mt-1 animate-shake">{String(errors.stok_awal.message || '')}</p>
  )}
</div>
                {/* Tanggal Kadaluarsa */}
                <div className="space-y-2">
                  <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Tanggal Kadaluarsa
                  </label>
                  <input
                    type="date"
                    {...register('tanggal_kadaluarsa')}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                  />
                  {errors.tanggal_kadaluarsa && (
                    <p className="text-sm text-red-500 mt-1 animate-shake">
                      {String(errors.tanggal_kadaluarsa.message || '')}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={closeModal}
                  className={`flex-1 px-6 py-3 border rounded-xl font-medium transition-all duration-200 hover:scale-[1.02] ${theme === 'dark'
                      ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-[1.02] shadow-lg"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {editingId ? 'Updating...' : 'Creating...'}
                    </span>
                  ) : editingId ? (
                    'Update'
                  ) : (
                    'Create'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete modals */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModals}
        onConfirm={handleDelete}
        item={deletingItem || undefined}
        theme={theme}
        isBulk={false}
        loading={deleteLoading}
      />

      <DeleteConfirmationModal
        isOpen={isBulkDeleteModalOpen}
        onClose={closeDeleteModals}
        onConfirm={handleBulkDelete}
        theme={theme}
        isBulk={true}
        bulkCount={selectedRows.length}
        loading={deleteLoading}
      />

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