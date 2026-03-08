'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast, Toaster } from 'react-hot-toast';
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import axios from 'axios';
import { useRouter } from 'next/navigation';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  CheckCircle,
  XCircle,
  Key,
  Loader2,
  AlertTriangle,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronFirst,
  ChevronLast,
} from 'lucide-react';

import Select from 'react-select';

// Define TypeScript interface
interface DatabarangbekasItem {
  id: '',
  nama_barang_bekas: '',
  kategori_barang_bekas: '',
  satuan: '',
  jumlah_tersedia: '',
  lokasi_penyimpanan: '',
  keterangan: '',
  tanggal_terima: '',
  created_by: ''
}

interface ApiResponse {
  data: DatabarangbekasItem[];
  recordsTotal: number;
  recordsFiltered: number;
  draw: number;
}

// Define validation schema
const databarangbekasSchema = z.object({
  id: z.string().optional(),

  nama_barang_bekas: z
    .string()
    .min(1, "Nama barang wajib diisi"),

  kategori_barang_bekas: z
    .string()
    .min(1, "Kategori wajib diisi"),

  satuan: z
    .string()
    .min(1, "Satuan wajib diisi"),

  jumlah_tersedia: z
    .string()
    .optional(),

  lokasi_penyimpanan: z
    .string()
    .min(1, "Lokasi penyimpanan wajib diisi"),

  keterangan: z
    .string()
    .optional(),

  tanggal_terima: z
    .string()
    .optional(),
});

type databarangbekasFormData = z.infer<typeof databarangbekasSchema>;

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Helper untuk decode JWT token
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
  } catch (error) {
    return null;
  }
};


// Check token validity
const isTokenValid = (token: string): boolean => {
  try {
    const tokenData = decodeJWT(token);
    if (!tokenData || !tokenData.exp) return false;

    const tokenExp = tokenData.exp * 1000;
    return Date.now() < tokenExp;
  } catch (error) {
    return false;
  }
};

