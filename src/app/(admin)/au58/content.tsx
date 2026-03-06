'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { toast, Toaster } from 'react-hot-toast';
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
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
 *  ENUMS sesuai DB
 *  ========================= */
type Au58Bagian = 'Afdeling 1' | 'Afdeling 2' | 'Afdeling 3' | 'Teknik' | 'SDM/Keuangan';
type Au58DikirimKepada = 'Afdeling 1' | 'Afdeling 2' | 'Afdeling 3' | 'Gudang Sentral' | undefined | null;
type Au58Status = 'draft' | 'pending' | 'approved1' | 'approved2' | 'approved_final' | 'rejected' | 'cancelled';

/** =========================
 *  MATERIAL OPTION TYPE (dari API /au53/get-dropdown-material-3)
 *  ========================= */
interface MaterialOption {
  value: string;
  label: string;
  uraian: string;
  sistem_perhitungan: 'luas_ha_x_dosis' | 'jumlah_pokok_x_dosis' | 'manual';
  satuan: string;
}

/** =========================
 *  RESPONSE ITEM (dari API)
 *  ========================= */
export interface Au58Item {
  id: string;
  nomor_manual: string | null;
  tanggal: string;
  unit: string;
  bagian: Au58Bagian;
  kode_material: string;
  uraian: string;
  tahun_tanam: number | null;
  nomor_blok: string | null;
  luas_ha: number | null;
  jumlah_pokok: number | null;
  dosis_cc_ha: number | null;
  satuan: string | null;
  banyaknya_diminta: number;
  banyaknya_dikeluarkan: number;
  harga_satuan: number | null;
  jumlah: number | null;
  no_rekg: string | null;
  sisa_setelah_dibukukan: number | null;
  barang_untuk_kegiatan: string | null;
  dikirim_kepada: Au58DikirimKepada;
  kode_gudang_pengirim: string | null;
  status: Au58Status | null;
  is_opla: boolean | number;
  created_by: string;
  created_at?: string | null;
  updated_by: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
}

interface ApiResponse {
  data: Au58Item[];
  recordsTotal: number;
  recordsFiltered: number;
  draw: number;
}

/** =========================
 *  SELECT OPTION TYPE
 *  ========================= */
interface SelectOption {
  value: string;
  label: string;
}

/** =========================
 * Debounce hook
 * ========================= */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

/** =========================
 * JWT helpers
 * ========================= */
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
    return Date.now() < tokenData.exp * 1000;
  } catch {
    return false;
  }
};

/** =========================
 * Axios instance
 * ========================= */
