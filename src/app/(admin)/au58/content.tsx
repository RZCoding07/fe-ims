'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  Check,
  Clock,
  FileText,
  ThumbsUp,
  ThumbsDown,
  UserCheck,
  UserPlus,
  Users,
  Shield,
  Eye,
  EyeOff,
  Filter,
  RefreshCw
} from 'lucide-react';
import Select from 'react-select';

// Define TypeScript interfaces
interface MasterMaterial {
  id: string;
  kode_material: string;
  material_desc: string;
  satuan: string;
  is_opla: string;
}

type SelectOption = {
  value: string;
  label: string;
};


interface Unit {
  id: string;
  nama_unit: string;
}

interface Bagian {
  id: string;
  nama_bagian: string;
}

interface ApprovalHistory {
  id: string;
  au58_id: string;
  action: string;
  action_by: string;
  action_by_name: string;
  action_at: string;
  notes?: string;
  role: string;
}

interface Au58Item {
  id: string;
  nomor_urut: string;
  nomor_manual: string;
  tanggal: string;
  unit: string;
  bagian: string;
  kode_material: string;
  uraian: string;
  tahun_tanam: string;
  nomor_blok: string;
  luas_ha: string;
  jumlah_pokok: string;
  dosis_cc_ha: string;
  satuan: string;
  banyaknya_diminta: string;
  banyaknya_dikeluarkan: string;
  harga_satuan: string;
  jumlah: string;
  no_rekg: string;
  sisa_setelah_dibukukan: string;
  barang_untuk_kegiatan: string;
  dikirim_kepada: string;
  kode_gudang_pengirim: string;
  status: string;
  approval_status: 'pending' | 'level1_approved' | 'level2_approved' | 'approved' | 'rejected';
  current_approval_level: number;
  approved1_by: string | null;
  approved1_at: string | null;
  approved1_name?: string;
  approved2_by: string | null;
  approved2_at: string | null;
  approved2_name?: string;
  approved_final_by: string | null;
  approved_final_at: string | null;
  approved_final_name?: string;
  rejected_by: string | null;
  rejected_at: string | null;
  rejected_reason: string | null;
  is_opla: string;
  created_by: string;
  created_by_name?: string;
  updated_by: string;
  updated_by_name?: string;
  created_at?: string;
  updated_at?: string;
}

interface ApiResponse {
  data: Au58Item[];
  recordsTotal: number;
  recordsFiltered: number;
  draw: number;
}

interface StatsResponse {
  total: number;
  pending: number;
  approved_level1: number;
  approved_level2: number;
  approved_final: number;
  rejected: number;
}

// Define validation schema
const au58Schema = z.object({
  id: z.string().optional(),
  nomor_urut: z.string().optional(),
  nomor_manual: z.string().min(1, { message: "Nomor Manual is required" }),
  tanggal: z.string().min(1, { message: "Tanggal is required" }),
  unit: z.string().min(1, { message: "Unit is required" }),
  bagian: z.string().min(1, { message: "Bagian is required" }),
  kode_material: z.string().min(1, { message: "Kode Material is required" }),
  uraian: z.string().optional(),
  tahun_tanam: z.string().optional(),
  nomor_blok: z.string().optional(),
  luas_ha: z.string().optional(),
  jumlah_pokok: z.string().optional(),
  dosis_cc_ha: z.string().optional(),
  satuan: z.string().optional(),
  banyaknya_diminta: z.string().min(1, { message: "Banyaknya Diminta is required" }),
  banyaknya_dikeluarkan: z.string().optional(),
  harga_satuan: z.string().optional(),
  jumlah: z.string().optional(),
  no_rekg: z.string().optional(),
  sisa_setelah_dibukukan: z.string().optional(),
  barang_untuk_kegiatan: z.string().min(1, { message: "Barang Untuk Kegiatan is required" }),
  dikirim_kepada: z.string().optional(),
  kode_gudang_pengirim: z.string().optional(),
  status: z.string().optional(),
  approval_status: z.string().optional(),
  current_approval_level: z.number().optional(),
  approved1_by: z.string().optional(),
  approved1_at: z.string().optional(),
  approved2_by: z.string().optional(),
  approved2_at: z.string().optional(),
  approved_final_by: z.string().optional(),
  approved_final_at: z.string().optional(),
  rejected_by: z.string().optional(),
  rejected_at: z.string().optional(),
  rejected_reason: z.string().optional(),
  is_opla: z.string().optional(),
  created_by: z.string().optional(),
  updated_by: z.string().optional()
});

type Au58FormData = z.infer<typeof au58Schema>;

// Approval Modal Props
interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (notes?: string) => void;
  item: Au58Item;
  action: 'approve' | 'reject';
  level: 'level1' | 'level2' | 'final';
  theme: string;
  loading?: boolean;
}

