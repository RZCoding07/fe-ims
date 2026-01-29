'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

// Types
interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  role?: string;
  jabatan?: string;
  unit?: string;
  status?: string;
  [key: string]: any;
}

// Update LoginCredentials untuk menerima username
interface LoginCredentials {
  username: string; // Bisa username atau email
  password: string;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  confirm_password: string;
  jabatan?: string;
  unit?: string;
  role_id?: string;
}

interface AuthResponse {
  status: string;
  message: string;
  data: {
    token: string;
    user: User;
    expiresIn?: number;
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  register: (data: RegisterData) => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  checkAuth: () => Promise<boolean>;
  validateToken: () => Promise<boolean>;
}

// Create context with default values
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// API configuration
const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Axios instance for auth
const authApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor untuk menambahkan token
authApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
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
authApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token dari localStorage
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      // Reload page untuk trigger auth check 
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const router = useRouter();

  // Initialize auth state dari localStorage dan validasi token
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const userStr = localStorage.getItem('auth_user');
        
        if (token && userStr) {
          const user = JSON.parse(userStr);
          
          // Validasi token dengan backend
          try {
            await validateToken();
            
            setAuthState({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
            });
          } catch (error) {
            // Token invalid
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            setAuthState({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        } else {
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setAuthState({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    };

    initAuth();
  }, []);

  // Fungsi validasi token
  const validateToken = async (): Promise<boolean> => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return false;

      const response = await authApi.post('/auth/validate');
      if (response.data.valid && response.data.user) {
        // Update user data dari server
        localStorage.setItem('auth_user', JSON.stringify(response.data.user));
        setAuthState(prev => ({
          ...prev,
          user: response.data.user,
          isAuthenticated: true,
        }));
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  // Login function
  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      const response = await authApi.post<AuthResponse>('/auth/login', credentials);
      
      if (response.data.status === 'success' && response.data.data.token && response.data.data.user) {
        const { token, user } = response.data.data;
        
        // Save to localStorage
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_user', JSON.stringify(user));
        
        // Update state
        setAuthState({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
        
        // Redirect to dashboard or home
        router.push('/dashboard');
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error: any) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.message || 'Login failed';
        throw new Error(errorMessage);
      } else {
        throw new Error('An unexpected error occurred');
      }
    }
  };

  // Register function
  const register = async (data: RegisterData): Promise<void> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      const response = await authApi.post<AuthResponse>('/auth/register', data);
      
      if (response.data.status === 'success' && response.data.data.token && response.data.data.user) {
        const { token, user } = response.data.data;
        
        // Save to localStorage
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_user', JSON.stringify(user));
        
        // Update state
        setAuthState({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
        
        // Redirect to dashboard
        router.push('/dashboard');
      } else {
        throw new Error(response.data.message || 'Registration failed');
      }
    } catch (error: any) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.message || 
                           error.response?.data?.errors ? 
                           Object.values(error.response.data.errors).join(', ') : 
                           'Registration failed';
        throw new Error(errorMessage);
      } else {
        throw new Error('An unexpected error occurred');
      }
    }
  };

  // Logout function
  const logout = (): void => {
    // Clear localStorage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    
    // Reset state
    setAuthState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
    
    // Optionally call backend logout
    try {
      authApi.post('/auth/logout');
    } catch (error) {
      // Ignore errors on logout
    }
    
    // Redirect to login
    router.push('/login');
  };

  // Update user data
  const updateUser = (userData: Partial<User>): void => {
    if (authState.user) {
      const updatedUser = { ...authState.user, ...userData };
      
      // Update localStorage
      localStorage.setItem('auth_user', JSON.stringify(updatedUser));
      
      // Update state
      setAuthState(prev => ({
        ...prev,
        user: updatedUser,
      }));
    }
  };

  // Check authentication (simple check)
  const checkAuth = async (): Promise<boolean> => {
    const token = localStorage.getItem('auth_token');
    const userStr = localStorage.getItem('auth_user');
    return !!(token && userStr);
  };

  const value: AuthContextType = {
    ...authState,
    login,
    logout,
    register,
    updateUser,
    checkAuth,
    validateToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}