const createApiInstance = (router: any, userId?: string) => {
  const instance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || '',
    headers: { 'Content-Type': 'application/json' },
  });

  instance.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Tambahkan user_id ke setiap request POST/PUT (kecuali getAll)
      if (config.method?.toLowerCase() !== 'get' && userId) {
        if (config.data) {
          // Jika data sudah ada, tambahkan user_id
          if (typeof config.data === 'object') {
            config.data = {
              ...config.data,
              user_id: userId
            };
          }
        } else {
          // Jika tidak ada data, buat object baru dengan user_id
          config.data = { user_id: userId };
        }
      }
    }
    return config;
  });

  instance.interceptors.response.use(
    (r) => r,
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
  isLoading = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  item?: Au58Item;
  theme: string;
  isBulk?: boolean;
  bulkCount?: number;
  isLoading?: boolean;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div
        className={`rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-100 ${
          theme === 'dark'
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
                    Are you sure you want to delete <span className="font-semibold">{item?.nomor_manual || item?.id}</span>? This action
                    cannot be undone.
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <button
              onClick={onClose}
              disabled={isLoading}
              className={`flex-1 px-6 py-3 border rounded-xl font-medium transition-all duration-200 hover:scale-[1.02] ${
                theme === 'dark'
                  ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white font-medium rounded-xl hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-[1.02] shadow-lg flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Trash2 className="w-5 h-5" />
              )}
              {isLoading ? 'Deleting...' : (isBulk ? `Delete ${bulkCount} Items` : 'Delete Item')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/** =========================
 * Pagination
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
          className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200 ${
            currentPage === i
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
          className={`p-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
            theme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
          }`}
        >
          <ChevronFirst className="w-4 h-4" />
        </button>

        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`p-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
            theme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {renderPageNumbers()}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`p-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
            theme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
          }`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className={`p-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
            theme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
          }`}
        >
          <ChevronLast className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default function Au58Content() {
  const { user } = useAuth(); // Ambil user dari AuthContext
  const [items, setItems] = useState<Au58Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingItem, setDeletingItem] = useState<Au58Item | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof Au58Item>('tanggal');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, any>>({});

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
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Buat API instance dengan user ID
  const [api] = useState(() => createApiInstance(router, user?.id));

  // Update API instance ketika user berubah
  useEffect(() => {
    if (user?.id) {
      // Recreate API instance dengan user ID terbaru
      const newApi = createApiInstance(router, user.id);
      // Update state api
      Object.assign(api, newApi);
    }
  }, [user?.id]);

  /** =========================
   * Dropdown options
   * ========================= */
  const [materialOptions, setMaterialOptions] = useState<MaterialOption[]>([]);
  const [gudangOptions, setGudangOptions] = useState<SelectOption[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);

  // State untuk menyimpan sistem perhitungan material yang dipilih
  const [selectedMaterialSistem, setSelectedMaterialSistem] = useState<'luas_ha_x_dosis' | 'jumlah_pokok_x_dosis' | 'manual' | null>(null);
  const [selectedMaterialSatuan, setSelectedMaterialSatuan] = useState<string | null>(null);

  const fetchDropdownOptions = useCallback(async () => {
    try {
      setLoadingDropdowns(true);

      // Ganti endpoint ke au53/get-dropdown-material-3
      const materialResponse = await api.get('au53/get-dropdown-material-3');
      if (Array.isArray(materialResponse.data)) {
        setMaterialOptions(materialResponse.data);
      }

      const gudangResponse = await api.get('au53/get-dropdown-gudang');
      if (Array.isArray(gudangResponse.data)) setGudangOptions(gudangResponse.data);
    } catch (error) {
      console.error('Error fetching dropdown options:', error);
      toast.error('Failed to load dropdown options');
    } finally {
      setLoadingDropdowns(false);
    }
  }, [api]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    getValues,
    formState: { isSubmitting },
  } = useForm<any>({
    defaultValues: {
      id: undefined,
      nomor_manual: undefined,
      tanggal: new Date().toISOString().split('T')[0],
      unit: 'KEBUN TONDUHAN',
      bagian: 'Afdeling 1',
      kode_material: '',
      uraian: '',
      tahun_tanam: undefined,
      nomor_blok: undefined,
      luas_ha: undefined,
      jumlah_pokok: undefined,
      dosis_cc_ha: undefined,
      satuan: undefined,
      banyaknya_diminta: 0,
      banyaknya_dikeluarkan: 0,
      harga_satuan: undefined,
      jumlah: undefined,
      no_rekg: undefined,
      sisa_setelah_dibukukan: undefined,
      barang_untuk_kegiatan: undefined,
      dikirim_kepada: undefined,
      kode_gudang_pengirim: undefined,
      status: 'draft',
      is_opla: false,
    },
  });

  // Watch values for auto-calculation
  const luasHa = watch('luas_ha');
  const jumlahPokok = watch('jumlah_pokok');
  const dosisCcHa = watch('dosis_cc_ha');
  const kodeMaterial = watch('kode_material');

  /** =========================
   * Auto-calculation berdasarkan sistem_perhitungan
   * ========================= */
  useEffect(() => {
    // Cari material yang dipilih
    const selectedMaterial = materialOptions.find(m => m.value === kodeMaterial) as any;
    
    if (selectedMaterial) {
      // Update sistem perhitungan dan satuan
      setSelectedMaterialSistem(selectedMaterial.sistem_perhitungan);
      setSelectedMaterialSatuan(selectedMaterial.satuan);
      
      // Set uraian dan satuan otomatis
      setValue('uraian', selectedMaterial.uraian);
      setValue('satuan', selectedMaterial.satuan);
      
      // Hitung banyaknya_diminta berdasarkan sistem perhitungan
      let calculatedValue = 0;
      
      if (selectedMaterial.sistem_perhitungan === 'luas_ha_x_dosis') {
        // Kategori Bahan Kimia: Luas Ha x Dosis cc/Ha
        if (luasHa && dosisCcHa) {
          calculatedValue = luasHa * dosisCcHa;
        }
      } else if (selectedMaterial.sistem_perhitungan === 'jumlah_pokok_x_dosis') {
        // Kategori Pupuk: Jumlah Pokok x Dosis cc/Ha
        if (jumlahPokok && dosisCcHa) {
          calculatedValue = jumlahPokok * dosisCcHa;
        }
      } else if (selectedMaterial.sistem_perhitungan === 'manual') {
        // Kategori BBM: manual input, biarkan user mengisi manual
        // Tidak melakukan auto-calculate
        return;
      }
      
      // Set nilai yang sudah dihitung (untuk kasus non-manual)
      if (selectedMaterial && selectedMaterial.sistem_perhitungan !== 'manual') {
        setValue('banyaknya_diminta', calculatedValue);
      }
    } else {
      setSelectedMaterialSistem(null);
      setSelectedMaterialSatuan(null);
    }
  }, [kodeMaterial, luasHa, jumlahPokok, dosisCcHa, materialOptions, setValue]);

  /** Proteksi halaman */
  useEffect(() => {
    const checkAuth = async () => {
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
    };
    checkAuth();
  }, [router, logout]);

  /** Fetch dropdown options on mount */
  useEffect(() => {
    fetchDropdownOptions();
  }, [fetchDropdownOptions]);

  /** Column map */
  useEffect(() => {
    const fields = [
      'id', 'nomor_manual', 'tanggal', 'unit', 'bagian', 'kode_material', 'uraian',
      'tahun_tanam', 'nomor_blok', 'luas_ha', 'jumlah_pokok', 'dosis_cc_ha', 'satuan',
      'banyaknya_diminta', 'banyaknya_dikeluarkan', 'harga_satuan', 'jumlah', 'no_rekg',
      'sisa_setelah_dibukukan', 'barang_untuk_kegiatan', 'dikirim_kepada', 'kode_gudang_pengirim',
      'status', 'is_opla', 'created_by', 'updated_by'
    ];

    const indexMap: Record<string, number> = {};
    fields.forEach((field, index) => (indexMap[field] = index));
    setColumnIndexMap(indexMap);
  }, []);

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

        const params = {
          draw: pagination.draw,
          start,
          length: pagination.limit,
          'order[0][column]': columnIndex,
          'order[0][dir]': sortDirection,
          ...(debouncedSearchTerm && { 'search[value]': debouncedSearchTerm }),
          user_id: user?.id, // Sertakan user_id di parameter
        };

        const response = await api.get<ApiResponse>('au58/getAll', {
          params,
          paramsSerializer: { indexes: null },
        });

        const data = Array.isArray(response.data?.data) ? response.data.data : [];
        const recordsTotal = response.data?.recordsTotal ?? 0;
        const recordsFiltered = response.data?.recordsFiltered ?? recordsTotal;
        const draw = response.data?.draw ?? pagination.draw + 1;

        setItems(data);
        setPagination((prev) => ({
          ...prev,
          page,
          total: recordsTotal,
          totalPages: Math.ceil(recordsFiltered / prev.limit) || 1,
          draw,
        }));
      } catch (error: any) {
        console.error('Fetch error:', error);
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 404) toast.error('API endpoint not found.');
          else if (error.response?.status === 500) toast.error('Server error. Please try again later.');
          else if (error.response?.status !== 401) toast.error('Failed to fetch data.');
        } else {
          toast.error('An unexpected error occurred.');
        }

        setItems([]);
        setPagination((prev) => ({ ...prev, page: 1, total: 0, totalPages: 1 }));
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearchTerm, sortField, sortDirection, pagination.limit, pagination.draw, columnIndexMap, api, router, logout]
  );

  useEffect(() => {
    fetchData(pagination.page);
  }, [fetchData, pagination.page]);

  const handleSort = (field: keyof Au58Item) => {
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
   * OPEN MODAL
   * ========================= */
  const openModal = (item?: Au58Item) => {
    if (item) {
      setEditingId(item.id);
      
      // Set all form values from the item
      setValue('id', item.id);
      setValue('nomor_manual', item.nomor_manual ?? undefined);
      setValue('tanggal', item.tanggal);
      setValue('unit', item.unit);
      setValue('bagian', item.bagian);
      setValue('kode_material', item.kode_material);
      setValue('uraian', item.uraian);
      setValue('tahun_tanam', item.tahun_tanam ?? undefined);
      setValue('nomor_blok', item.nomor_blok ?? undefined);
      setValue('luas_ha', item.luas_ha ?? undefined);
      setValue('jumlah_pokok', item.jumlah_pokok ?? undefined);
      setValue('dosis_cc_ha', item.dosis_cc_ha ?? undefined);
      setValue('satuan', item.satuan ?? undefined);
      setValue('banyaknya_diminta', item.banyaknya_diminta);
      setValue('banyaknya_dikeluarkan', item.banyaknya_dikeluarkan ?? 0);
      setValue('harga_satuan', item.harga_satuan ?? undefined);
      setValue('jumlah', item.jumlah ?? undefined);
      setValue('no_rekg', item.no_rekg ?? undefined);
      setValue('sisa_setelah_dibukukan', item.sisa_setelah_dibukukan ?? undefined);
      setValue('barang_untuk_kegiatan', item.barang_untuk_kegiatan ?? undefined);
      setValue('dikirim_kepada', item.dikirim_kepada);
      setValue('kode_gudang_pengirim', item.kode_gudang_pengirim ?? undefined);
      setValue('status', item.status ?? 'draft');
      
      const oplaBool = item.is_opla === true || item.is_opla === 1;
      setValue('is_opla', oplaBool);

      // Set selected material info based on item's kode_material
      const selectedMaterial = materialOptions.find(m => m.value === item.kode_material);
      if (selectedMaterial) {
        setSelectedMaterialSistem(selectedMaterial.sistem_perhitungan);
        setSelectedMaterialSatuan(selectedMaterial.satuan);
      }
    } else {
      setEditingId(null);
      reset({
        id: undefined,
        nomor_manual: undefined,
        tanggal: new Date().toISOString().split('T')[0],
        unit: 'KEBUN TONDUHAN',
        bagian: 'Afdeling 1',
        kode_material: '',
        uraian: '',
        tahun_tanam: undefined,
        nomor_blok: undefined,
        luas_ha: undefined,
        jumlah_pokok: undefined,
        dosis_cc_ha: undefined,
        satuan: undefined,
        banyaknya_diminta: 0,
        banyaknya_dikeluarkan: 0,
        harga_satuan: undefined,
        jumlah: undefined,
        no_rekg: undefined,
        sisa_setelah_dibukukan: undefined,
        barang_untuk_kegiatan: undefined,
        dikirim_kepada: undefined,
        kode_gudang_pengirim: undefined,
        status: 'draft',
        is_opla: false,
      });
      setSelectedMaterialSistem(null);
      setSelectedMaterialSatuan(null);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    reset();
    setErrors({});
    setSelectedMaterialSistem(null);
    setSelectedMaterialSatuan(null);
  };

  const openDeleteModal = (item: Au58Item) => {
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

  /** =========================
   * SUBMIT - dengan user_id dari useAuth
   * ========================= */
  const onSubmit = async (data: any) => {
    try {
      // Data sudah termasuk user_id dari interceptor
      const requestData = {
        ...(editingId ? { id: editingId } : {}),
        nomor_manual: data.nomor_manual || null,
        tanggal: data.tanggal,
        unit: data.unit,
        bagian: data.bagian,
        kode_material: data.kode_material,
        uraian: data.uraian,
        tahun_tanam: data.tahun_tanam || null,
        nomor_blok: data.nomor_blok || null,
        luas_ha: data.luas_ha || null,
        jumlah_pokok: data.jumlah_pokok || null,
        dosis_cc_ha: data.dosis_cc_ha || null,
        satuan: data.satuan || null,
        banyaknya_diminta: data.banyaknya_diminta,
        banyaknya_dikeluarkan: data.banyaknya_dikeluarkan || 0,
        harga_satuan: data.harga_satuan || null,
        jumlah: data.jumlah || null,
        no_rekg: data.no_rekg || null,
        sisa_setelah_dibukukan: data.sisa_setelah_dibukukan || null,
        barang_untuk_kegiatan: data.barang_untuk_kegiatan || null,
        dikirim_kepada: data.dikirim_kepada,
        kode_gudang_pengirim: data.kode_gudang_pengirim || null,
        status: data.status,
        is_opla: data.is_opla,
      };

      if (editingId) {
        const response = await api.post(`au58/edit/${editingId}`, requestData);
        if (response.status === 200) {
          toast.success('Updated successfully!');
          fetchData(pagination.page);
          closeModal();
        }
      } else {
        const response = await api.post('au58/add', requestData);
        if (response.status === 200 || response.status === 201) {
          toast.success('Created successfully!');
          fetchData(pagination.page);
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
   * DELETE - dengan user_id dari useAuth
   * ========================= */
  const handleDelete = async () => {
    if (!deletingItem) return;
    try {
      setDeleteLoading(true);
      // Data termasuk user_id dari interceptor
      await api.post('au58/remove', { id: deletingItem.id });
      toast.success('Deleted successfully!');
      fetchData(pagination.page);
      closeDeleteModals();
      setSelectedRows((prev) => prev.filter((rowId) => rowId !== deletingItem.id));
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status !== 401) toast.error(error.response?.data?.message || 'Failed to delete');
      } else toast.error('An error occurred');
      console.error('Delete error:', error);
    } finally {
      setDeleteLoading(false);
    }
  };

  /** =========================
   * BULK DELETE - dengan user_id dari useAuth
   * ========================= */
  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) return;
    try {
      setDeleteLoading(true);
      // Data termasuk user_id dari interceptor untuk setiap request
      for (const id of selectedRows) {
        await api.post('au58/remove', { id });
      }
      toast.success(`Successfully deleted ${selectedRows.length} items!`);
      fetchData(pagination.page);
      setSelectedRows([]);
      closeDeleteModals();
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status !== 401) toast.error(error.response?.data?.message || 'Bulk delete failed');
      } else toast.error('An error occurred');
      console.error('Bulk delete error:', error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const toggleRowSelection = (id: string) => {
    setSelectedRows((prev) => (prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selectedRows.length === items.length && items.length > 0) setSelectedRows([]);
    else setSelectedRows(items.map((item) => item.id));
  };

  const getSelectStyles = useCallback(
    () => ({
      control: (base: any, state: any) => ({
        ...base,
        backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
        borderColor: errors.kode_gudang_pengirim || errors.kode_material ? '#ef4444' : theme === 'dark' ? '#374151' : '#e5e7eb',
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
    [errors.kode_gudang_pengirim, errors.kode_material, theme]
  );

  const selectedKodeMaterial = watch('kode_material');
  const selectedKodeGudang = watch('kode_gudang_pengirim');

  const selectedMaterialOption = useMemo(
    () => {
      const option = materialOptions.find((o) => o.value === selectedKodeMaterial);
      return option ? { value: option.value, label: option.label } : null;
    },
    [materialOptions, selectedKodeMaterial]
  );

  const selectedGudangOption = useMemo(
    () => gudangOptions.find((o) => o.value === selectedKodeGudang) || null,
    [gudangOptions, selectedKodeGudang]
  );

  // Theme-based styles
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

  // Helper untuk menampilkan info sistem perhitungan
  const getSistemPerhitunganLabel = (sistem: string | null) => {
    switch (sistem) {
      case 'luas_ha_x_dosis':
        return 'Bahan Kimia (Luas Ha × Dosis)';
      case 'jumlah_pokok_x_dosis':
        return 'Pupuk (Jumlah Pokok × Dosis)';
      case 'manual':
        return 'BBM (Manual Input)';
      default:
        return '-';
    }
  };

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

      {/* HEADER */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1
              className={`text-4xl font-bold bg-gradient-to-r ${
                theme === 'dark' ? 'from-blue-100 to-sky-100' : 'from-blue-600 to-sky-600'
              } bg-clip-text text-transparent`}
            >
              AU 58
            </h1>
            <p className={`mt-2 text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Manage Permintaan Barang AU 58</p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => openModal()}
              className="group px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              Add New AU58
            </button>
          </div>
        </div>
      </div>

      {/* SEARCH + ACTIONS */}
      <div className={`mb-6 p-6 rounded-2xl border shadow-lg backdrop-blur-sm ${cardClass}`}>
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative flex-1 max-w-xl w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
            </div>
            <input
              type="text"
              placeholder="Search AU58..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Per Page:</label>
              <select
                value={pagination.limit}
                onChange={(e) => handleLimitChange(Number(e.target.value))}
                className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                  theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
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
      </div>

      {/* TABLE */}
      <div className={`rounded-2xl border shadow-xl overflow-hidden backdrop-blur-sm ${cardClass}`}>
        {loading ? (
          <div className="flex flex-col justify-center items-center h-96 p-8">
            <div className="relative">
              <div
                className={`w-16 h-16 border-4 rounded-full animate-spin ${
                  theme === 'dark' ? 'border-blue-500/30 border-t-blue-400' : 'border-blue-200 border-t-blue-600'
                }`}
              />
              <Loader2 className="w-8 h-8 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-spin text-blue-600 dark:text-blue-400" />
            </div>
            <p className={`mt-4 text-lg font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Loading AU58...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className={tableHeaderClass}>
                  <tr>
                    <th className="px-6 py-4 text-left w-12">
                      <input
                        type="checkbox"
                        checked={selectedRows.length === items.length && items.length > 0}
                        onChange={toggleSelectAll}
                        className={`rounded ${
                          theme === 'dark'
                            ? 'bg-gray-700 border-gray-600 checked:bg-blue-500 focus:ring-blue-500'
                            : 'border-gray-300 checked:bg-blue-600 focus:ring-blue-500'
                        } focus:ring-2 focus:ring-offset-0`}
                      />
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      <button onClick={() => handleSort('nomor_manual')} className="flex items-center gap-2 hover:text-blue-500 transition-colors">
                        Nomor Manual
                        {sortField === 'nomor_manual' ? (sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                      </button>
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      <button onClick={() => handleSort('tanggal')} className="flex items-center gap-2 hover:text-blue-500 transition-colors">
                        Tanggal
                        {sortField === 'tanggal' ? (sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                      </button>
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      <button onClick={() => handleSort('unit')} className="flex items-center gap-2 hover:text-blue-500 transition-colors">
                        Unit
                        {sortField === 'unit' ? (sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                      </button>
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      <button onClick={() => handleSort('bagian')} className="flex items-center gap-2 hover:text-blue-500 transition-colors">
                        Bagian
                        {sortField === 'bagian' ? (sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                      </button>
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      <button onClick={() => handleSort('kode_material')} className="flex items-center gap-2 hover:text-blue-500 transition-colors">
                        Kode Material
                        {sortField === 'kode_material' ? (sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                      </button>
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      <button onClick={() => handleSort('uraian')} className="flex items-center gap-2 hover:text-blue-500 transition-colors">
                        Uraian
                        {sortField === 'uraian' ? (sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                      </button>
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      <button onClick={() => handleSort('banyaknya_diminta')} className="flex items-center gap-2 hover:text-blue-500 transition-colors">
                        Diminta
                        {sortField === 'banyaknya_diminta' ? (sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                      </button>
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      <button onClick={() => handleSort('satuan')} className="flex items-center gap-2 hover:text-blue-500 transition-colors">
                        Satuan
                        {sortField === 'satuan' ? (sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                      </button>
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      <button onClick={() => handleSort('dikirim_kepada')} className="flex items-center gap-2 hover:text-blue-500 transition-colors">
                        Dikirim Kepada
                        {sortField === 'dikirim_kepada' ? (sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                      </button>
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      <button onClick={() => handleSort('status')} className="flex items-center gap-2 hover:text-blue-500 transition-colors">
                        Status
                        {sortField === 'status' ? (sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                      </button>
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold w-32">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {items.length > 0 ? (
                    items.map((item, index) => (
                      <tr key={`${item.id}-${index}`} className={`transition-all duration-200 hover:scale-[1.002] ${tableRowClass(index)}`}>
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedRows.includes(item.id)}
                            onChange={() => toggleRowSelection(item.id)}
                            className={`rounded ${
                              theme === 'dark'
                                ? 'bg-gray-700 border-gray-600 checked:bg-blue-500 focus:ring-blue-500'
                                : 'border-gray-300 checked:bg-blue-600 focus:ring-blue-500'
                            } focus:ring-2 focus:ring-offset-0`}
                          />
                        </td>

                        <td className="px-6 py-4 font-medium">{item.nomor_manual ?? '-'}</td>
                        <td className="px-6 py-4">{item.tanggal}</td>
                        <td className="px-6 py-4">{item.unit}</td>
                        <td className="px-6 py-4">{item.bagian}</td>
                        <td className="px-6 py-4">{item.kode_material}</td>
                        <td className="px-6 py-4 max-w-xs truncate">{item.uraian}</td>
                        <td className="px-6 py-4">{item.banyaknya_diminta}</td>
                        <td className="px-6 py-4">{item.satuan ?? '-'}</td>
                        <td className="px-6 py-4">{item.dikirim_kepada}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            item.status === 'approved_final' ? 'bg-green-100 text-green-800' :
                            item.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {item.status}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openModal(item)}
                              className={`p-2 rounded-lg transition-all duration-200 hover:scale-105 ${
                                theme === 'dark'
                                  ? 'text-blue-400 hover:bg-blue-900/30 hover:text-blue-300'
                                  : 'text-blue-600 hover:bg-blue-50 hover:text-blue-800'
                              }`}
                              title="Edit"
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => openDeleteModal(item)}
                              className={`p-2 rounded-lg transition-all duration-200 hover:scale-105 ${
                                theme === 'dark'
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
                      <td colSpan={12} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <Key className={`w-12 h-12 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'} mb-4`} />
                          <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>No AU58 found</h3>
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
              <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} onPageChange={handlePageChange} theme={theme} />
            )}
          </>
        )}
      </div>

      {/* MODAL FORM - FULL WIDTH */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className={`${cardClass} rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-y-auto border`}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-inherit z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
                    <Key className={`w-6 h-6 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  <h2 className="text-xl font-bold text-black dark:text-gray-100">{editingId ? 'Edit' : 'New'} AU58</h2>
                </div>
                <button
                  onClick={closeModal}
                  className={`p-2 rounded-lg transition-colors ${
                    theme === 'dark' ? 'hover:bg-gray-800 text-gray-400 hover:text-gray-200' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <input type="hidden" {...register('id')} />
                
                {/* Info Sistem Perhitungan */}
                {selectedMaterialSistem && (
                  <div className="md:col-span-4 mb-2">
                    <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-blue-900/20' : 'bg-blue-50'} border ${theme === 'dark' ? 'border-blue-800' : 'border-blue-200'}`}>
                      <p className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>
                        Sistem Perhitungan: {getSistemPerhitunganLabel(selectedMaterialSistem)} | Satuan: {selectedMaterialSatuan || '-'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Row 1: Basic Info */}
                <div className="space-y-2">
                  <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Nomor Manual</label>
                  <input
                    type="text"
                    {...register('nomor_manual')}
                    className={`w-full px-4 py-3 border rounded-xl outline-none transition-all duration-200 ${inputClass}`}
                    placeholder="Nomor dari krani"
                  />
                </div>

                <div className="space-y-2">
                  <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Tanggal *</label>
                  <input
                    type="date"
                    {...register('tanggal')}
                    className={`w-full px-4 py-3 border rounded-xl outline-none transition-all duration-200 ${inputClass}`}
                  />
                </div>

                <div className="space-y-2">
                  <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Unit *</label>
                  <input
                    type="text"
                    readOnly
                    {...register('unit')}
                    className={`w-full px-4 py-3 border rounded-xl outline-none transition-all duration-200 ${inputClass}`}
                  />
                </div>

                <div className="space-y-2">
                  <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Bagian *</label>
                  <select
                    {...register('bagian')}
                    className={`w-full px-4 py-3 border rounded-xl outline-none transition-all duration-200 ${inputClass}`}
                  >
                    <option value="Afdeling 1">Afdeling 1</option>
                    <option value="Afdeling 2">Afdeling 2</option>
                    <option value="Afdeling 3">Afdeling 3</option>
                    <option value="Teknik">Teknik</option>
                    <option value="SDM/Keuangan">SDM/Keuangan</option>
                  </select>
                </div>

                {/* Row 2: Material Info */}
                <div className="space-y-2 md:col-span-2">
                  <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Material *</label>
                  <Select
                    options={materialOptions.map(m => ({ value: m.value, label: m.label }))}
                    value={selectedMaterialOption}
                    onChange={(option) => {
                      setValue('kode_material', option?.value || '');
                      // Reset nilai yang mungkin mempengaruhi kalkulasi
                      setValue('banyaknya_diminta', 0);
                    }}
                    isLoading={loadingDropdowns}
                    placeholder="Pilih material..."
                    isClearable
                    styles={getSelectStyles()}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Uraian</label>
                  <input
                    type="text"
                    {...register('uraian')}
                    readOnly
                    className={`w-full px-4 py-3 border rounded-xl outline-none transition-all duration-200 ${inputClass} bg-opacity-50`}
                    placeholder="Otomatis terisi"
                  />
                </div>

                {/* Row 3: Agricultural Fields */}
                <div className="space-y-2">
                  <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Tahun Tanam</label>
                  <input
                    type="number"
                    {...register('tahun_tanam')}
                    className={`w-full px-4 py-3 border rounded-xl outline-none transition-all duration-200 ${inputClass}`}
                    placeholder="2024"
                  />
                </div>

                <div className="space-y-2">
                  <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Nomor Blok</label>
                  <input
                    type="text"
                    {...register('nomor_blok')}
                    className={`w-full px-4 py-3 border rounded-xl outline-none transition-all duration-200 ${inputClass}`}
                    placeholder="Blok A1"
                  />
                </div>

                <div className="space-y-2">
                  <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Luas (Ha)</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('luas_ha')}
                    className={`w-full px-4 py-3 border rounded-xl outline-none transition-all duration-200 ${inputClass}`}
                    placeholder="0.00"
                    disabled={selectedMaterialSistem === 'jumlah_pokok_x_dosis' || selectedMaterialSistem === 'manual'}
                  />
                </div>

                <div className="space-y-2">
                  <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Jumlah Pokok</label>
                  <input
                    type="number"
                    {...register('jumlah_pokok')}
                    className={`w-full px-4 py-3 border rounded-xl outline-none transition-all duration-200 ${inputClass}`}
                    placeholder="0"
                    disabled={selectedMaterialSistem === 'luas_ha_x_dosis' || selectedMaterialSistem === 'manual'}
                  />
                </div>

                <div className="space-y-2">
                  <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Dosis (cc/Ha)</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('dosis_cc_ha')}
                    className={`w-full px-4 py-3 border rounded-xl outline-none transition-all duration-200 ${inputClass}`}
                    placeholder="0.00"
                    disabled={selectedMaterialSistem === 'manual'}
                  />
                </div>

                {/* Row 4: Quantity Fields */}
                <div className="space-y-2">
                  <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Banyaknya Diminta *</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('banyaknya_diminta')}
                    className={`w-full px-4 py-3 border rounded-xl outline-none transition-all duration-200 ${inputClass} ${
                      selectedMaterialSistem !== 'manual' ? 'bg-opacity-50' : ''
                    }`}
                    readOnly={selectedMaterialSistem !== 'manual'}
                  />
                  {selectedMaterialSistem !== 'manual' && (
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      Nilai otomatis dari perhitungan
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Satuan</label>
                  <input
                    type="text"
                    {...register('satuan')}
                    readOnly
                    className={`w-full px-4 py-3 border rounded-xl outline-none transition-all duration-200 ${inputClass} bg-opacity-50`}
                    placeholder="Otomatis terisi"
                  />
                </div>

                <div className="space-y-2">
                  <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Banyaknya Dikeluarkan</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('banyaknya_dikeluarkan')}
                    className={`w-full px-4 py-3 border rounded-xl outline-none transition-all duration-200 ${inputClass}`}
                  />
                </div>

                <div className="space-y-2">
                  <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Harga Satuan</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('harga_satuan')}
                    className={`w-full px-4 py-3 border rounded-xl outline-none transition-all duration-200 ${inputClass}`}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Jumlah</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('jumlah')}
                    className={`w-full px-4 py-3 border rounded-xl outline-none transition-all duration-200 ${inputClass}`}
                    placeholder="0.00"
                  />
                </div>

                {/* Row 5: Additional Fields */}
                <div className="space-y-2">
                  <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>No Rekening</label>
                  <input
                    type="text"
                    {...register('no_rekg')}
                    className={`w-full px-4 py-3 border rounded-xl outline-none transition-all duration-200 ${inputClass}`}
                    placeholder="No rekening"
                  />
                </div>

                <div className="space-y-2">
                  <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Sisa Setelah Dibukukan</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('sisa_setelah_dibukukan')}
                    className={`w-full px-4 py-3 border rounded-xl outline-none transition-all duration-200 ${inputClass}`}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Barang Untuk Kegiatan</label>
                  <input
                    type="text"
                    {...register('barang_untuk_kegiatan')}
                    className={`w-full px-4 py-3 border rounded-xl outline-none transition-all duration-200 ${inputClass}`}
                    placeholder="Kegiatan"
                  />
                </div>

                {/* Row 6: Delivery Info */}
                <div className="space-y-2">
                  <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Kode Gudang Pengirim</label>
                  <Select
                    options={gudangOptions}
                    value={selectedGudangOption}
                    onChange={(option) => setValue('kode_gudang_pengirim', option?.value || '')}
                    isLoading={loadingDropdowns}
                    placeholder="Pilih kode gudang..."
                    isClearable
                    styles={getSelectStyles()}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={closeModal}
                  className={`flex-1 px-6 py-3 border rounded-xl font-medium transition-all duration-200 hover:scale-[1.02] ${
                    theme === 'dark' ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
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
                  ) : editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModals}
        onConfirm={handleDelete}
        item={deletingItem || undefined}
        theme={theme}
        isBulk={false}
        isLoading={deleteLoading}
      />

      <DeleteConfirmationModal
        isOpen={isBulkDeleteModalOpen}
        onClose={closeDeleteModals}
        onConfirm={handleBulkDelete}
        theme={theme}
        isBulk={true}
        bulkCount={selectedRows.length}
        isLoading={deleteLoading}
      />
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .animate-shake { animation: shake 0.5s ease-in-out; }
      `}</style>
    </div>
  );
}