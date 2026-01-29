"use client";
import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast, Toaster } from 'react-hot-toast';
import { useTheme } from "@/context/ThemeContext";
import axios from 'axios';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  ChevronsUpDown,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Key,
  Filter,
  Download,
  Loader2,
  AlertTriangle,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronFirst,
  ChevronLast,
  FileDown,
  MoreVertical,
  LogOut
} from 'lucide-react';

import PageBreadcrumb from "@/components/common/PageBreadCrumb";


// Import atau define token management
// Jika menggunakan context/auth store, sesuaikan dengan implementasi Anda
interface AuthState {
  token: string | null;
  user: any;
  isAuthenticated: boolean;
}

// Define TypeScript interface
interface UsersItem {
  id: '',
  username: '',
  email: '',
  password: '',
  jabatan: '',
  role_id: '',
  unit: '',
  status: ''
}

interface ApiResponse {
  data: UsersItem[];
  recordsTotal: number;
  recordsFiltered: number;
  draw: number;
}

// Define validation schema
const usersSchema = z.object({
    id: z.string().optional(),
    username: z.string().nonempty({ message: "This field is required" }),
    email: z.string().nonempty({ message: "This field is required" }),
    password: z.string().nonempty({ message: "This field is required" }),
    jabatan: z.string(),
    role_id: z.string().optional(),
    unit: z.string().optional(),
    status: z.string().optional()
});

type usersFormData = z.infer<typeof usersSchema>;

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

// Token management - sesuaikan dengan implementasi authentication Anda
const getToken = (): string | null => {
  // Contoh: Ambil dari localStorage
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token');
  }
  return null;
};

