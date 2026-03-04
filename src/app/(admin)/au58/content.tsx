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

// Define TypeScript interface
interface Au58Item {
  id: '',
  nomor_urut: '',
  nomor_manual: '',
  tanggal: '',
  unit: 'KEBUN TONDUHAN',
  bagian: '',
  kode_material: '',
  uraian: '',
  tahun_tanam: '',
  nomor_blok: '',
  luas_ha: '',
  jumlah_pokok: '',
  dosis_cc_ha: '',
  satuan: '',
  banyaknya_diminta: '',
  banyaknya_dikeluarkan: '',
  harga_satuan: '',
  jumlah: '',
  no_rekg: '',
  sisa_setelah_dibukukan: '',
  barang_untuk_kegiatan: '',
  dikirim_kepada: '',
  kode_gudang_pengirim: '',
  status: '',
  approved1_by: '',
  approved1_at: '',
  approved2_by: '',
  approved2_at: '',
  approved_final_by: '',
  approved_final_at: '',
  rejected_by: '',
  rejected_at: '',
  rejected_reason: '',
  is_opla: '',
  created_by: '',
  updated_by: ''
}

interface ApiResponse {
  data: Au58Item[];
  recordsTotal: number;
  recordsFiltered: number;
  draw: number;
}

// Define validation schema
const au58Schema = z.object({
    id: z.string().nonempty({ message: "This field is required" }),
    nomor_urut: z.string().optional(),
    nomor_manual: z.string().nonempty({ message: "This field is required" }),
    tanggal: z.string().nonempty({ message: "This field is required" }),
    unit: z.string().nonempty({ message: "This field is required" }),
    bagian: z.string().nonempty({ message: "This field is required" }),
    kode_material: z.string().nonempty({ message: "This field is required" }),
    uraian: z.string().optional(),
    tahun_tanam: z.string().optional(),
    nomor_blok: z.string().optional(),
    luas_ha: z.string().optional(),
    jumlah_pokok: z.string().optional(),
    dosis_cc_ha: z.string().optional(),
    satuan: z.string().nonempty({ message: "This field is required" }),
    banyaknya_diminta: z.string().nonempty({ message: "This field is required" }),
    banyaknya_dikeluarkan: z.string().optional(),
    harga_satuan: z.string().optional(),
    jumlah: z.string().optional(),
    no_rekg: z.string().optional(),
    sisa_setelah_dibukukan: z.string().optional(),
    barang_untuk_kegiatan: z.string().nonempty({ message: "This field is required" }),
    dikirim_kepada: z.string().optional(),
    kode_gudang_pengirim: z.string().optional(),
    status: z.string().optional(),
    approved1_by: z.string().optional(),
    approved1_at: z.string().optional(),
    approved2_by: z.string().optional(),
    approved2_at: z.string().optional(),
    approved_final_by: z.string().optional(),
    approved_final_at: z.string().optional(),
    rejected_by: z.string().optional(),
    rejected_at: z.string().optional(),
    rejected_reason: z.string().optional(),
    is_opla: z.string().nonempty({ message: "This field is required" }),
    created_by: z.string().optional(),
    updated_by: z.string().optional()
});