// Approval History Modal Props
interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Au58Item;
  history: ApprovalHistory[];
  theme: string;
  loading?: boolean;
}

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
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor untuk handle token expired
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.config?.url?.includes('/login') || 
          error.config?.url?.includes('/register') ||
          error.config?.url?.includes('/validate')) {
        return Promise.reject(error);
      }
      
      if (error.response?.status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('last_validation');
        
        setTimeout(() => {
          toast.error('Session expired. Please login again.');
        }, 100);
        
        router.push('/login');
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

// Status Badge Component
const StatusBadge = ({ status, approval_status }: { status: string; approval_status?: string }) => {
  const getStatusConfig = () => {
    if (approval_status === 'approved') {
      return {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-800 dark:text-green-400',
        icon: CheckCircle,
        label: 'Approved'
      };
    }
    if (approval_status === 'rejected') {
      return {
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-800 dark:text-red-400',
        icon: XCircle,
        label: 'Rejected'
      };
    }
    if (approval_status === 'level2_approved') {
      return {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-800 dark:text-blue-400',
        icon: UserCheck,
        label: 'Level 2 Approved'
      };
    }
    if (approval_status === 'level1_approved') {
      return {
        bg: 'bg-purple-100 dark:bg-purple-900/30',
        text: 'text-purple-800 dark:text-purple-400',
        icon: UserCheck,
        label: 'Level 1 Approved'
      };
    }
    return {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-800 dark:text-yellow-400',
      icon: Clock,
      label: 'Pending'
    };
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
      <Icon className="w-4 h-4 mr-1.5" />
      {config.label}
    </div>
  );
};

// Approval Modal Component
const ApprovalModal = ({ isOpen, onClose, onConfirm, item, action, level, theme, loading }: ApprovalModalProps) => {
  const [notes, setNotes] = useState('');
  
  if (!isOpen) return null;

  const getTitle = () => {
    if (action === 'reject') return 'Reject AU-58';
    if (level === 'level1') return 'Approve Level 1';
    if (level === 'level2') return 'Approve Level 2';
    return 'Final Approve';
  };

  const getLevelLabel = () => {
    if (level === 'level1') return 'ASTU';
    if (level === 'level2') return 'Asisten Kepala';
    return 'Manajer';
  };

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
              action === 'reject'
                ? theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100'
                : theme === 'dark' ? 'bg-green-900/30' : 'bg-green-100'
            }`}>
              {action === 'reject' ? (
                <ThumbsDown className={`w-6 h-6 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
              ) : (
                <ThumbsUp className={`w-6 h-6 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold">{getTitle()}</h3>
              <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                {action === 'reject' 
                  ? `You are about to reject AU-58: ${item.nomor_manual}`
                  : `You are about to approve as ${getLevelLabel()} for AU-58: ${item.nomor_manual}`
                }
              </p>

              <div className={`mt-4 p-4 rounded-lg ${
                theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50'
              }`}>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>Nomor Manual:</span>
                    <span className="font-medium">{item.nomor_manual}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>Unit:</span>
                    <span className="font-medium">{item.unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>Bagian:</span>
                    <span className="font-medium">{item.bagian}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>Kode Material:</span>
                    <span className="font-medium">{item.kode_material}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>Jumlah Diminta:</span>
                    <span className="font-medium">{item.banyaknya_diminta} {item.satuan}</span>
                  </div>
                </div>
              </div>

              {action === 'reject' && (
                <div className="mt-4">
                  <label className={`block text-sm font-medium mb-2 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Rejection Reason *
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all duration-200 ${
                      theme === 'dark'
                        ? 'bg-gray-800/50 border-gray-700 text-gray-100 placeholder-gray-400'
                        : 'bg-white/80 border-gray-200 text-gray-900 placeholder-gray-500'
                    }`}
                    placeholder="Enter reason for rejection..."
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <button
              onClick={onClose}
              disabled={loading}
              className={`flex-1 px-6 py-3 border rounded-xl font-medium transition-all duration-200 hover:scale-[1.02] ${
                theme === 'dark'
                  ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(action === 'reject' ? notes : undefined)}
              disabled={loading || (action === 'reject' && !notes.trim())}
              className={`flex-1 px-6 py-3 font-medium rounded-xl hover:scale-[1.02] focus:outline-none focus:ring-2 transition-all duration-200 shadow-lg flex items-center justify-center gap-2 ${
                action === 'reject'
                  ? 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 focus:ring-red-500'
                  : 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 focus:ring-green-500'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {action === 'reject' ? 'Reject' : 'Approve'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Approval History Modal Component
const HistoryModal = ({ isOpen, onClose, item, history, theme, loading }: HistoryModalProps) => {
  if (!isOpen) return null;

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'submit':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'approve_level1':
        return <UserCheck className="w-5 h-5 text-purple-500" />;
      case 'approve_level2':
        return <UserCheck className="w-5 h-5 text-blue-500" />;
      case 'approve_final':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'reject':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'submit':
        return 'Submitted';
      case 'approve_level1':
        return 'Approved by ASTU';
      case 'approve_level2':
        return 'Approved by Asisten Kepala';
      case 'approve_final':
        return 'Final Approved by Manajer';
      case 'reject':
        return 'Rejected';
      default:
        return action;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className={`rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto transform transition-all duration-300 scale-100 ${
        theme === 'dark' 
          ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700' 
          : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'
      } border`}>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-inherit">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
              }`}>
                <Clock className={`w-6 h-6 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Approval History</h2>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  AU-58: {item.nomor_manual}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
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

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <Clock className={`w-12 h-12 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className={`text-lg font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                No history found
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
              
              <div className="space-y-6">
                {history.map((hist, index) => (
                  <div key={hist.id || index} className="relative flex items-start gap-4">
                    <div className="relative z-10">
                      <div className={`p-2 rounded-full ${
                        theme === 'dark' ? 'bg-gray-800' : 'bg-white'
                      } border-2 ${
                        hist.action === 'reject' 
                          ? 'border-red-500' 
                          : hist.action === 'approve_final'
                            ? 'border-green-500'
                            : 'border-blue-500'
                      }`}>
                        {getActionIcon(hist.action)}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className={`p-4 rounded-lg ${
                        theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">
                            {getActionLabel(hist.action)}
                          </h4>
                          <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {new Date(hist.action_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <UserCheck className="w-4 h-4" />
                          <span>{hist.action_by_name} ({hist.role})</span>
                        </div>
                        {hist.notes && (
                          <div className={`mt-2 p-2 rounded text-sm ${
                            theme === 'dark' ? 'bg-gray-700/50' : 'bg-white'
                          }`}>
                            <span className="font-medium">Notes: </span>
                            {hist.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Delete Confirmation Modal
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
                    Are you sure you want to delete AU-58: <span className="font-semibold">{item?.nomor_manual}</span>? 
                    This action cannot be undone.
                  </>
                )}
              </p>
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
              {isBulk ? `Delete ${bulkCount} Items` : 'Delete'}
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
  const [renderError, setRenderError] = useState<string | null>(null);
  const [items, setItems] = useState<Au58Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingItem, setDeletingItem] = useState<Au58Item | null>(null);
  const [selectedApprovalItem, setSelectedApprovalItem] = useState<Au58Item | null>(null);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalLevel, setApprovalLevel] = useState<'level1' | 'level2' | 'final'>('level1');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistory[]>([]);
  const [stats, setStats] = useState<StatsResponse>({
    total: 0,
    pending: 0,
    approved_level1: 0,
    approved_level2: 0,
    approved_final: 0,
    rejected: 0
  });
  
  // Master data states
  const [materials, setMaterials] = useState<MasterMaterial[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [bagian, setBagian] = useState<Bagian[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<MasterMaterial | null>(null);
  
  // Filter states for approval view
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterUnit, setFilterUnit] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'maker' | 'approval'>('maker');
  
  // State untuk mapping kolom ke indeks
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
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // Create axios instance dengan interceptor
  const [api] = useState(() => createApiInstance(router));

  // Determine user role
  const userRole = user?.role || user?.role_name || '';
  const isMaker = userRole === 'Maker';
  const isApproval1 = userRole === 'Approval 1';
  const isApproval2 = userRole === 'Approval 2';
  const isApprovalFinal = userRole === 'Approval Final';
  const isApprover = isApproval1 || isApproval2 || isApprovalFinal;

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

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<Au58FormData>({
    resolver: zodResolver(au58Schema),
    defaultValues: {
      id: '',
      nomor_urut: '',
      nomor_manual: '',
      tanggal: new Date().toISOString().slice(0, 16),
      unit: '',
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
      status: 'Y',
      approval_status: 'pending',
      current_approval_level: 0,
      is_opla: ''
    },
  });

  const watchKodeMaterial = watch('kode_material');

  // Effect to update satuan and uraian when material changes - use useCallback to prevent infinite loops
  useEffect(() => {
    if (watchKodeMaterial && materials && materials.length > 0) {
      const material = materials.find(m => m.kode_material === watchKodeMaterial);
      if (material) {
        setSelectedMaterial(material);
        // Use setTimeout to batch state updates and prevent render loop
        const timer = setTimeout(() => {
          setValue('satuan', material.satuan || '');
          setValue('uraian', material.material_desc || '');
          setValue('is_opla', material.is_opla || '');
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [watchKodeMaterial, materials.length]);

  // Proteksi halaman - redirect jika tidak authenticated
  useEffect(() => {
    let isMounted = true;
    const checkAuth = async () => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('auth_token');
        
        if (!isMounted) return;
        
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
    return () => {
      isMounted = false;
    };
  }, [router, logout]);

  // Set active tab based on user role - only once on mount
  useEffect(() => {
    const tab = isApprover ? 'approval' : 'maker';
    setActiveTab(tab);
  }, []);

  // Inisialisasi column index map
  useEffect(() => {
    const fields = [
      'nomor_urut', 'nomor_manual', 'tanggal', 'unit', 'bagian', 'kode_material',
      'uraian', 'tahun_tanam', 'nomor_blok', 'luas_ha', 'jumlah_pokok', 'dosis_cc_ha',
      'satuan', 'banyaknya_diminta', 'banyaknya_dikeluarkan', 'harga_satuan', 'jumlah',
      'no_rekg', 'sisa_setelah_dibukukan', 'barang_untuk_kegiatan', 'dikirim_kepada',
      'kode_gudang_pengirim', 'status', 'approval_status', 'current_approval_level',
      'approved1_by', 'approved1_at', 'approved2_by', 'approved2_at',
      'approved_final_by', 'approved_final_at', 'rejected_by', 'rejected_at',
      'rejected_reason', 'is_opla', 'created_by', 'updated_by', 'created_at', 'updated_at'
    ];
    
    const indexMap: Record<string, number> = {};
    fields.forEach((field, index) => {
      indexMap[field] = index;
    });
    setColumnIndexMap(indexMap);
  }, []);

  // Fetch master materials
  const fetchMaterials = useCallback(async () => {
    try {
      setLoadingMaterials(true);
      const response = await api.get('mastermaterials/getAll', {
        params: {
          length: 1000,
          'search[value]': ''
        }
      });
      
      let materialsData = [];
      if (response.data && response.data.data) {
        materialsData = response.data.data;
      } else if (Array.isArray(response.data)) {
        materialsData = response.data;
      }
      
      setMaterials(materialsData);
    } catch (error) {
      console.error('Error fetching materials:', error);
      toast.error('Failed to load materials');
    } finally {
      setLoadingMaterials(false);
    }
  }, [api]);

  // Fetch units
  const fetchUnits = useCallback(async () => {
    try {
      const response = await api.get('au58/units');
      if (response.data && response.data.data) {
        setUnits(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching units:', error);
    }
  }, [api]);

  // Fetch bagian
  const fetchBagian = useCallback(async () => {
    try {
      const response = await api.get('au58/bagian');
      if (response.data && response.data.data) {
        setBagian(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching bagian:', error);
    }
  }, [api]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('au58/stats');
      if (response.data && response.data.data) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [api]);

  // Fetch approval history
  const fetchApprovalHistory = useCallback(async (au58Id: string) => {
    try {
      setHistoryLoading(true);
      const response = await api.get(`au58/approval-history/${au58Id}`);
      if (response.data && response.data.data) {
        setApprovalHistory(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching approval history:', error);
      toast.error('Failed to load approval history');
    } finally {
      setHistoryLoading(false);
    }
  }, [api]);

  // Fetch data
  const fetchData = useCallback(async (page = 1) => {
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
      const columnIndex = columnIndexMap[sortField] ?? 0;
      
      // Build params based on user role
      const params: any = {
        draw: pagination.draw,
        start: start,
        length: pagination.limit,
        'order[0][column]': columnIndex,
        'order[0][dir]': sortDirection,
      };

      // Add search term
      if (debouncedSearchTerm) {
        params['search[value]'] = debouncedSearchTerm;
      }

      // Add filters based on user role
      if (isApprover) {
        // For approvers, show items that need their approval
        if (isApproval1) {
          params['approval_status'] = 'pending';
          params['current_approval_level'] = 0;
        } else if (isApproval2) {
          params['approval_status'] = 'level1_approved';
          params['current_approval_level'] = 1;
        } else if (isApprovalFinal) {
          params['approval_status'] = 'level2_approved';
          params['current_approval_level'] = 2;
        }
      }

      // Apply manual filters
      if (filterStatus !== 'all') {
        params['filter_status'] = filterStatus;
      }
      if (filterUnit !== 'all') {
        params['filter_unit'] = filterUnit;
      }
      
      const response = await api.get('au58/getAll', {
        params,
        paramsSerializer: { indexes: null }
      });
      
      let data = [];
      let recordsTotal = 0;
      let recordsFiltered = 0;
      let draw = 1;
      
      if (response.data) {
        data = response.data.data || [];
        recordsTotal = response.data.recordsTotal || 0;
        recordsFiltered = response.data.recordsFiltered || recordsTotal;
        draw = response.data.draw || pagination.draw + 1;
      }
      
      if (!Array.isArray(data)) {
        data = [];
      }
      
      setItems(data);
      
      setPagination(prev => ({
        ...prev,
        page: page,
        total: recordsTotal,
        totalPages: Math.ceil(recordsFiltered / prev.limit) || 1,
        draw: draw,
      }));
    } catch (error: any) {
      console.error('Fetch error:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
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
  }, [api, router, logout, isApprover, isApproval1, isApproval2, isApprovalFinal]);

  // Fetch data on dependencies change - ONLY on mount and search change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData(1);
    }, 0);
    return () => clearTimeout(timer);
  }, [debouncedSearchTerm]);

  // Fetch master data only once on mount
  useEffect(() => {
    fetchMaterials();
    fetchUnits();
    fetchBagian();
    fetchStats();
  }, []);

  const handleSort = (field: string) => {
    const newDirection = sortField === field ? (sortDirection === 'asc' ? 'desc' : 'asc') : 'asc';
    setSortField(field);
    setSortDirection(newDirection);
    setPagination(prev => ({ ...prev, page: 1 }));
    setTimeout(() => {
      fetchData(1);
    }, 0);
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
    setTimeout(() => {
      fetchData(page);
    }, 0);
  };

  const handleLimitChange = (limit: number) => {
    setPagination(prev => ({ ...prev, limit, page: 1 }));
  };

  const openModal = (item?: Au58Item) => {
    // Only Maker can open create/edit modal
    if (!isMaker) {
      toast.error('You do not have permission to create/edit AU-58');
      return;
    }

    if (item) {
      // Check if item can be edited (only pending items)
      if (item.approval_status !== 'pending') {
        toast.error('Cannot edit item that is already in approval process');
        return;
      }

      setEditingId(item.id);
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
      setValue('approval_status', item.approval_status);
      setValue('current_approval_level', item.current_approval_level);
      setValue('is_opla', item.is_opla);
    } else {
      setEditingId(null);
      reset({
        id: '',
        nomor_urut: '',
        nomor_manual: '',
        tanggal: new Date().toISOString().slice(0, 16),
        unit: '',
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
        status: 'Y',
        approval_status: 'pending',
        current_approval_level: 0,
        is_opla: ''
      });
    }
      fetchDropdownOptions();
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setSelectedMaterial(null);
  };

  const openDeleteModal = (item: Au58Item) => {
    // Only Maker can delete and only pending items
    if (!isMaker) {
      toast.error('You do not have permission to delete AU-58');
      return;
    }

    if (item.approval_status !== 'pending') {
      toast.error('Cannot delete item that is already in approval process');
      return;
    }

    setDeletingItem(item);
    setIsDeleteModalOpen(true);
  };

  const openBulkDeleteModal = () => {
    if (!isMaker) {
      toast.error('You do not have permission to delete AU-58');
      return;
    }

    // Check if any selected item is not pending
    const hasNonPending = items
      .filter(item => selectedRows.includes(item.id))
      .some(item => item.approval_status !== 'pending');

    if (hasNonPending) {
      toast.error('Cannot delete items that are already in approval process');
      return;
    }

    if (selectedRows.length > 0) {
      setIsBulkDeleteModalOpen(true);
    }
  };

  const openApprovalModal = (item: Au58Item, action: 'approve' | 'reject') => {
    // Check if user has permission for this action
    if (isApproval1 && item.current_approval_level === 0 && item.approval_status === 'pending') {
      setApprovalLevel('level1');
    } else if (isApproval2 && item.current_approval_level === 1 && item.approval_status === 'level1_approved') {
      setApprovalLevel('level2');
    } else if (isApprovalFinal && item.current_approval_level === 2 && item.approval_status === 'level2_approved') {
      setApprovalLevel('final');
    } else {
      toast.error('You do not have permission to approve this item at this stage');
      return;
    }

    setSelectedApprovalItem(item);
    setApprovalAction(action);
    setIsApprovalModalOpen(true);
  };

  const openHistoryModal = async (item: Au58Item) => {
    setSelectedApprovalItem(item);
    await fetchApprovalHistory(item.id);
    setIsHistoryModalOpen(true);
  };

  const closeDeleteModals = () => {
    setIsDeleteModalOpen(false);
    setIsBulkDeleteModalOpen(false);
    setDeletingItem(null);
    setDeleteLoading(false);
  };

  const closeApprovalModal = () => {
    setIsApprovalModalOpen(false);
    setSelectedApprovalItem(null);
    setApprovalLoading(false);
  };

  const closeHistoryModal = () => {
    setIsHistoryModalOpen(false);
    setSelectedApprovalItem(null);
    setApprovalHistory([]);
  };

  const onSubmit = async (data: Au58FormData) => {
    // Only Maker can submit
    if (!isMaker) {
      toast.error('You do not have permission to create/edit AU-58');
      return;
    }

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
        approval_status: data.approval_status || 'pending',
        current_approval_level: data.current_approval_level || 0,
        is_opla: data.is_opla
      };

      if (editingId) {
        const response = await api.post(`au58/edit/${editingId}`, requestData);
        if (response.status === 200) {
          toast.success('AU-58 updated successfully!');
          setTimeout(() => {
            fetchData(pagination.page);
            fetchStats();
            closeModal();
          }, 0);
        }
      } else {
        const response = await api.post('au58/add', requestData);
        if (response.status === 200 || response.status === 201) {
          toast.success('AU-58 created successfully!');
          setTimeout(() => {
            fetchData(pagination.page);
            fetchStats();
            closeModal();
          }, 0);
        }
      }
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
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

    // Only Maker can delete
    if (!isMaker) {
      toast.error('You do not have permission to delete AU-58');
      return;
    }

    try {
      setDeleteLoading(true);
      await api.post('au58/remove', { id: deletingItem.id });
      toast.success('Deleted successfully!');
      setTimeout(() => {
        fetchData(pagination.page);
        fetchStats();
        closeDeleteModals();
        setSelectedRows(prev => prev.filter(rowId => rowId !== deletingItem.id));
      }, 0);
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
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

    // Only Maker can delete
    if (!isMaker) {
      toast.error('You do not have permission to delete AU-58');
      return;
    }

    try {
      setDeleteLoading(true);
      for (const id of selectedRows) {
        await api.post('au58/remove', { id: id });
      }
      
      toast.success(`Successfully deleted ${selectedRows.length} items!`);
      setTimeout(() => {
        fetchData(pagination.page);
        fetchStats();
        setSelectedRows([]);
        closeDeleteModals();
      }, 0);
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
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

  const handleApproval = async (notes?: string) => {
    if (!selectedApprovalItem) return;

    try {
      setApprovalLoading(true);

      let endpoint = '';
      let payload: any = { id: selectedApprovalItem.id };

      if (approvalAction === 'reject') {
        endpoint = 'au58/reject';
        payload.rejected_reason = notes;
      } else {
        if (approvalLevel === 'level1') {
          endpoint = 'au58/approve-level1';
        } else if (approvalLevel === 'level2') {
          endpoint = 'au58/approve-level2';
        } else {
          endpoint = 'au58/approve-final';
        }
      }

      const response = await api.post(endpoint, payload);

      if (response.status === 200) {
        toast.success(`AU-58 ${approvalAction === 'reject' ? 'rejected' : 'approved'} successfully!`);
        setTimeout(() => {
          fetchData(pagination.page);
          fetchStats();
          closeApprovalModal();
        }, 0);
      }
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.message || 
                           error.response?.data?.messages || 
                           'Approval action failed';
        toast.error(errorMessage);
      } else {
        toast.error('An error occurred');
      }
      console.error('Approval error:', error);
    } finally {
      setApprovalLoading(false);
    }
  };

  const toggleRowSelection = (id: string) => {
    // Only Maker can select rows for bulk delete
    if (!isMaker) return;

    setSelectedRows(prev =>
      prev.includes(id) 
        ? prev.filter(rowId => rowId !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    // Only Maker can select rows for bulk delete
    if (!isMaker) return;

    if (selectedRows.length === items.length && items.length > 0) {
      setSelectedRows([]);
    } else {
      setSelectedRows(items.map(item => item.id));
    }
  };

  const canEdit = (item: Au58Item) => {
    return isMaker && item.approval_status === 'pending';
  };

  const canDelete = (item: Au58Item) => {
    return isMaker && item.approval_status === 'pending';
  };

  const canApprove = (item: Au58Item) => {
    if (isApproval1 && item.current_approval_level === 0 && item.approval_status === 'pending') {
      return true;
    }
    if (isApproval2 && item.current_approval_level === 1 && item.approval_status === 'level1_approved') {
      return true;
    }
    if (isApprovalFinal && item.current_approval_level === 2 && item.approval_status === 'level2_approved') {
      return true;
    }
    return false;
  };

  const canReject = (item: Au58Item) => {
    // Any approver can reject at their level
    if (isApproval1 && item.current_approval_level === 0 && item.approval_status === 'pending') {
      return true;
    }
    if (isApproval2 && item.current_approval_level === 1 && item.approval_status === 'level1_approved') {
      return true;
    }
    if (isApprovalFinal && item.current_approval_level === 2 && item.approval_status === 'level2_approved') {
      return true;
    }
    return false;
  };

  // Theme-based styles
  const cardClass = theme === 'dark'
    ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700'
    : 'bg-gradient-to-br from-white to-gray-50 border-gray-200';

  const inputClass = theme === 'dark'
    ? `bg-gray-800/50 border-gray-700 text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 backdrop-blur-sm ${
        errors.kode_material ? 'border-red-500' : ''
      }`
    : `bg-white/80 border-gray-200 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 backdrop-blur-sm ${
        errors.kode_material ? 'border-red-300' : ''
      }`;

  const tableHeaderClass = theme === 'dark'
    ? 'bg-gray-800/50 text-gray-300 border-gray-700'
    : 'bg-gray-50/80 text-gray-600 border-gray-200';

  const tableRowClass = (index: number) => theme === 'dark'
    ? `bg-gray-900/30 hover:bg-gray-800/50 text-gray-100 ${index % 2 === 0 ? 'bg-gray-900/20' : ''}`
    : `hover:bg-gray-50/80 text-gray-900 ${index % 2 === 0 ? 'bg-gray-50/50' : ''}`;

  const tabClass = (isActive: boolean) => `
    px-6 py-3 font-medium text-sm rounded-t-xl transition-all duration-200 flex items-center gap-2
    ${isActive 
      ? theme === 'dark'
        ? 'bg-gray-800 text-blue-400 border-b-2 border-blue-500'
        : 'bg-white text-blue-600 border-b-2 border-blue-500 shadow-sm'
      : theme === 'dark'
        ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80'
    }
  `;

   const getSelectStyles = useCallback(
      () => ({
        control: (base: any, state: any) => ({
          ...base,
          backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
          borderColor:
            errors.kode_gudang_pengirim || errors.kode_material ? '#ef4444' : theme === 'dark' ? '#374151' : '#e5e7eb',
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
        () => barangOptions.find((o) => o.value === selectedKodeMaterial) || null,
        [barangOptions, selectedKodeMaterial]
      );
      const selectedGudangOption = useMemo(
        () => gudangOptions.find((o) => o.value === selectedKodeGudang) || null,
        [gudangOptions, selectedKodeGudang]
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className={`text-4xl font-bold bg-gradient-to-r ${theme === 'dark' ? 'from-blue-100 to-sky-100' : 'from-blue-600 to-sky-600'} bg-clip-text text-transparent`}>
              AU 58
            </h1>
            <p className={`mt-2 text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {isMaker ? 'Create and manage AU-58 documents' : 'Approve AU-58 documents'}
            </p>
          </div>
          
          <div className="flex gap-4">
            {isMaker && (
              <button
                onClick={() => openModal()}
                className="group px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                Create New AU-58
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-6">
          <div className={`p-4 rounded-xl border ${cardClass}`}>
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
                <FileText className={`w-5 h-5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
              </div>
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-xl border ${cardClass}`}>
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-yellow-900/30' : 'bg-yellow-100'}`}>
                <Clock className={`w-5 h-5 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`} />
              </div>
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-xl border ${cardClass}`}>
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'}`}>
                <UserCheck className={`w-5 h-5 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} />
              </div>
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Level 1</p>
                <p className="text-2xl font-bold">{stats.approved_level1}</p>
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-xl border ${cardClass}`}>
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
                <UserCheck className={`w-5 h-5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
              </div>
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Level 2</p>
                <p className="text-2xl font-bold">{stats.approved_level2}</p>
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-xl border ${cardClass}`}>
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-green-900/30' : 'bg-green-100'}`}>
                <CheckCircle className={`w-5 h-5 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
              </div>
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Final</p>
                <p className="text-2xl font-bold">{stats.approved_final}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Role Badge */}
        <div className="mt-4 flex items-center gap-2">
          <div className={`px-4 py-2 rounded-lg ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
          }`}>
            <div className="flex items-center gap-2">
              <Shield className={`w-5 h-5 ${
                isMaker ? 'text-blue-500' : 'text-green-500'
              }`} />
              <span className={`font-medium ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Logged in as: <span className="font-bold">{userRole}</span>
              </span>
            </div>
          </div>
          {isApprover && (
            <div className={`px-4 py-2 rounded-lg ${
              theme === 'dark' ? 'bg-yellow-900/30' : 'bg-yellow-100'
            }`}>
              <div className="flex items-center gap-2">
                <Eye className={`w-5 h-5 ${
                  theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'
                }`} />
                <span className={`font-medium ${
                  theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700'
                }`}>
                  Approval Mode
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs for Maker vs Approval */}
      {isApprover && isMaker ? (
        <div className={`mb-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('maker')}
              className={tabClass(activeTab === 'maker')}
            >
              <UserPlus className="w-4 h-4" />
              Maker View
            </button>
            <button
              onClick={() => setActiveTab('approval')}
              className={tabClass(activeTab === 'approval')}
            >
              <Users className="w-4 h-4" />
              Approval View
            </button>
          </div>
        </div>
      ) : null}

      {/* Search and Actions Bar - Show based on active tab */}
      {(activeTab === 'maker' ? isMaker : isApprover) && (
        <div className={`mb-6 p-6 rounded-2xl border shadow-lg backdrop-blur-sm ${cardClass}`}>
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative flex-1 max-w-xl w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
              </div>
              <input
                type="text"
                placeholder={activeTab === 'maker' ? "Search AU-58..." : "Search pending approvals..."}
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

              {/* Filter for approval view */}
              {activeTab === 'approval' && (
                <>
                  <div className="flex items-center gap-2">
                    <Filter className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                        theme === 'dark'
                          ? 'bg-gray-800 border-gray-700 text-gray-100'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="level1_approved">Level 1 Approved</option>
                      <option value="level2_approved">Level 2 Approved</option>
                      <option value="approved">Final Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={filterUnit}
                      onChange={(e) => setFilterUnit(e.target.value)}
                      className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                        theme === 'dark'
                          ? 'bg-gray-800 border-gray-700 text-gray-100'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="all">All Units</option>
                      {units.map(unit => (
                        <option key={unit.id} value={unit.nama_unit}>{unit.nama_unit}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => {
                      fetchData(1);
                      fetchStats();
                    }}
                    className={`p-3 rounded-xl transition-all duration-200 ${
                      theme === 'dark'
                        ? 'hover:bg-gray-700 text-gray-300'
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                    title="Refresh"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </>
              )}
              
              {/* Bulk delete for maker view */}
              {activeTab === 'maker' && selectedRows.length > 0 && isMaker && (
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
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Pending: <span className="font-bold">{stats.pending}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Level 1: <span className="font-bold">{stats.approved_level1}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Level 2: <span className="font-bold">{stats.approved_level2}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Final: <span className="font-bold">{stats.approved_final}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Rejected: <span className="font-bold">{stats.rejected}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

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
              Loading AU-58...
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className={tableHeaderClass}>
                  <tr>
                    {/* Checkbox column - only for maker view */}
                    {activeTab === 'maker' && isMaker && (
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
                    )}
                    
                    {/* Main columns */}
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
                        onClick={() => handleSort('banyaknya_diminta')}
                        className="flex items-center gap-2 hover:text-blue-500 transition-colors"
                      >
                        Jumlah
                        {sortField === 'banyaknya_diminta' ? (
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
                      Approval Status
                    </th>
                    
                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Current Level
                    </th>
                    
                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Created By
                    </th>
                    
                    <th className="px-6 py-4 text-center text-sm font-semibold w-48">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {items.length > 0 ? (
                    items.map((item, index) => (
                      <tr key={`${item.id}-${index}`} className={`transition-all duration-200 hover:scale-[1.002] ${tableRowClass(index)}`}>
                        {/* Checkbox column - only for maker view */}
                        {activeTab === 'maker' && isMaker && (
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedRows.includes(item.id)}
                              onChange={() => toggleRowSelection(item.id)}
                              disabled={item.approval_status !== 'pending'}
                              className={`rounded ${
                                theme === 'dark' 
                                  ? 'bg-gray-700 border-gray-600 checked:bg-blue-500 focus:ring-blue-500' 
                                  : 'border-gray-300 checked:bg-blue-600 focus:ring-blue-500'
                              } focus:ring-2 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed`}
                            />
                          </td>
                        )}
                        
                        <td className="px-6 py-4 font-medium">
                          {item.nomor_manual}
                        </td>
                        
                        <td className="px-6 py-4">
                          {new Date(item.tanggal).toLocaleDateString()}
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
                          {item.banyaknya_diminta}
                        </td>
                        
                        <td className="px-6 py-4">
                          {item.satuan}
                        </td>
                        
                        <td className="px-6 py-4">
                          <StatusBadge 
                            status={item.status} 
                            approval_status={item.approval_status} 
                          />
                        </td>
                        
                        <td className="px-6 py-4">
                          {item.current_approval_level === 0 && 'Waiting Level 1'}
                          {item.current_approval_level === 1 && 'Waiting Level 2'}
                          {item.current_approval_level === 2 && 'Waiting Final'}
                          {item.current_approval_level === 3 && 'Completed'}
                          {item.approval_status === 'rejected' && 'Rejected'}
                        </td>
                        
                        <td className="px-6 py-4">
                          {item.created_by_name || item.created_by}
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            {/* View History Button - Available for all */}
                            <button
                              onClick={() => openHistoryModal(item)}
                              className={`p-2 rounded-lg transition-all duration-200 hover:scale-105 ${
                                theme === 'dark'
                                  ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                              }`}
                              title="View Approval History"
                            >
                              <Clock className="w-5 h-5" />
                            </button>

                            {/* Edit Button - Only for Maker and pending items */}
                            {isMaker && canEdit(item) && (
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
                            )}

                            {/* Delete Button - Only for Maker and pending items */}
                            {isMaker && canDelete(item) && (
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
                            )}

                            {/* Approve Button - For approvers */}
                            {isApprover && canApprove(item) && (
                              <button
                                onClick={() => openApprovalModal(item, 'approve')}
                                className={`p-2 rounded-lg transition-all duration-200 hover:scale-105 ${
                                  theme === 'dark'
                                    ? 'text-green-400 hover:bg-green-900/30 hover:text-green-300'
                                    : 'text-green-600 hover:bg-green-50 hover:text-green-800'
                                }`}
                                title="Approve"
                              >
                                <ThumbsUp className="w-5 h-5" />
                              </button>
                            )}

                            {/* Reject Button - For approvers */}
                            {isApprover && canReject(item) && (
                              <button
                                onClick={() => openApprovalModal(item, 'reject')}
                                className={`p-2 rounded-lg transition-all duration-200 hover:scale-105 ${
                                  theme === 'dark'
                                    ? 'text-red-400 hover:bg-red-900/30 hover:text-red-300'
                                    : 'text-red-600 hover:bg-red-50 hover:text-red-800'
                                }`}
                                title="Reject"
                              >
                                <ThumbsDown className="w-5 h-5" />
                              </button>
                            )}

                            {/* View Only - For approved/rejected items */}
                            {!canEdit(item) && !canDelete(item) && !canApprove(item) && !canReject(item) && (
                              <span className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                <Eye className="w-5 h-5" />
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={activeTab === 'maker' && isMaker ? 14 : 13} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <FileText className={`w-12 h-12 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'} mb-4`} />
                          <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                            No AU-58 found
                          </h3>
                          <p className={`mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            {searchTerm 
                              ? 'Try adjusting your search terms' 
                              : activeTab === 'approval' 
                                ? 'No pending approvals at this time'
                                : 'Get started by creating your first AU-58'
                            }
                          </p>
                          {!searchTerm && isMaker && activeTab === 'maker' && (
                            <button
                              onClick={() => openModal()}
                              className="mt-4 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                            >
                              Create First AU-58
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
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

      {/* Create/Edit Modal - Only for Maker */}
      {isModalOpen && isMaker && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className={`${cardClass} rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border transform transition-all duration-300 scale-100`}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-inherit z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                  }`}>
                    <FileText className={`w-6 h-6 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  <h2 className="text-xl font-bold">
                    {editingId ? 'Edit' : 'Create New'} AU-58
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
                
                {/* Nomor Manual */}
                <div className="space-y-2">
                  <label className={`block text-sm font-semibold ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Nomor Manual *
                  </label>
                  <input
                    type="text"
                    {...register("nomor_manual")}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                    placeholder="Enter Nomor Manual"
                  />
                  {errors.nomor_manual && (
                    <p className="text-sm text-red-500 mt-1 animate-shake">{errors.nomor_manual.message}</p>
                  )}
                </div>

                {/* Tanggal */}
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
                  />
                  {errors.tanggal && (
                    <p className="text-sm text-red-500 mt-1 animate-shake">{errors.tanggal.message}</p>
                  )}
                </div>

                {/* Unit */}
                <div className="space-y-2">
                  <label className={`block text-sm font-semibold ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Unit *
                  </label>
                  <select
                    {...register("unit")}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                  >
                    <option value="">Select Unit</option>
                    {units.map(unit => (
                      <option key={unit.id} value={unit.nama_unit}>{unit.nama_unit}</option>
                    ))}
                  </select>
                  {errors.unit && (
                    <p className="text-sm text-red-500 mt-1 animate-shake">{errors.unit.message}</p>
                  )}
                </div>

                {/* Bagian */}
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
                    {bagian.map(b => (
                      <option key={b.id} value={b.nama_bagian}>{b.nama_bagian}</option>
                    ))}
                  </select>
                  {errors.bagian && (
                    <p className="text-sm text-red-500 mt-1 animate-shake">{errors.bagian.message}</p>
                  )}
                </div>
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

 
                {/* Tahun Tanam */}
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
                  />
                </div>

                {/* Nomor Blok */}
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
                </div>

                {/* Luas Ha */}
                <div className="space-y-2">
                  <label className={`block text-sm font-semibold ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Luas Ha
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register("luas_ha")}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                    placeholder="Enter Luas Ha"
                  />
                </div>

                {/* Jumlah Pokok */}
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
                  />
                </div>

                {/* Dosis Cc Ha */}
                <div className="space-y-2">
                  <label className={`block text-sm font-semibold ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Dosis Cc Ha
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register("dosis_cc_ha")}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                    placeholder="Enter Dosis Cc Ha"
                  />
                </div>

                {/* Banyaknya Diminta */}
                <div className="space-y-2">
                  <label className={`block text-sm font-semibold ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Banyaknya Diminta *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register("banyaknya_diminta")}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                    placeholder="Enter Jumlah Diminta"
                  />
                  {errors.banyaknya_diminta && (
                    <p className="text-sm text-red-500 mt-1 animate-shake">{errors.banyaknya_diminta.message}</p>
                  )}
                </div>

                {/* Banyaknya Dikeluarkan */}
                <div className="space-y-2">
                  <label className={`block text-sm font-semibold ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Banyaknya Dikeluarkan
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register("banyaknya_dikeluarkan")}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                    placeholder="Enter Jumlah Dikeluarkan"
                  />
                </div>

                {/* Harga Satuan */}
                <div className="space-y-2">
                  <label className={`block text-sm font-semibold ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Harga Satuan
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register("harga_satuan")}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                    placeholder="Enter Harga Satuan"
                  />
                </div>

                {/* Jumlah */}
                <div className="space-y-2">
                  <label className={`block text-sm font-semibold ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Jumlah
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register("jumlah")}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                    placeholder="Enter Jumlah"
                  />
                </div>

                {/* No Rekg */}
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
                </div>

                {/* Sisa Setelah Dibukukan */}
                <div className="space-y-2">
                  <label className={`block text-sm font-semibold ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Sisa Setelah Dibukukan
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register("sisa_setelah_dibukukan")}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                    placeholder="Enter Sisa"
                  />
                </div>

                {/* Barang Untuk Kegiatan */}
                <div className="space-y-2 md:col-span-2">
                  <label className={`block text-sm font-semibold ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Barang Untuk Kegiatan *
                  </label>
                  <input
                    type="text"
                    {...register("barang_untuk_kegiatan")}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                    placeholder="Enter Kegiatan"
                  />
                  {errors.barang_untuk_kegiatan && (
                    <p className="text-sm text-red-500 mt-1 animate-shake">{errors.barang_untuk_kegiatan.message}</p>
                  )}
                </div>

                {/* Dikirim Kepada */}
                <div className="space-y-2">
                  <label className={`block text-sm font-semibold ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Dikirim Kepada
                  </label>
                  <input
                    type="text"
                    {...register("dikirim_kepada")}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${inputClass}`}
                    placeholder="Enter Penerima"
                  />
                </div>

                {/* Kode Gudang Pengirim */}
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
                    placeholder="Enter Kode Gudang"
                  />
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

      {/* Approval Modal */}
      {selectedApprovalItem && (
        <ApprovalModal
          isOpen={isApprovalModalOpen}
          onClose={closeApprovalModal}
          onConfirm={handleApproval}
          item={selectedApprovalItem}
          action={approvalAction}
          level={approvalLevel}
          theme={theme}
          loading={approvalLoading}
        />
      )}

      {/* History Modal */}
      {selectedApprovalItem && (
        <HistoryModal
          isOpen={isHistoryModalOpen}
          onClose={closeHistoryModal}
          item={selectedApprovalItem}
          history={approvalHistory}
          theme={theme}
          loading={historyLoading}
        />
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