// Create axios instance with authentication
const createApiInstance = (router: any, userId?: string) => {
  const instance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || '',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor untuk menambahkan bearer token
  instance.interceptors.request.use(
    (config) => {
      // Client-side only check
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
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor untuk handle token expired
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      // Skip interceptor untuk endpoint auth
      if (error.config?.url?.includes('/login') ||
        error.config?.url?.includes('/register') ||
        error.config?.url?.includes('/validate')) {
        return Promise.reject(error);
      }

      if (error.response?.status === 401 && typeof window !== 'undefined') {
        // Clear auth data
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('last_validation');

        // Show toast notification
        setTimeout(() => {
          toast.error('Session expired. Please login again.');
        }, 100);

        // Redirect to login
        router.push('/login');
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

// Badge component for status
const StatusBadge = ({ status }: { status: string }) => {
  const isActive = status === 'Y' || status === '1' || status === 'true' || status === 'active' || status === 'true';
  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${isActive
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      }`}>
      {isActive ? (
        <>
          <CheckCircle className="w-4 h-4 mr-1.5" />
          Active
        </>
      ) : (
        <>
          <XCircle className="w-4 h-4 mr-1.5" />
          Inactive
        </>
      )}
    </div>
  );
};

// Delete Confirmation Modal Component
const DeleteConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  item,
  theme,
  isBulk = false,
  bulkCount = 0
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  item?: DatabarangbekasItem;
  theme: string;
  isBulk?: boolean;
  bulkCount?: number;
}) => {
  if (!isOpen) return null;


  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className={`rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-100 ${theme === 'dark'
        ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700'
        : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'
        } border`}>
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100'
              }`}>
              <AlertTriangle className={`w-6 h-6 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold">
                {isBulk ? `Delete ${bulkCount} Items` : 'Delete Item'}
              </h3>
              <p className={`mt-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                {isBulk ? (
                  `Are you sure you want to delete ${bulkCount} selected items? This action cannot be undone.`
                ) : (
                  <>
                    Are you sure you want to delete <span className="font-semibold">{item?.id}</span>?
                    This action cannot be undone.
                  </>
                )}
              </p>

              {!isBulk && item && (
                <div className={`mt-4 p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50'
                  }`}>
                  <div className="grid grid-cols-2 gap-3 text-sm">

                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Nama Barang Bekas:</span>
                      <p className="font-medium">{item.nama_barang_bekas}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Kategori Barang Bekas:</span>
                      <p className="font-medium">{item.kategori_barang_bekas}</p>
                    </div>

                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Satuan:</span>
                      <p className="font-medium">{item.satuan}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Jumlah Tersedia:</span>
                      <p className="font-medium">{item.jumlah_tersedia}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Lokasi Penyimpanan:</span>
                      <p className="font-medium">{item.lokasi_penyimpanan}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Keterangan:</span>
                      <p className="font-medium">{item.keterangan}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Tanggal Terima:</span>
                      <p className="font-medium">{item.tanggal_terima}</p>
                    </div>

                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Created By:</span>
                      <p className="font-medium">{item.created_by}</p>
                    </div>

                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <button
              onClick={onClose}
              className={`flex-1 px-6 py-3 border rounded-xl font-medium transition-all duration-200 hover:scale-[1.02] ${theme === 'dark'
                ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white font-medium rounded-xl hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-[1.02] shadow-lg flex items-center justify-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
              {isBulk ? `Delete ${bulkCount} Items` : 'Delete Item'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Pagination Component
const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  theme
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
          className={`p-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${theme === 'dark'
            ? 'hover:bg-gray-700 text-gray-300'
            : 'hover:bg-gray-100 text-gray-600'
            }`}
        >
          <ChevronFirst className="w-4 h-4" />
        </button>

        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`p-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${theme === 'dark'
            ? 'hover:bg-gray-700 text-gray-300'
            : 'hover:bg-gray-100 text-gray-600'
            }`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {renderPageNumbers()}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`p-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${theme === 'dark'
            ? 'hover:bg-gray-700 text-gray-300'
            : 'hover:bg-gray-100 text-gray-600'
            }`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className={`p-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${theme === 'dark'
            ? 'hover:bg-gray-700 text-gray-300'
            : 'hover:bg-gray-100 text-gray-600'
            }`}
        >
          <ChevronLast className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default function DatabarangbekasContent() {
  const { user } = useAuth();
  const [items, setItems] = useState<DatabarangbekasItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingItem, setDeletingItem] = useState<DatabarangbekasItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
  });

  // State untuk mapping kolom ke indeks (diperlukan untuk DataTables)
  const [columnIndexMap, setColumnIndexMap] = useState<Record<string, number>>({});

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    draw: 1,
  });

  const { theme } = useTheme();
  const { isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Create axios instance dengan interceptor
  const [api] = useState(() => createApiInstance(router, user?.id));

  const {
    register,
    handleSubmit,
    reset,
    setValue,
     watch,  // Tambahkan ini
    trigger, // Tambahkan ini
    formState: { errors, isSubmitting },
  } = useForm<databarangbekasFormData>({
    resolver: zodResolver(databarangbekasSchema),
    defaultValues: {
      id: '',
      nama_barang_bekas: '',
      kategori_barang_bekas: '',
      satuan: '',
      jumlah_tersedia: '',
      lokasi_penyimpanan: '',
      keterangan: '',
      tanggal_terima: '',
    }
  });

  // Proteksi halaman - redirect jika tidak authenticated
  useEffect(() => {
    const checkAuth = async () => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('auth_token');

        if (!token) {
          toast.error('Please login to access this page');
          router.push('/login');
          return;
        }

        // Cek validitas token JWT lokal tanpa request ke server
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

  // Inisialisasi column index map saat komponen mount
  useEffect(() => {
    const fields = [
      'nama_barang_bekas',
      'kategori_barang_bekas',
      'satuan',
      'jumlah_tersedia',
      'lokasi_penyimpanan',
      'keterangan',
      'tanggal_terima',
      'created_by'
    ];

    const indexMap: Record<string, number> = {};
    fields.forEach((field, index) => {
      indexMap[field] = index;
    });
    setColumnIndexMap(indexMap);
  }, []);

  // Fetch data dengan format DataTables
  const fetchData = useCallback(async (page = 1) => {
    try {
      setLoading(true);

      // Check authentication
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          toast.error('Please login to access this page');
          router.push('/login');
          return;
        }

        // Cek validitas token JWT lokal
        if (!isTokenValid(token)) {
          toast.error('Session expired. Please login again.');
          logout();
          router.push('/login');
          return;
        }
      }

      // Hitung start berdasarkan page dan limit
      const start = (page - 1) * pagination.limit;

      // Dapatkan indeks kolom untuk sorting
      const columnIndex = columnIndexMap[sortField] ?? 0;

      // Bangun parameter DataTables
      const params = {
        draw: pagination.draw,
        start: start,
        length: pagination.limit,
        'order[0][column]': columnIndex,
        'order[0][dir]': sortDirection,
        ...(debouncedSearchTerm && { 'search[value]': debouncedSearchTerm })
      };

      // Gunakan instance api yang sudah memiliki bearer token
      const response = await api.get('databarangbekas/getAll', {
        params,
        paramsSerializer: {
          indexes: null // Penting untuk format array
        }
      });

      let data = [];
      let recordsTotal = 0;
      let recordsFiltered = 0;
      let draw = 1;

      // Handle response DataTables
      if (response.data) {
        data = response.data.data || [];
        recordsTotal = response.data.recordsTotal || 0;
        recordsFiltered = response.data.recordsFiltered || recordsTotal;
        draw = response.data.draw || pagination.draw + 1;
      }

      if (!Array.isArray(data)) {
        console.warn('Data is not an array:', data);
        data = [];
      }

      setItems(data);

      // Update pagination info
      setPagination(prev => ({
        ...prev,
        page: page,
        total: recordsTotal,
        totalPages: Math.ceil(recordsFiltered / prev.limit) || 1,
        draw: draw,
      }));

      // Calculate stats jika ada status field
      // No status field detected
    } catch (error: any) {
      console.error('Fetch error details:', error);

      // Biarkan interceptor yang menangani error 401
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          // Interceptor sudah handle, cukup log saja
          console.log('Unauthorized - interceptor will handle');
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
      setPagination(prev => ({
        ...prev,
        page: 1,
        total: 0,
        totalPages: 1,
      }));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchTerm, sortField, sortDirection, pagination.limit, columnIndexMap, api, router, logout]);

  // Fetch data saat dependencies berubah
  useEffect(() => {
    fetchData(pagination.page);
  }, [fetchData, pagination.page]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    // Reset ke halaman 1 saat sorting berubah
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const handleLimitChange = (limit: number) => {
    setPagination(prev => ({ ...prev, limit, page: 1 }));
  };

  const openModal = (item?: DatabarangbekasItem) => {
    if (item) {
      setEditingId(item.id);
      setValue('id', item.id);
      setValue('nama_barang_bekas', item.nama_barang_bekas);
      setValue('kategori_barang_bekas', item.kategori_barang_bekas);
      setValue('satuan', item.satuan);
      setValue('jumlah_tersedia', item.jumlah_tersedia);
      setValue('lokasi_penyimpanan', item.lokasi_penyimpanan);
      setValue('keterangan', item.keterangan);
      setValue('tanggal_terima', item.tanggal_terima);

    } else {
      setEditingId(null);
      reset({
        id: '',
        nama_barang_bekas: '',
        kategori_barang_bekas: '',
        satuan: '',
        jumlah_tersedia: '',
        lokasi_penyimpanan: '',
        keterangan: '',
        tanggal_terima: '',
      });
    }

    // Fetch dropdown options when modal opens
    fetchDropdownOptions();
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    reset({
      id: '',
      nama_barang_bekas: '',
      kategori_barang_bekas: '',
      jumlah_tersedia: '',
      lokasi_penyimpanan: '',
      keterangan: '',
      tanggal_terima: '',
    });
  };

  const openDeleteModal = (item: DatabarangbekasItem) => {
    setDeletingItem(item);
    setIsDeleteModalOpen(true);
  };

  const openBulkDeleteModal = () => {
    if (selectedRows.length > 0) {
      setIsBulkDeleteModalOpen(true);
    }
  };

  const closeDeleteModals = () => {
    setIsDeleteModalOpen(false);
    setIsBulkDeleteModalOpen(false);
    setDeletingItem(null);
    setDeleteLoading(false);
  };

  const onSubmit = async (data: databarangbekasFormData) => {
    try {
      const requestData = {
        ...(editingId ? { id: editingId } : {}),        
        nama_barang_bekas: data.nama_barang_bekas,
        kategori_barang_bekas: data.kategori_barang_bekas,
        satuan: data.satuan,
        jumlah_tersedia: data.jumlah_tersedia ? parseFloat(data.jumlah_tersedia) : null,
        lokasi_penyimpanan: data.lokasi_penyimpanan,
        keterangan: data.keterangan,
        user_id: user?.id,
        tanggal_terima: data.tanggal_terima,
      };

      if (editingId) {
        const response = await api.post(`databarangbekas/edit/${editingId}`, requestData);
        if (response.status === 200) {
          toast.success('Updated successfully!');
          fetchData(pagination.page);
          closeModal();
        }
      } else {
        const response = await api.post('databarangbekas/add', requestData);
        if (response.status === 200 || response.status === 201) {
          toast.success('Created successfully!');
          fetchData(pagination.page);
          closeModal();
        }
      }
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          // Interceptor akan handle redirect ke login
          console.log('Unauthorized during form submission');
        } else {
          const errorMessage = error.response?.data?.messages ||
            error.response?.data?.message ||
            'Operation failed';
          toast.error(errorMessage);
        }
      } else {
        toast.error('An error occurred');
      }
      console.error('Submit error:', error);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;

    try {
      setDeleteLoading(true);
      await api.post('databarangbekas/remove', { id: deletingItem.id });
      toast.success('Deleted successfully!');
      fetchData(pagination.page);
      closeDeleteModals();
      setSelectedRows(prev => prev.filter(rowId => rowId !== deletingItem.id));
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          // Interceptor akan handle redirect ke login
          console.log('Unauthorized during delete');
        } else {
          toast.error(error.response?.data?.message || 'Failed to delete');
        }
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
      // Delete items satu per satu
      for (const id of selectedRows) {
        await api.post('databarangbekas/remove', { id: id });
      }

      toast.success(`Successfully deleted ${selectedRows.length} items!`);
      fetchData(pagination.page);
      setSelectedRows([]);
      closeDeleteModals();
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          // Interceptor akan handle redirect ke login
          console.log('Unauthorized during bulk delete');
        } else {
          toast.error(error.response?.data?.message || 'Bulk delete failed');
        }
      } else {
        toast.error('An error occurred');
      }
      console.error('Bulk delete error:', error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const toggleRowSelection = (id: string) => {
    setSelectedRows(prev =>
      prev.includes(id)
        ? prev.filter(rowId => rowId !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedRows.length === items.length && items.length > 0) {
      setSelectedRows([]);
    } else {
      setSelectedRows(items.map(item => item.id));
    }
  };





  type SelectOption = {
    value: string;
    label: string;
  };


  const [gudangOptions, setGudangOptions] = useState<SelectOption[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);

  // Fetch dropdown options
  const fetchDropdownOptions = useCallback(async () => {
    try {
      setLoadingDropdowns(true);


      // Fetch gudang dropdown
      const gudangResponse: any = await api.get('au53/get-dropdown-gudang');
      if (gudangResponse.data && Array.isArray(gudangResponse.data)) {
        setGudangOptions(gudangResponse.data);
      }
    } catch (error) {
      console.error('Error fetching dropdown options:', error);
      toast.error('Failed to load dropdown options');
    } finally {
      setLoadingDropdowns(false);
    }
  }, [api]);


  // Theme-based styles
  const cardClass = theme === 'dark'
    ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700'
    : 'bg-gradient-to-br from-white to-gray-50 border-gray-200';

  const inputClass = theme === 'dark'
    ? `bg-gray-800/50 border-gray-700 text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 backdrop-blur-sm ${errors.id ? 'border-red-500' : ''
    }`
    : `bg-white/80 border-gray-200 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 backdrop-blur-sm ${errors.id ? 'border-red-300' : ''
    }`;

  const tableHeaderClass = theme === 'dark'
    ? 'bg-gray-800/50 text-gray-300 border-gray-700'
    : 'bg-gray-50/80 text-gray-600 border-gray-200';

  const tableRowClass = (index: number) => theme === 'dark'
    ? `bg-gray-900/30 hover:bg-gray-800/50 text-gray-100 ${index % 2 === 0 ? 'bg-gray-900/20' : ''}`
    : `hover:bg-gray-50/80 text-gray-900 ${index % 2 === 0 ? 'bg-gray-50/50' : ''}`;

  const getSelectStyles = useCallback(
    () => ({
      control: (base: any, state: any) => ({
        ...base,
        backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
       
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
    [ theme]
  );



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

      {/* Header with Stats */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6" style={{ textTransform: 'capitalize' }}>
          <div>
            <h1 className={`text-4xl font-bold bg-gradient-to-r ${theme === 'dark' ? 'from-blue-100 to-sky-100' : 'from-blue-600 to-sky-600'} bg-clip-text text-transparent`}>
              data barang bekas
            </h1>
            <p className={`mt-2 text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Manage your data barang bekas efficiently
            </p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => openModal()}
              className="group px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              Add New data barang bekas
            </button>
          </div>
        </div>
      </div>

      {/* Search and Actions Bar */}
      <div className={`mb-6 p-6 rounded-2xl border shadow-lg backdrop-blur-sm ${cardClass}`}>
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative flex-1 max-w-xl w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
            </div>
            <input
              type="text"
              placeholder="Search data barang bekas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Items per page selector */}
            <div className="flex items-center gap-2">
              <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Per Page:
              </label>
              <select
                value={pagination.limit}
                onChange={(e) => handleLimitChange(Number(e.target.value))}
                className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-gray-100'
                  : 'bg-white border-gray-300 text-gray-900'
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

        {/* Stats bar */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Total: <span className="font-bold">{pagination.total}</span>
              </span>
            </div>
            {stats.active > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Active: <span className="font-bold">{stats.active}</span>
                </span>
              </div>
            )}
            {stats.inactive > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Inactive: <span className="font-bold">{stats.inactive}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className={`rounded-2xl border shadow-xl overflow-hidden backdrop-blur-sm ${cardClass}`}>
        {loading ? (
          <div className="flex flex-col justify-center items-center h-96 p-8">
            <div className="relative">
              <div className={`w-16 h-16 border-4 rounded-full animate-spin ${theme === 'dark' ? 'border-blue-500/30 border-t-blue-400' : 'border-blue-200 border-t-blue-600'
                }`}></div>
              <Loader2 className="w-8 h-8 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-spin text-blue-600 dark:text-blue-400" />
            </div>
            <p className={`mt-4 text-lg font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Loading data barang bekas...
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
          checked={selectedRows.length === items.length && items.length > 0}
          onChange={toggleSelectAll}
          className={`rounded ${
            theme === 'dark'
              ? 'bg-gray-700 border-gray-600 checked:bg-blue-500 focus:ring-blue-500'
              : 'border-gray-300 checked:bg-blue-600 focus:ring-blue-500'
          } focus:ring-2 focus:ring-offset-0`}
        />
      </div>
    </th>

    <th className="px-6 py-4 text-left text-sm font-semibold">
      <button
        onClick={() => handleSort('nama_barang_bekas')}
        className="flex items-center gap-2 hover:text-blue-500 transition-colors"
      >
        Nama Barang Bekas
        {sortField === 'nama_barang_bekas' ? (
          sortDirection === 'asc'
            ? <ChevronUp className="w-4 h-4"/>
            : <ChevronDown className="w-4 h-4"/>
        ) : (
          <ChevronsUpDown className="w-4 h-4 opacity-50"/>
        )}
      </button>
    </th>

    <th className="px-6 py-4 text-left text-sm font-semibold">
      <button
        onClick={() => handleSort('kategori_barang_bekas')}
        className="flex items-center gap-2 hover:text-blue-500 transition-colors"
      >
        Kategori Barang
        {sortField === 'kategori_barang_bekas' ? (
          sortDirection === 'asc'
            ? <ChevronUp className="w-4 h-4"/>
            : <ChevronDown className="w-4 h-4"/>
        ) : (
          <ChevronsUpDown className="w-4 h-4 opacity-50"/>
        )}
      </button>
    </th>

    <th className="px-6 py-4 text-left text-sm font-semibold">
      <button
        onClick={() => handleSort('satuan')}
        className="flex items-center gap-2 hover:text-blue-500 transition-colors"
      >
        Satuan
        {sortField === 'satuan' ? (
          sortDirection === 'asc'
            ? <ChevronUp className="w-4 h-4"/>
            : <ChevronDown className="w-4 h-4"/>
        ) : (
          <ChevronsUpDown className="w-4 h-4 opacity-50"/>
        )}
      </button>
    </th>

    <th className="px-6 py-4 text-left text-sm font-semibold">
      <button
        onClick={() => handleSort('jumlah_tersedia')}
        className="flex items-center gap-2 hover:text-blue-500 transition-colors"
      >
        Jumlah Tersedia
        {sortField === 'jumlah_tersedia' ? (
          sortDirection === 'asc'
            ? <ChevronUp className="w-4 h-4"/>
            : <ChevronDown className="w-4 h-4"/>
        ) : (
          <ChevronsUpDown className="w-4 h-4 opacity-50"/>
        )}
      </button>
    </th>

    <th className="px-6 py-4 text-left text-sm font-semibold">
      <button
        onClick={() => handleSort('lokasi_penyimpanan')}
        className="flex items-center gap-2 hover:text-blue-500 transition-colors"
      >
        Lokasi Penyimpanan
        {sortField === 'lokasi_penyimpanan' ? (
          sortDirection === 'asc'
            ? <ChevronUp className="w-4 h-4"/>
            : <ChevronDown className="w-4 h-4"/>
        ) : (
          <ChevronsUpDown className="w-4 h-4 opacity-50"/>
        )}
      </button>
    </th>

    <th className="px-6 py-4 text-left text-sm font-semibold">
      <button
        onClick={() => handleSort('keterangan')}
        className="flex items-center gap-2 hover:text-blue-500 transition-colors"
      >
        Keterangan
        {sortField === 'keterangan' ? (
          sortDirection === 'asc'
            ? <ChevronUp className="w-4 h-4"/>
            : <ChevronDown className="w-4 h-4"/>
        ) : (
          <ChevronsUpDown className="w-4 h-4 opacity-50"/>
        )}
      </button>
    </th>

    <th className="px-6 py-4 text-left text-sm font-semibold">
      <button
        onClick={() => handleSort('tanggal_terima')}
        className="flex items-center gap-2 hover:text-blue-500 transition-colors"
      >
        Tanggal Terima
        {sortField === 'tanggal_terima' ? (
          sortDirection === 'asc'
            ? <ChevronUp className="w-4 h-4"/>
            : <ChevronDown className="w-4 h-4"/>
        ) : (
          <ChevronsUpDown className="w-4 h-4 opacity-50"/>
        )}
      </button>
    </th>

    <th className="px-6 py-4 text-left text-sm font-semibold">
      <button
        onClick={() => handleSort('created_by')}
        className="flex items-center gap-2 hover:text-blue-500 transition-colors"
      >
        Created By
        {sortField === 'created_by' ? (
          sortDirection === 'asc'
            ? <ChevronUp className="w-4 h-4"/>
            : <ChevronDown className="w-4 h-4"/>
        ) : (
          <ChevronsUpDown className="w-4 h-4 opacity-50"/>
        )}
      </button>
    </th>

    <th className="px-6 py-4 text-left text-sm font-semibold w-32">
      Actions
    </th>
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
                            className={`rounded ${theme === 'dark'
                              ? 'bg-gray-700 border-gray-600 checked:bg-blue-500 focus:ring-blue-500'
                              : 'border-gray-300 checked:bg-blue-600 focus:ring-blue-500'
                              } focus:ring-2 focus:ring-offset-0`}
                          />
                        </td>

                        <td className="px-6 py-4">
                          {item.nama_barang_bekas}
                        </td>
                        <td className="px-6 py-4">
                          {item.kategori_barang_bekas}
                        </td>


                        <td className="px-6 py-4">
                          {item.satuan}
                        </td>
                        <td className="px-6 py-4">
                          {item.jumlah_tersedia}
                        </td>
                        <td className="px-6 py-4">
                          {item.lokasi_penyimpanan}
                        </td>
                        <td className="px-6 py-4">
                          <div className="max-w-xs truncate" title={item.keterangan}>
                            {item.keterangan}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.tanggal_terima}</span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          {item.created_by}
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
                            No data barang bekas found
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

            {/* Standard Pagination - Show only if there are multiple pages */}
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
          <div className={`${cardClass} rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border transform transition-all duration-300 scale-100`}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                    }`}>
                    <Key className={`w-6 h-6 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  <h2 className="text-xl font-bold text-black dark:text-gray-100">
                    {editingId ? 'Edit' : 'New'} data barang bekas
                  </h2>
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
                <input type="hidden" {...register("id")} />

                <div className="space-y-2">
                  <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    Nama Barang Bekas
                  </label>
                  <input
                    type="text"
                    {...register("nama_barang_bekas")}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                    placeholder="Enter Nama Barang Bekas"
                  />
                  {errors.nama_barang_bekas && (
                    <p className="text-sm text-red-500 mt-1 animate-shake">{errors.nama_barang_bekas.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    Kategori Barang Bekas
                  </label>
                  <input
                    type="text"
                    {...register("kategori_barang_bekas")}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                    placeholder="Enter Kategori Barang Bekas"
                  />
                  {errors.kategori_barang_bekas && (
                    <p className="text-sm text-red-500 mt-1 animate-shake">{errors.kategori_barang_bekas.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    Satuan
                  </label>
                  <input
                    type="text"
                    {...register("satuan")}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                    placeholder="Enter Satuan"
                  />
                  {errors.satuan && (
                    <p className="text-sm text-red-500 mt-1 animate-shake">{errors.satuan.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    Jumlah Tersedia
                  </label>
                <input
  type="number"
  {...register("jumlah_tersedia")}
  onChange={(e) => setValue("jumlah_tersedia", e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                    placeholder="Enter Jumlah Tersedia"
                    step="any"
                  />
                  {errors.jumlah_tersedia && (
                    <p className="text-sm text-red-500 mt-1 animate-shake">{errors.jumlah_tersedia.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    Lokasi Penyimpanan
                  </label>
                  <Select
                    options={gudangOptions}
                    value={gudangOptions.find(option => option.value === watch('lokasi_penyimpanan')) || null}
               onChange={(selected) => setValue('lokasi_penyimpanan', selected?.value || '')}
                    onBlur={() => trigger('lokasi_penyimpanan')}
                    isLoading={loadingDropdowns}
                    isDisabled={loadingDropdowns}
                    placeholder={loadingDropdowns ? "Loading warehouses..." : "Select or type warehouse..."}
                    isClearable
                    isSearchable
                    styles={getSelectStyles()}
                    theme={(theme) => ({
                      ...theme,
                      colors: {
                        ...theme.colors,
                        primary: '#3b82f6',

                      }
                    })}
                  />

                  {errors.lokasi_penyimpanan && (
                    <p className="text-sm text-red-500 mt-1 animate-shake">{errors.lokasi_penyimpanan.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    Keterangan
                  </label>
                  <textarea
                    {...register("keterangan")}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                    rows={3}
                    placeholder="Enter Keterangan"
                  />
                  {errors.keterangan && (
                    <p className="text-sm text-red-500 mt-1 animate-shake">{errors.keterangan.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    Tanggal Terima
                  </label>
                  <input
                    type="date"
                    {...register("tanggal_terima")}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                    placeholder="Enter Tanggal Terima"
                  />
                  {errors.tanggal_terima && (
                    <p className="text-sm text-red-500 mt-1 animate-shake">{errors.tanggal_terima.message}</p>
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
                  ) : editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Single Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModals}
        onConfirm={handleDelete}
        item={deletingItem || undefined}
        theme={theme}
        isBulk={false}
      />

      {/* Bulk Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isBulkDeleteModalOpen}
        onClose={closeDeleteModals}
        onConfirm={handleBulkDelete}
        theme={theme}
        isBulk={true}
        bulkCount={selectedRows.length}
      />

      {/* Custom styles */}
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
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        
        /* Custom scrollbar */
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