type au58FormData = z.infer<typeof au58Schema>;

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
const createApiInstance = (router: any) => {
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
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
      isActive 
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
  item?: Au58Item;
  theme: string;
  isBulk?: boolean;
  bulkCount?: number;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className={`rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-100 ${
        theme === 'dark' 
          ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700' 
          : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'
      } border`}>
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${
              theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100'
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
                <div className={`mt-4 p-4 rounded-lg ${
                  theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50'
                }`}>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Nomor Urut:</span>
                      <p className="font-medium">{item.nomor_urut}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Nomor Manual:</span>
                      <p className="font-medium">{item.nomor_manual}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Tanggal:</span>
                      <p className="font-medium">{item.tanggal}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Unit:</span>
                      <p className="font-medium">{item.unit}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Bagian:</span>
                      <p className="font-medium">{item.bagian}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Kode Material:</span>
                      <p className="font-medium">{item.kode_material}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Uraian:</span>
                      <p className="font-medium">{item.uraian}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Tahun Tanam:</span>
                      <p className="font-medium">{item.tahun_tanam}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Nomor Blok:</span>
                      <p className="font-medium">{item.nomor_blok}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Luas Ha:</span>
                      <p className="font-medium">{item.luas_ha}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Jumlah Pokok:</span>
                      <p className="font-medium">{item.jumlah_pokok}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Dosis Cc Ha:</span>
                      <p className="font-medium">{item.dosis_cc_ha}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Satuan:</span>
                      <p className="font-medium">{item.satuan}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Banyaknya Diminta:</span>
                      <p className="font-medium">{item.banyaknya_diminta}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Banyaknya Dikeluarkan:</span>
                      <p className="font-medium">{item.banyaknya_dikeluarkan}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Harga Satuan:</span>
                      <p className="font-medium">{item.harga_satuan}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Jumlah:</span>
                      <p className="font-medium">{item.jumlah}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No Rekg:</span>
                      <p className="font-medium">{item.no_rekg}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Sisa Setelah Dibukukan:</span>
                      <p className="font-medium">{item.sisa_setelah_dibukukan}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Barang Untuk Kegiatan:</span>
                      <p className="font-medium">{item.barang_untuk_kegiatan}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Dikirim Kepada:</span>
                      <p className="font-medium">{item.dikirim_kepada}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Kode Gudang Pengirim:</span>
                      <p className="font-medium">{item.kode_gudang_pengirim}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Status:</span>
                      <p className="font-medium">{item.status}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Approved1 By:</span>
                      <p className="font-medium">{item.approved1_by}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Approved1 At:</span>
                      <p className="font-medium">{item.approved1_at}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Approved2 By:</span>
                      <p className="font-medium">{item.approved2_by}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Approved2 At:</span>
                      <p className="font-medium">{item.approved2_at}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Approved Final By:</span>
                      <p className="font-medium">{item.approved_final_by}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Approved Final At:</span>
                      <p className="font-medium">{item.approved_final_at}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Rejected By:</span>
                      <p className="font-medium">{item.rejected_by}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Rejected At:</span>
                      <p className="font-medium">{item.rejected_at}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Rejected Reason:</span>
                      <p className="font-medium">{item.rejected_reason}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Is Opla:</span>
                      <p className="font-medium">{item.is_opla}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Created By:</span>
                      <p className="font-medium">{item.created_by}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Updated By:</span>
                      <p className="font-medium">{item.updated_by}</p>
                    </div>

                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <button
              onClick={onClose}
              className={`flex-1 px-6 py-3 border rounded-xl font-medium transition-all duration-200 hover:scale-[1.02] ${
                theme === 'dark'
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
            theme === 'dark'
              ? 'hover:bg-gray-700 text-gray-300'
              : 'hover:bg-gray-100 text-gray-600'
          }`}
        >
          <ChevronFirst className="w-4 h-4" />
        </button>
        
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`p-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
            theme === 'dark'
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
          className={`p-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
            theme === 'dark'
              ? 'hover:bg-gray-700 text-gray-300'
              : 'hover:bg-gray-100 text-gray-600'
          }`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className={`p-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
            theme === 'dark'
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

export default function Au58Content() {
  const [items, setItems] = useState<Au58Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingItem, setDeletingItem] = useState<Au58Item | null>(null);
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
  const [api] = useState(() => createApiInstance(router));

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<au58FormData>({
    resolver: zodResolver(au58Schema),
    defaultValues: {
      id: '',
      nomor_urut: '',
      nomor_manual: '',
      tanggal: '',
      unit: 'KEBUN TONDUHAN',
      bagian: '',
      kode_material: '',
      uraian: '',
      tahun_tanam: '',
      nomor_blok: '',
      luas_ha: '',
      jumlah_pokok: '',
      dosis_cc_ha: '',
      satuan: '',
      banyaknya_diminta: '',
      banyaknya_dikeluarkan: '',
      harga_satuan: '',
      jumlah: '',
      no_rekg: '',
      sisa_setelah_dibukukan: '',
      barang_untuk_kegiatan: '',
      dikirim_kepada: '',
      kode_gudang_pengirim: '',
      status: '',
      approved1_by: '',
      approved1_at: '',
      approved2_by: '',
      approved2_at: '',
      approved_final_by: '',
      approved_final_at: '',
      rejected_by: '',
      rejected_at: '',
      rejected_reason: '',
      is_opla: '',
      created_by: '',
      updated_by: ''
    },
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
'nomor_urut',
'nomor_manual',
'tanggal',
'unit',
'bagian',
'kode_material',
'uraian',
'tahun_tanam',
'nomor_blok',
'luas_ha',
'jumlah_pokok',
'dosis_cc_ha',
'satuan',
'banyaknya_diminta',
'banyaknya_dikeluarkan',
'harga_satuan',
'jumlah',
'no_rekg',
'sisa_setelah_dibukukan',
'barang_untuk_kegiatan',
'dikirim_kepada',
'kode_gudang_pengirim',
'status',
'approved1_by',
'approved1_at',
'approved2_by',
'approved2_at',
'approved_final_by',
'approved_final_at',
'rejected_by',
'rejected_at',
'rejected_reason',
'is_opla',
'created_by',
'updated_by'
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
      const response = await api.get('au58/getAll', {
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
// Calculate stats based on status field
      const activeCount = data.filter(item => item.status === 'Y' || item.status === '1' || item.status === true || item.status === 'true' || item.status === 'active').length;
      const inactiveCount = data.filter(item => item.status === 'N' || item.status === '0' || item.status === false || item.status === 'false' || item.status === 'inactive').length;
      
      setStats({
        total: data.length,
        active: activeCount,
        inactive: inactiveCount,
      });
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

  const openModal = (item?: Au58Item) => {
    if (item) {
      setEditingId(item.id);
      setValue('id', item.id);
      setValue('id', item.id);
      setValue('nomor_urut', item.nomor_urut);
      setValue('nomor_manual', item.nomor_manual);
      setValue('tanggal', item.tanggal);
      setValue('unit', item.unit);
      setValue('bagian', item.bagian);
      setValue('kode_material', item.kode_material);
      setValue('uraian', item.uraian);
      setValue('tahun_tanam', item.tahun_tanam);
      setValue('nomor_blok', item.nomor_blok);
      setValue('luas_ha', item.luas_ha);
      setValue('jumlah_pokok', item.jumlah_pokok);
      setValue('dosis_cc_ha', item.dosis_cc_ha);
      setValue('satuan', item.satuan);
      setValue('banyaknya_diminta', item.banyaknya_diminta);
      setValue('banyaknya_dikeluarkan', item.banyaknya_dikeluarkan);
      setValue('harga_satuan', item.harga_satuan);
      setValue('jumlah', item.jumlah);
      setValue('no_rekg', item.no_rekg);
      setValue('sisa_setelah_dibukukan', item.sisa_setelah_dibukukan);
      setValue('barang_untuk_kegiatan', item.barang_untuk_kegiatan);
      setValue('dikirim_kepada', item.dikirim_kepada);
      setValue('kode_gudang_pengirim', item.kode_gudang_pengirim);
      setValue('status', item.status);
      setValue('approved1_by', item.approved1_by);
      setValue('approved1_at', item.approved1_at);
      setValue('approved2_by', item.approved2_by);
      setValue('approved2_at', item.approved2_at);
      setValue('approved_final_by', item.approved_final_by);
      setValue('approved_final_at', item.approved_final_at);
      setValue('rejected_by', item.rejected_by);
      setValue('rejected_at', item.rejected_at);
      setValue('rejected_reason', item.rejected_reason);
      setValue('is_opla', item.is_opla);
      setValue('created_by', item.created_by);
      setValue('updated_by', item.updated_by);

    } else {
      setEditingId(null);
      reset({
        id: '',
      nomor_urut: '',
      nomor_manual: '',
      tanggal: '',
      unit: 'KEBUN TONDUHAN',
      bagian: '',
      kode_material: '',
      uraian: '',
      tahun_tanam: '',
      nomor_blok: '',
      luas_ha: '',
      jumlah_pokok: '',
      dosis_cc_ha: '',
      satuan: '',
      banyaknya_diminta: '',
      banyaknya_dikeluarkan: '',
      harga_satuan: '',
      jumlah: '',
      no_rekg: '',
      sisa_setelah_dibukukan: '',
      barang_untuk_kegiatan: '',
      dikirim_kepada: '',
      kode_gudang_pengirim: '',
      status: '',
      approved1_by: '',
      approved1_at: '',
      approved2_by: '',
      approved2_at: '',
      approved_final_by: '',
      approved_final_at: '',
      rejected_by: '',
      rejected_at: '',
      rejected_reason: '',
      is_opla: '',
      created_by: '',
      updated_by: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    reset({
      id: '',
      nomor_urut: '',
      nomor_manual: '',
      tanggal: '',
      unit: 'KEBUN TONDUHAN',
      bagian: '',
      kode_material: '',
      uraian: '',
      tahun_tanam: '',
      nomor_blok: '',
      luas_ha: '',
      jumlah_pokok: '',
      dosis_cc_ha: '',
      satuan: '',
      banyaknya_diminta: '',
      banyaknya_dikeluarkan: '',
      harga_satuan: '',
      jumlah: '',
      no_rekg: '',
      sisa_setelah_dibukukan: '',
      barang_untuk_kegiatan: '',
      dikirim_kepada: '',
      kode_gudang_pengirim: '',
      status: '',
      approved1_by: '',
      approved1_at: '',
      approved2_by: '',
      approved2_at: '',
      approved_final_by: '',
      approved_final_at: '',
      rejected_by: '',
      rejected_at: '',
      rejected_reason: '',
      is_opla: '',
      created_by: '',
      updated_by: ''
    });
  };

  const openDeleteModal = (item: Au58Item) => {
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

  const onSubmit = async (data: au58FormData) => {
    try {
      const requestData = {
          id: data.id ? parseFloat(data.id) : null,
          nomor_urut: data.nomor_urut,
          nomor_manual: data.nomor_manual,
          tanggal: data.tanggal,
          unit: data.unit,
          bagian: data.bagian,
          kode_material: data.kode_material,
          uraian: data.uraian,
          tahun_tanam: data.tahun_tanam ? parseFloat(data.tahun_tanam) : null,
          nomor_blok: data.nomor_blok,
          luas_ha: data.luas_ha ? parseFloat(data.luas_ha) : null,
          jumlah_pokok: data.jumlah_pokok ? parseFloat(data.jumlah_pokok) : null,
          dosis_cc_ha: data.dosis_cc_ha ? parseFloat(data.dosis_cc_ha) : null,
          satuan: data.satuan,
          banyaknya_diminta: data.banyaknya_diminta ? parseFloat(data.banyaknya_diminta) : null,
          banyaknya_dikeluarkan: data.banyaknya_dikeluarkan ? parseFloat(data.banyaknya_dikeluarkan) : null,
          harga_satuan: data.harga_satuan ? parseFloat(data.harga_satuan) : null,
          jumlah: data.jumlah ? parseFloat(data.jumlah) : null,
          no_rekg: data.no_rekg,
          sisa_setelah_dibukukan: data.sisa_setelah_dibukukan ? parseFloat(data.sisa_setelah_dibukukan) : null,
          barang_untuk_kegiatan: data.barang_untuk_kegiatan,
          dikirim_kepada: data.dikirim_kepada,
          kode_gudang_pengirim: data.kode_gudang_pengirim,
          status: data.status,
          approved1_by: data.approved1_by ? parseFloat(data.approved1_by) : null,
          approved1_at: data.approved1_at,
          approved2_by: data.approved2_by ? parseFloat(data.approved2_by) : null,
          approved2_at: data.approved2_at,
          approved_final_by: data.approved_final_by ? parseFloat(data.approved_final_by) : null,
          approved_final_at: data.approved_final_at,
          rejected_by: data.rejected_by ? parseFloat(data.rejected_by) : null,
          rejected_at: data.rejected_at,
          rejected_reason: data.rejected_reason,
          is_opla: data.is_opla ? parseFloat(data.is_opla) : null,
          created_by: data.created_by ? parseFloat(data.created_by) : null,
          updated_by: data.updated_by ? parseFloat(data.updated_by) : null
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
      await api.post('au58/remove', { id: deletingItem.id });
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
        await api.post('au58/remove', { id: id });
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

  // Theme-based styles
  const cardClass = theme === 'dark'
    ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700'
    : 'bg-gradient-to-br from-white to-gray-50 border-gray-200';

  const inputClass = theme === 'dark'
    ? `bg-gray-800/50 border-gray-700 text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 backdrop-blur-sm ${
        errors.id ? 'border-red-500' : ''
      }`
    : `bg-white/80 border-gray-200 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 backdrop-blur-sm ${
        errors.id ? 'border-red-300' : ''
      }`;

  const tableHeaderClass = theme === 'dark'
    ? 'bg-gray-800/50 text-gray-300 border-gray-700'
    : 'bg-gray-50/80 text-gray-600 border-gray-200';

  const tableRowClass = (index: number) => theme === 'dark'
    ? `bg-gray-900/30 hover:bg-gray-800/50 text-gray-100 ${index % 2 === 0 ? 'bg-gray-900/20' : ''}`
    : `hover:bg-gray-50/80 text-gray-900 ${index % 2 === 0 ? 'bg-gray-50/50' : ''}`;

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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6" style={{textTransform: 'capitalize'}}>
          <div>
            <h1 className={`text-4xl font-bold bg-gradient-to-r ${theme === 'dark' ? 'from-blue-100 to-sky-100' : 'from-blue-600 to-sky-600'} bg-clip-text text-transparent`}>
              AU 58
            </h1>
            <p className={`mt-2 text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Manage your AU 58 efficiently
            </p>
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={() => openModal()}
              className="group px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              Add New au58
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
              placeholder="Search au58..."
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
                className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                  theme === 'dark'
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
              <div className={`w-16 h-16 border-4 rounded-full animate-spin ${
                theme === 'dark' ? 'border-blue-500/30 border-t-blue-400' : 'border-blue-200 border-t-blue-600'
              }`}></div>
              <Loader2 className="w-8 h-8 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-spin text-blue-600 dark:text-blue-400" />
            </div>
            <p className={`mt-4 text-lg font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Loading au58...
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
                    onClick={() => handleSort('nomor_urut')}
                    className="flex items-center gap-2 hover:text-blue-500 transition-colors"
                  >
                    Nomor Urut
                    {sortField === 'nomor_urut' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    ) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  <button 
                    onClick={() => handleSort('nomor_manual')}
                    className="flex items-center gap-2 hover:text-blue-500 transition-colors"
                  >
                    Nomor Manual
                    {sortField === 'nomor_manual' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    ) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  <button 
                    onClick={() => handleSort('tanggal')}
                    className="flex items-center gap-2 hover:text-blue-500 transition-colors"
                  >
                    Tanggal
                    {sortField === 'tanggal' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    ) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  <button 
                    onClick={() => handleSort('unit')}
                    className="flex items-center gap-2 hover:text-blue-500 transition-colors"
                  >
                    Unit
                    {sortField === 'unit' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    ) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  <button 
                    onClick={() => handleSort('bagian')}
                    className="flex items-center gap-2 hover:text-blue-500 transition-colors"
                  >
                    Bagian
                    {sortField === 'bagian' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    ) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  <button 
                    onClick={() => handleSort('kode_material')}
                    className="flex items-center gap-2 hover:text-blue-500 transition-colors"
                  >
                    Kode Material
                    {sortField === 'kode_material' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    ) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  <button 
                    onClick={() => handleSort('uraian')}
                    className="flex items-center gap-2 hover:text-blue-500 transition-colors"
                  >
                    Uraian
                    {sortField === 'uraian' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    ) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  <button 
                    onClick={() => handleSort('tahun_tanam')}
                    className="flex items-center gap-2 hover:text-blue-500 transition-colors"
                  >
                    Tahun Tanam
                    {sortField === 'tahun_tanam' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    ) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  <button 
                    onClick={() => handleSort('nomor_blok')}
                    className="flex items-center gap-2 hover:text-blue-500 transition-colors"
                  >
                    Nomor Blok
                    {sortField === 'nomor_blok' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    ) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  <button 
                    onClick={() => handleSort('luas_ha')}
                    className="flex items-center gap-2 hover:text-blue-500 transition-colors"
                  >
                    Luas Ha
                    {sortField === 'luas_ha' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    ) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  <button 
                    onClick={() => handleSort('jumlah_pokok')}
                    className="flex items-center gap-2 hover:text-blue-500 transition-colors"
                  >
                    Jumlah Pokok
                    {sortField === 'jumlah_pokok' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    ) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  <button 
                    onClick={() => handleSort('dosis_cc_ha')}
                    className="flex items-center gap-2 hover:text-blue-500 transition-colors"
                  >
                    Dosis Cc Ha
                    {sortField === 'dosis_cc_ha' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    ) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  <button 
                    onClick={() => handleSort('satuan')}
                    className="flex items-center gap-2 hover:text-blue-500 transition-colors"
                  >
                    Satuan
                    {sortField === 'satuan' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    ) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  <button 
                    onClick={() => handleSort('banyaknya_diminta')}
                    className="flex items-center gap-2 hover:text-blue-500 transition-colors"
                  >
                    Banyaknya Diminta
                    {sortField === 'banyaknya_diminta' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    ) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  <button 
                    onClick={() => handleSort('banyaknya_dikeluarkan')}
                    className="flex items-center gap-2 hover:text-blue-500 transition-colors"
                  >
                    Banyaknya Dikeluarkan
                    {sortField === 'banyaknya_dikeluarkan' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    ) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  <button 
                    onClick={() => handleSort('harga_satuan')}
                    className="flex items-center gap-2 hover:text-blue-500 transition-colors"
                  >
                    Harga Satuan
                    {sortField === 'harga_satuan' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    ) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  <button 
                    onClick={() => handleSort('jumlah')}
                    className="flex items-center gap-2 hover:text-blue-500 transition-colors"
                  >
                    Jumlah
                    {sortField === 'jumlah' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    ) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  <button 
                    onClick={() => handleSort('no_rekg')}
                    className="flex items-center gap-2 hover:text-blue-500 transition-colors"
                  >
                    No Rekg
                    {sortField === 'no_rekg' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    ) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  <button 
                    onClick={() => handleSort('sisa_setelah_dibukukan')}
                    className="flex items-center gap-2 hover:text-blue-500 transition-colors"
                  >
                    Sisa Setelah Dibukukan
                    {sortField === 'sisa_setelah_dibukukan' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    ) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  <button 
                    onClick={() => handleSort('barang_untuk_kegiatan')}
                    className="flex items-center gap-2 hover:text-blue-500 transition-colors"
                  >
                    Barang Untuk Kegiatan
                    {sortField === 'barang_untuk_kegiatan' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    ) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  <button 
                    onClick={() => handleSort('dikirim_kepada')}
                    className="flex items-center gap-2 hover:text-blue-500 transition-colors"
                  >
                    Dikirim Kepada
                    {sortField === 'dikirim_kepada' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    ) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  <button 
                    onClick={() => handleSort('kode_gudang_pengirim')}
                    className="flex items-center gap-2 hover:text-blue-500 transition-colors"
                  >
                    Kode Gudang Pengirim
                    {sortField === 'kode_gudang_pengirim' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    ) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  <button 
                    onClick={() => handleSort('status')}
                    className="flex items-center gap-2 hover:text-blue-500 transition-colors"
                  >
                    Status
                    {sortField === 'status' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    ) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  <button 
                    onClick={() => handleSort('approved1_by')}
                    className="flex items-center gap-2 hover:text-blue-500 transition-colors"
                  >
                    Approved1 By
                    {sortField === 'approved1_by' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    ) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  <button 
                    onClick={() => handleSort('approved1_at')}
                    className="flex items-center gap-2 hover:text-blue-500 transition-colors"
                  >
                    Approved1 At
                    {sortField === 'approved1_at' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    ) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  <button 
                    onClick={() => handleSort('approved2_by')}
                    className="flex items-center gap-2 hover:text-blue-500 transition-colors"
                  >
                    Approved2 By
                    {sortField === 'approved2_by' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    ) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  <button 
                    onClick={() => handleSort('approved2_at')}
                    className="flex items-center gap-2 hover:text-blue-500 transition-colors"
                  >
                    Approved2 At
                    {sortField === 'approved2_at' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    ) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  <button 
                    onClick={() => handleSort('approved_final_by')}
                    className="flex items-center gap-2 hover:text-blue-500 transition-colors"
                  >
                    Approved Final By
                    {sortField === 'approved_final_by' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    ) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  <button 
                    onClick={() => handleSort('approved_final_at')}
                    className="flex items-center gap-2 hover:text-blue-500 transition-colors"
                  >
                    Approved Final At
                    {sortField === 'approved_final_at' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    ) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  <button 
                    onClick={() => handleSort('rejected_by')}
                    className="flex items-center gap-2 hover:text-blue-500 transition-colors"
                  >
                    Rejected By
                    {sortField === 'rejected_by' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    ) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  <button 
                    onClick={() => handleSort('rejected_at')}
                    className="flex items-center gap-2 hover:text-blue-500 transition-colors"
                  >
                    Rejected At
                    {sortField === 'rejected_at' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    ) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  <button 
                    onClick={() => handleSort('rejected_reason')}
                    className="flex items-center gap-2 hover:text-blue-500 transition-colors"
                  >
                    Rejected Reason
                    {sortField === 'rejected_reason' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    ) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  <button 
                    onClick={() => handleSort('is_opla')}
                    className="flex items-center gap-2 hover:text-blue-500 transition-colors"
                  >
                    Is Opla
                    {sortField === 'is_opla' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    ) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  <button 
                    onClick={() => handleSort('created_by')}
                    className="flex items-center gap-2 hover:text-blue-500 transition-colors"
                  >
                    Created By
                    {sortField === 'created_by' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    ) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  <button 
                    onClick={() => handleSort('updated_by')}
                    className="flex items-center gap-2 hover:text-blue-500 transition-colors"
                  >
                    Updated By
                    {sortField === 'updated_by' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    ) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
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
                            className={`rounded ${
                              theme === 'dark' 
                                ? 'bg-gray-700 border-gray-600 checked:bg-blue-500 focus:ring-blue-500' 
                                : 'border-gray-300 checked:bg-blue-600 focus:ring-blue-500'
                            } focus:ring-2 focus:ring-offset-0`}
                          />
                        </td>
                <td className="px-6 py-4">
                  {item.nomor_urut}
                </td>
                <td className="px-6 py-4">
                  {item.nomor_manual}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.tanggal}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {item.unit}
                </td>
                <td className="px-6 py-4">
                  {item.bagian}
                </td>
                <td className="px-6 py-4">
                  {item.kode_material}
                </td>
                <td className="px-6 py-4">
                  <div className="max-w-xs truncate" title={item.uraian}>
                    {item.uraian}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {item.tahun_tanam}
                </td>
                <td className="px-6 py-4">
                  {item.nomor_blok}
                </td>
                <td className="px-6 py-4">
                  {item.luas_ha}
                </td>
                <td className="px-6 py-4">
                  {item.jumlah_pokok}
                </td>
                <td className="px-6 py-4">
                  {item.dosis_cc_ha}
                </td>
                <td className="px-6 py-4">
                  {item.satuan}
                </td>
                <td className="px-6 py-4">
                  {item.banyaknya_diminta}
                </td>
                <td className="px-6 py-4">
                  {item.banyaknya_dikeluarkan}
                </td>
                <td className="px-6 py-4">
                  {item.harga_satuan}
                </td>
                <td className="px-6 py-4">
                  {item.jumlah}
                </td>
                <td className="px-6 py-4">
                  {item.no_rekg}
                </td>
                <td className="px-6 py-4">
                  {item.sisa_setelah_dibukukan}
                </td>
                <td className="px-6 py-4">
                  {item.barang_untuk_kegiatan}
                </td>
                <td className="px-6 py-4">
                  {item.dikirim_kepada}
                </td>
                <td className="px-6 py-4">
                  {item.kode_gudang_pengirim}
                </td>
                <td className="px-6 py-4">
                  {item.status}
                </td>
                <td className="px-6 py-4">
                  {item.approved1_by}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.approved1_at}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {item.approved2_by}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.approved2_at}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {item.approved_final_by}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.approved_final_at}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {item.rejected_by}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.rejected_at}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="max-w-xs truncate" title={item.rejected_reason}>
                    {item.rejected_reason}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {item.is_opla}
                </td>
                <td className="px-6 py-4">
                  {item.created_by}
                </td>
                <td className="px-6 py-4">
                  {item.updated_by}
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
                      <td colSpan={100} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <Key className={`w-12 h-12 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'} mb-4`} />
                          <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                            No au58 found
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
                  <div className={`p-2 rounded-lg ${
                    theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                  }`}>
                    <Key className={`w-6 h-6 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  <h2 className="text-xl font-bold text-black dark:text-gray-100">
                    {editingId ? 'Edit' : 'New'} au58
                  </h2>
                </div>
                <button
                  onClick={closeModal}
                  className={`p-2 rounded-lg transition-colors ${
                    theme === 'dark' 
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
            <label className={`block text-sm font-semibold ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
                Nomor *
            </label>
            <input
                type="text"
                {...register("nomor_manual")}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                placeholder="Enter Nomor"
            />
            {errors.nomor_manual && (
                <p className="text-sm text-red-500 mt-1 animate-shake">{errors.nomor_manual.message}</p>
            )}
        </div>
          <div className="space-y-2">
            <label className={`block text-sm font-semibold ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
                Tanggal *
            </label>
            <input
                type="datetime-local"
                {...register("tanggal")}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                placeholder="Enter Tanggal"
            />
            {errors.tanggal && (
                <p className="text-sm text-red-500 mt-1 animate-shake">{errors.tanggal.message}</p>
            )}
        </div>
          <div className="space-y-2">
            <label className={`block text-sm font-semibold ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
                Unit *
            </label>
            <input
                type="text"
                readOnly
                {...register("unit")}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                placeholder="Enter Unit"
            />
            {errors.unit && (
                <p className="text-sm text-red-500 mt-1 animate-shake">{errors.unit.message}</p>
            )}
        </div>
          <div className="space-y-2">
            <label className={`block text-sm font-semibold ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
                Bagian *
            </label>
            <select
                {...register("bagian")}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
            >
                <option value="">Select Bagian</option>
                <option value="Y">Yes</option>
                <option value="N">No</option>
            </select>
            {errors.bagian && (
                <p className="text-sm text-red-500 mt-1 animate-shake">{errors.bagian.message}</p>
            )}
        </div>
          <div className="space-y-2">
            <label className={`block text-sm font-semibold ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
                Kode Material *
            </label>
            <input
                type="text"
                {...register("kode_material")}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                placeholder="Enter Kode Material"
            />
            {errors.kode_material && (
                <p className="text-sm text-red-500 mt-1 animate-shake">{errors.kode_material.message}</p>
            )}
        </div>
          <div className="space-y-2">
            <label className={`block text-sm font-semibold ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
                Uraian
            </label>
            <textarea
                {...register("uraian")}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                rows={3}
                placeholder="Enter Uraian"
            />
            {errors.uraian && (
                <p className="text-sm text-red-500 mt-1 animate-shake">{errors.uraian.message}</p>
            )}
        </div>
          <div className="space-y-2">
            <label className={`block text-sm font-semibold ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
                Tahun Tanam
            </label>
            <input
                type="number"
                {...register("tahun_tanam")}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                placeholder="Enter Tahun Tanam"
                step="any"
            />
            {errors.tahun_tanam && (
                <p className="text-sm text-red-500 mt-1 animate-shake">{errors.tahun_tanam.message}</p>
            )}
        </div>
          <div className="space-y-2">
            <label className={`block text-sm font-semibold ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
                Nomor Blok
            </label>
            <input
                type="text"
                {...register("nomor_blok")}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                placeholder="Enter Nomor Blok"
            />
            {errors.nomor_blok && (
                <p className="text-sm text-red-500 mt-1 animate-shake">{errors.nomor_blok.message}</p>
            )}
        </div>
          <div className="space-y-2">
            <label className={`block text-sm font-semibold ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
                Luas Ha
            </label>
            <input
                type="number"
                {...register("luas_ha")}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                placeholder="Enter Luas Ha"
                step="any"
            />
            {errors.luas_ha && (
                <p className="text-sm text-red-500 mt-1 animate-shake">{errors.luas_ha.message}</p>
            )}
        </div>
          <div className="space-y-2">
            <label className={`block text-sm font-semibold ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
                Jumlah Pokok
            </label>
            <input
                type="number"
                {...register("jumlah_pokok")}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                placeholder="Enter Jumlah Pokok"
                step="any"
            />
            {errors.jumlah_pokok && (
                <p className="text-sm text-red-500 mt-1 animate-shake">{errors.jumlah_pokok.message}</p>
            )}
        </div>
          <div className="space-y-2">
            <label className={`block text-sm font-semibold ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
                Dosis Cc Ha
            </label>
            <input
                type="number"
                {...register("dosis_cc_ha")}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                placeholder="Enter Dosis Cc Ha"
                step="any"
            />
            {errors.dosis_cc_ha && (
                <p className="text-sm text-red-500 mt-1 animate-shake">{errors.dosis_cc_ha.message}</p>
            )}
        </div>
          <div className="space-y-2">
            <label className={`block text-sm font-semibold ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
                Satuan *
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
            <label className={`block text-sm font-semibold ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
                Banyaknya Diminta *
            </label>
            <input
                type="number"
                {...register("banyaknya_diminta")}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                placeholder="Enter Banyaknya Diminta"
                step="any"
            />
            {errors.banyaknya_diminta && (
                <p className="text-sm text-red-500 mt-1 animate-shake">{errors.banyaknya_diminta.message}</p>
            )}
        </div>
          <div className="space-y-2">
            <label className={`block text-sm font-semibold ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
                Banyaknya Dikeluarkan
            </label>
            <input
                type="number"
                {...register("banyaknya_dikeluarkan")}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                placeholder="Enter Banyaknya Dikeluarkan"
                step="any"
            />
            {errors.banyaknya_dikeluarkan && (
                <p className="text-sm text-red-500 mt-1 animate-shake">{errors.banyaknya_dikeluarkan.message}</p>
            )}
        </div>
          <div className="space-y-2">
            <label className={`block text-sm font-semibold ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
                Harga Satuan
            </label>
            <input
                type="number"
                {...register("harga_satuan")}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                placeholder="Enter Harga Satuan"
                step="any"
            />
            {errors.harga_satuan && (
                <p className="text-sm text-red-500 mt-1 animate-shake">{errors.harga_satuan.message}</p>
            )}
        </div>
          <div className="space-y-2">
            <label className={`block text-sm font-semibold ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
                Jumlah
            </label>
            <input
                type="number"
                {...register("jumlah")}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                placeholder="Enter Jumlah"
                step="any"
            />
            {errors.jumlah && (
                <p className="text-sm text-red-500 mt-1 animate-shake">{errors.jumlah.message}</p>
            )}
        </div>
          <div className="space-y-2">
            <label className={`block text-sm font-semibold ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
                No Rekg
            </label>
            <input
                type="text"
                {...register("no_rekg")}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                placeholder="Enter No Rekg"
            />
            {errors.no_rekg && (
                <p className="text-sm text-red-500 mt-1 animate-shake">{errors.no_rekg.message}</p>
            )}
        </div>
          <div className="space-y-2">
            <label className={`block text-sm font-semibold ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
                Sisa Setelah Dibukukan
            </label>
            <input
                type="number"
                {...register("sisa_setelah_dibukukan")}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                placeholder="Enter Sisa Setelah Dibukukan"
                step="any"
            />
            {errors.sisa_setelah_dibukukan && (
                <p className="text-sm text-red-500 mt-1 animate-shake">{errors.sisa_setelah_dibukukan.message}</p>
            )}
        </div>
          <div className="space-y-2">
            <label className={`block text-sm font-semibold ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
                Barang Untuk Kegiatan *
            </label>
            <input
                type="text"
                {...register("barang_untuk_kegiatan")}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                placeholder="Enter Barang Untuk Kegiatan"
            />
            {errors.barang_untuk_kegiatan && (
                <p className="text-sm text-red-500 mt-1 animate-shake">{errors.barang_untuk_kegiatan.message}</p>
            )}
        </div>
          <div className="space-y-2">
            <label className={`block text-sm font-semibold ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
                Dikirim Kepada
            </label>
            <select
                {...register("dikirim_kepada")}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
            >
                <option value="">Select Dikirim Kepada</option>
                <option value="Y">Yes</option>
                <option value="N">No</option>
            </select>
            {errors.dikirim_kepada && (
                <p className="text-sm text-red-500 mt-1 animate-shake">{errors.dikirim_kepada.message}</p>
            )}
        </div>
          <div className="space-y-2">
            <label className={`block text-sm font-semibold ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
                Kode Gudang Pengirim
            </label>
            <input
                type="text"
                {...register("kode_gudang_pengirim")}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                placeholder="Enter Kode Gudang Pengirim"
            />
            {errors.kode_gudang_pengirim && (
                <p className="text-sm text-red-500 mt-1 animate-shake">{errors.kode_gudang_pengirim.message}</p>
            )}
        </div>
          <div className="space-y-2">
            <label className={`block text-sm font-semibold ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
                Status
            </label>
            <select
                {...register("status")}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
            >
                <option value="">Select Status</option>
                <option value="Y">Yes</option>
                <option value="N">No</option>
            </select>
            {errors.status && (
                <p className="text-sm text-red-500 mt-1 animate-shake">{errors.status.message}</p>
            )}
        </div>
          <div className="space-y-2">
            <label className={`block text-sm font-semibold ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
                Approved1 By
            </label>
            <input
                type="number"
                {...register("approved1_by")}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                placeholder="Enter Approved1 By"
                step="any"
            />
            {errors.approved1_by && (
                <p className="text-sm text-red-500 mt-1 animate-shake">{errors.approved1_by.message}</p>
            )}
        </div>
          <div className="space-y-2">
            <label className={`block text-sm font-semibold ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
                Approved1 At
            </label>
            <input
                type="datetime-local"
                {...register("approved1_at")}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                placeholder="Enter Approved1 At"
            />
            {errors.approved1_at && (
                <p className="text-sm text-red-500 mt-1 animate-shake">{errors.approved1_at.message}</p>
            )}
        </div>
          <div className="space-y-2">
            <label className={`block text-sm font-semibold ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
                Approved2 By
            </label>
            <input
                type="number"
                {...register("approved2_by")}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                placeholder="Enter Approved2 By"
                step="any"
            />
            {errors.approved2_by && (
                <p className="text-sm text-red-500 mt-1 animate-shake">{errors.approved2_by.message}</p>
            )}
        </div>
          <div className="space-y-2">
            <label className={`block text-sm font-semibold ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
                Approved2 At
            </label>
            <input
                type="datetime-local"
                {...register("approved2_at")}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                placeholder="Enter Approved2 At"
            />
            {errors.approved2_at && (
                <p className="text-sm text-red-500 mt-1 animate-shake">{errors.approved2_at.message}</p>
            )}
        </div>
          <div className="space-y-2">
            <label className={`block text-sm font-semibold ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
                Approved Final By
            </label>
            <input
                type="number"
                {...register("approved_final_by")}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                placeholder="Enter Approved Final By"
                step="any"
            />
            {errors.approved_final_by && (
                <p className="text-sm text-red-500 mt-1 animate-shake">{errors.approved_final_by.message}</p>
            )}
        </div>
          <div className="space-y-2">
            <label className={`block text-sm font-semibold ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
                Approved Final At
            </label>
            <input
                type="datetime-local"
                {...register("approved_final_at")}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                placeholder="Enter Approved Final At"
            />
            {errors.approved_final_at && (
                <p className="text-sm text-red-500 mt-1 animate-shake">{errors.approved_final_at.message}</p>
            )}
        </div>
          <div className="space-y-2">
            <label className={`block text-sm font-semibold ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
                Rejected By
            </label>
            <input
                type="number"
                {...register("rejected_by")}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                placeholder="Enter Rejected By"
                step="any"
            />
            {errors.rejected_by && (
                <p className="text-sm text-red-500 mt-1 animate-shake">{errors.rejected_by.message}</p>
            )}
        </div>
          <div className="space-y-2">
            <label className={`block text-sm font-semibold ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
                Rejected At
            </label>
            <input
                type="datetime-local"
                {...register("rejected_at")}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                placeholder="Enter Rejected At"
            />
            {errors.rejected_at && (
                <p className="text-sm text-red-500 mt-1 animate-shake">{errors.rejected_at.message}</p>
            )}
        </div>
          <div className="space-y-2">
            <label className={`block text-sm font-semibold ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
                Rejected Reason
            </label>
            <textarea
                {...register("rejected_reason")}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                rows={3}
                placeholder="Enter Rejected Reason"
            />
            {errors.rejected_reason && (
                <p className="text-sm text-red-500 mt-1 animate-shake">{errors.rejected_reason.message}</p>
            )}
        </div>
          <div className="space-y-2">
            <label className={`block text-sm font-semibold ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
                Is Opla *
            </label>
            <input
                type="number"
                {...register("is_opla")}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                placeholder="Enter Is Opla"
                step="any"
            />
            {errors.is_opla && (
                <p className="text-sm text-red-500 mt-1 animate-shake">{errors.is_opla.message}</p>
            )}
        </div>
          <div className="space-y-2">
            <label className={`block text-sm font-semibold ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
                Created By
            </label>
            <input
                type="number"
                {...register("created_by")}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                placeholder="Enter Created By"
                step="any"
            />
            {errors.created_by && (
                <p className="text-sm text-red-500 mt-1 animate-shake">{errors.created_by.message}</p>
            )}
        </div>
          <div className="space-y-2">
            <label className={`block text-sm font-semibold ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
                Updated By
            </label>
            <input
                type="number"
                {...register("updated_by")}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                placeholder="Enter Updated By"
                step="any"
            />
            {errors.updated_by && (
                <p className="text-sm text-red-500 mt-1 animate-shake">{errors.updated_by.message}</p>
            )}
        </div>
              </div>
              
              <div className="flex gap-3 pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={closeModal}
                  className={`flex-1 px-6 py-3 border rounded-xl font-medium transition-all duration-200 hover:scale-[1.02] ${
                    theme === 'dark'
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