const getAuthHeaders = () => {
  const token = getToken();
  if (!token) {
    console.warn('No auth token found');
    return {};
  }
  
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

// Create axios instance with interceptors
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor untuk menambahkan token
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor untuk handle token expired
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired atau tidak valid
      toast.error('Session expired. Please login again.');
      
      // Clear token dan redirect ke login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        // Redirect ke login page
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Badge component for status
const StatusBadge = ({ status }: { status: string | boolean }) => {
  const isActive = status === 'Y' || status === '1' || status === true || status === 'true';
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

// Format date
const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch {
    return dateString;
  }
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
  item?: UsersItem;
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
                    Are you sure you want to delete <span className="font-semibold">"{item?.['id' as keyof UsersItem] as string}"</span>? 
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
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>ID:</span>
                      <p className="font-medium">{item.id}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Id:</span>
                      <p className="font-medium">{item.id}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Username:</span>
                      <p className="font-medium">{item.username}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Email:</span>
                      <p className="font-medium">{item.email}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Password:</span>
                      <p className="font-medium">{item.password}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Jabatan:</span>
                      <p className="font-medium">{item.jabatan}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Role Id:</span>
                      <p className="font-medium">{item.role_id}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Unit:</span>
                      <p className="font-medium">{item.unit}</p>
                    </div>
                    <div>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Status:</span>
                      <p className="font-medium">{item.status}</p>
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

// Export Menu Component
const ExportMenu = ({ 
  isOpen, 
  onClose, 
  onExport, 
  theme,
  selectedRows,
  searchTerm
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onExport: (type: 'all' | 'filtered' | 'selected') => void;
  theme: string;
  selectedRows: string[];
  searchTerm: string;
}) => {
  if (!isOpen) return null;

  return (
    <div className={`absolute right-0 mt-2 w-48 rounded-xl shadow-lg z-50 ${
      theme === 'dark' 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-200'
    } border`}>
      <div className="py-1">
        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            Export Options
          </p>
        </div>
        <button
          onClick={() => {
            onExport('all');
            onClose();
          }}
          className={`flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
          }`}
        >
          <FileDown className="w-4 h-4" />
          Export All Data
        </button>
        <button
          onClick={() => {
            onExport('filtered');
            onClose();
          }}
          disabled={!searchTerm}
          className={`flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
          } ${!searchTerm ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Filter className="w-4 h-4" />
          Export Filtered
          {!searchTerm && <span className="text-xs">(need search)</span>}
        </button>
        <button
          onClick={() => {
            onExport('selected');
            onClose();
          }}
          disabled={selectedRows.length === 0}
          className={`flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
          } ${selectedRows.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <FileDown className="w-4 h-4" />
          Export Selected ({selectedRows.length})
        </button>
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

// Logout component
const LogoutButton = ({ theme }: { theme: string }) => {
  const handleLogout = () => {
    // Clear token
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      // Redirect to login
      window.location.href = '/login';
    }
  };

  return (
    <button
      onClick={handleLogout}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
        theme === 'dark'
          ? 'text-gray-300 hover:bg-gray-800 hover:text-red-400'
          : 'text-gray-700 hover:bg-gray-100 hover:text-red-600'
      }`}
      title="Logout"
    >
      <LogOut className="w-4 h-4" />
      <span className="hidden md:inline">Logout</span>
    </button>
  );
};


export default function UsersPage() {
  const [items, setItems] = useState<UsersItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingItem, setDeletingItem] = useState<UsersItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
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
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Check authentication on mount
  useEffect(() => {
    const token = getToken();
    if (!token) {
      toast.error('Please login to access this page');
      // Redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<usersFormData>({
    resolver: zodResolver(usersSchema),
    defaultValues: {
      id: '',
      username: '',
      email: '',
      password: '',
      jabatan: '',
      role_id: '',
      unit: '',
      status: ''
    },
  });

  // Inisialisasi column index map saat komponen mount
  useEffect(() => {
    const fields = [
'username',
'email',
'password',
'jabatan',
'role_id',
'unit',
'status'
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
      
      // Cek token sebelum fetch
      const token = getToken();
      if (!token) {
        toast.error('Authentication required');
        return;
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
      
      // Gunakan paramsSerializer untuk format array dengan bracket
      const response = await api.get('users/getAll', {
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
      const activeCount = data.filter(item => item.status === 'Y' || item.status === '1' || item.status === true || item.status === 'true').length;
      const inactiveCount = data.filter(item => item.status === 'N' || item.status === '0' || item.status === false || item.status === 'false').length;
      
      setStats({
        total: data.length,
        active: activeCount,
        inactive: inactiveCount,
      });
    } catch (error: any) {
      console.error('Fetch error details:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          // Handled by interceptor
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
  }, [debouncedSearchTerm, sortField, sortDirection, pagination.limit, columnIndexMap]);

  // Fetch data saat dependencies berubah
  useEffect(() => {
    const token = getToken();
    if (token) {
      fetchData(pagination.page);
    }
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

  const openModal = (item?: UsersItem) => {
    if (item) {
      setEditingId(item.id);
      setValue('id', item.id);
      setValue('username', item.username);
      setValue('email', item.email);
      setValue('password', item.password);
      setValue('jabatan', item.jabatan);
      setValue('role_id', item.role_id);
      setValue('unit', item.unit);
      setValue('status', item.status);

    } else {
      setEditingId(null);
      reset({
      id: '',
      username: '',
      email: '',
      password: '',
      jabatan: '',
      role_id: '',
      unit: '',
      status: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    reset({
      id: '',
      username: '',
      email: '',
      password: '',
      jabatan: '',
      role_id: '',
      unit: '',
      status: ''
    });
  };

  const openDeleteModal = (item: UsersItem) => {
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

  const toggleExportMenu = () => {
    setIsExportMenuOpen(!isExportMenuOpen);
  };

  const closeExportMenu = () => {
    setIsExportMenuOpen(false);
  };

  // Fungsi handleExport untuk export Excel
  const handleExport = async (type: 'all' | 'filtered' | 'selected' = 'all') => {
    try {
      setExportLoading(true);
      
      // Cek token
      const token = getToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }
      
      // Build query parameters
      const params = new URLSearchParams();
      params.append('type', type);
      
      if (type === 'filtered') {
        if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
        // You can add more filter parameters here if needed
      } else if (type === 'selected' && selectedRows.length > 0) {
        params.append('ids', selectedRows.join(','));
      }
      
      // Tambahkan token ke header
      const headers = getAuthHeaders();
      
      // Create download link dengan Authorization header
      const url = `users/exportExcel?${params.toString()}`;
      
      // Gunakan fetch untuk bisa menambahkan custom headers
      const response = await fetch(url, {
        method: 'GET',
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      // Create blob dan download
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `users_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast.success('Export started! File download will begin shortly.');
    } catch (error) {
      toast.error('Export failed. Please try again.');
      console.error('Export error:', error);
    } finally {
      setExportLoading(false);
      closeExportMenu();
    }
  };

  const onSubmit = async (data: usersFormData) => {
    try {
      const token = getToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const requestData = {
          username: data.username,
          email: data.email,
          password: data.password,
          jabatan: data.jabatan,
          role_id: data.role_id,
          unit: data.unit,
          status: data.status
      };

      if (editingId) {
        const response = await api.post(`users/edit/${editingId}`, requestData);
        if (response.status === 200) {
          toast.success('Updated successfully!');
          fetchData(pagination.page);
          closeModal();
        }
      } else {
        const response = await api.post('users/add', requestData);
        if (response.status === 200 || response.status === 201) {
          toast.success('Created successfully!');
          fetchData(pagination.page);
          closeModal();
        }
      }
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.messages || error.response?.data?.message || 'Operation failed';
        toast.error(errorMessage);
      } else {
        toast.error('An error occurred');
      }
      console.error('Submit error:', error);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;

    try {
      const token = getToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      setDeleteLoading(true);
      await api.post('users/remove', { id: deletingItem.id });
      toast.success('Deleted successfully!');
      fetchData(pagination.page);
      closeDeleteModals();
      setSelectedRows(prev => prev.filter(rowId => rowId !== deletingItem.id));
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || 'Failed to delete');
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
      const token = getToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      setDeleteLoading(true);
      // Delete items satu per satu
      for (const id of selectedRows) {
        await api.post('users/remove', { id: id });
      }
      
      toast.success(`Successfully deleted ${selectedRows.length} items!`);
      fetchData(pagination.page);
      setSelectedRows([]);
      closeDeleteModals();
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || 'Bulk delete failed');
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
          <PageBreadcrumb pageTitle=" users" />
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
              users
            </h1>
            <p className={`mt-2 text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Manage your users efficiently
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <LogoutButton theme={theme} />
            <button
              onClick={() => openModal()}
              className="group px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              Add New Item
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
              placeholder="Search users..."
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
            
            <button className={`p-3 border rounded-xl hover:shadow-lg transition-all duration-200 ${
              theme === 'dark' 
                ? 'border-gray-700 hover:bg-gray-800/50' 
                : 'border-gray-200 hover:bg-gray-50'
            }`}>
              <Filter className="w-5 h-5" />
            </button>
            
            {/* Export Button with Dropdown */}
            <div className="relative">
              <button 
                onClick={toggleExportMenu}
                disabled={exportLoading}
                className={`p-3 border rounded-xl hover:shadow-lg transition-all duration-200 flex items-center gap-2 ${
                  theme === 'dark' 
                    ? 'border-gray-700 hover:bg-gray-800/50' 
                    : 'border-gray-200 hover:bg-gray-50'
                } ${exportLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {exportLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Download className="w-5 h-5" />
                )}
                <MoreVertical className="w-4 h-4" />
              </button>
              
              <ExportMenu
                isOpen={isExportMenuOpen}
                onClose={closeExportMenu}
                onExport={handleExport}
                theme={theme}
                selectedRows={selectedRows}
                searchTerm={searchTerm}
              />
            </div>
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
              Loading users...
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
                    onClick={() => handleSort('username')}
                    className="flex items-center gap-2 hover:text-blue-500 transition-colors"
                  >
                    Username
                    {sortField === 'username' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    ) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  <button 
                    onClick={() => handleSort('email')}
                    className="flex items-center gap-2 hover:text-blue-500 transition-colors"
                  >
                    Email
                    {sortField === 'email' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    ) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  <button 
                    onClick={() => handleSort('password')}
                    className="flex items-center gap-2 hover:text-blue-500 transition-colors"
                  >
                    Password
                    {sortField === 'password' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    ) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  <button 
                    onClick={() => handleSort('jabatan')}
                    className="flex items-center gap-2 hover:text-blue-500 transition-colors"
                  >
                    Jabatan
                    {sortField === 'jabatan' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    ) : <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  <button 
                    onClick={() => handleSort('role_id')}
                    className="flex items-center gap-2 hover:text-blue-500 transition-colors"
                  >
                    Role Id
                    {sortField === 'role_id' ? (
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
                    onClick={() => handleSort('status')}
                    className="flex items-center gap-2 hover:text-blue-500 transition-colors"
                  >
                    Status
                    {sortField === 'status' ? (
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
                  {item.username}
                </td>
                <td className="px-6 py-4">
                  {item.email}
                </td>
                <td className="px-6 py-4">
                  {item.password}
                </td>
                <td className="px-6 py-4">
                  {item.jabatan}
                </td>
                <td className="px-6 py-4">
                  {item.role_id}
                </td>
                <td className="px-6 py-4">
                  {item.unit}
                </td>
                <td className="px-6 py-4">
                  {item.status}
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
                            No users found
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
                  <h2 className="text-xl font-bold">
                    {editingId ? 'Edit' : 'New'} users
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
              <input type="hidden" {...register("id")} />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <input type="hidden" {...register("id")} />
          <div className="space-y-2">
            <label className={`block text-sm font-semibold ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Username *
            </label>
            <input
              type="email"
              {...register("username")}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
              placeholder="Enter Username"
            />
            {errors.username && (
              <p className="text-sm text-red-500 mt-1 animate-shake">{errors.username.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className={`block text-sm font-semibold ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Email *
            </label>
            <input
              type="password"
              {...register("email")}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
              placeholder="Enter Email"
            />
            {errors.email && (
              <p className="text-sm text-red-500 mt-1 animate-shake">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className={`block text-sm font-semibold ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Password *
            </label>
            <input
              type="text"
              {...register("password")}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
              placeholder="Enter Password"
               
            />
            {errors.password && (
              <p className="text-sm text-red-500 mt-1 animate-shake">{errors.password.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className={`block text-sm font-semibold ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Jabatan *
            </label>
            <input
              type="number"
              {...register("jabatan")}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
              placeholder="Enter Jabatan"
               max="100"
            />
            {errors.jabatan && (
              <p className="text-sm text-red-500 mt-1 animate-shake">{errors.jabatan.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className={`block text-sm font-semibold ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Role Id
            </label>
            <input
              type="text"
              {...register("role_id")}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
              placeholder="Enter Role Id"
               
            />
            {errors.role_id && (
              <p className="text-sm text-red-500 mt-1 animate-shake">{errors.role_id.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className={`block text-sm font-semibold ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Unit
            </label>
            <select
              {...register("unit")}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
            >
              <option value="">Select Unit</option>
              <option value="Y">Yes</option>
              <option value="N">No</option>
            </select>
            {errors.unit && (
              <p className="text-sm text-red-500 mt-1 animate-shake">{errors.unit.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className={`block text-sm font-semibold ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Status
            </label>
            <input
              type="text"
              {...register("status")}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
              placeholder="Enter Status"
               
            />
            {errors.status && (
              <p className="text-sm text-red-500 mt-1 animate-shake">{errors.status.message}</p>
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