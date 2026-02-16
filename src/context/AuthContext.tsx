'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

// Types
interface User {
  id: string;
  username: string;
  email: string;
  role_id?: string;
  role?: string;
  jabatan?: string | null;
  unit?: string | null;
  status?: string;
  created_at?: string | null;
  [key: string]: any;
}

interface LoginCredentials {
  username: string;
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

interface ValidateResponse {
  status: string;
  message: string;
  valid: boolean;
  user?: User;
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
  validateToken: (force?: boolean) => Promise<boolean>;
  getProfile: () => Promise<User>;
  updateProfile: (data: Partial<User> & { password?: string; confirm_password?: string }) => Promise<User>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Helper untuk mendapatkan bearer token
const getBearerToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token');
  }
  return null;
};

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

// Create axios instance for auth
const createAuthApi = () => {
  const instance = axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor untuk menambahkan bearer token
  instance.interceptors.request.use(
    (config) => {
      const token = getBearerToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  return instance;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const [isValidating, setIsValidating] = useState(false);
  const [lastValidation, setLastValidation] = useState<number>(0);
  
  const router = useRouter();
  
  // Buat instance authApi
  const [authApi] = useState(() => createAuthApi());

  // Fungsi untuk menyimpan auth data ke localStorage dan state
  const saveAuthData = useCallback((token: string, user: User) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem('last_validation', Date.now().toString());
    
    setAuthState({
      user,
      token,
      isAuthenticated: true,
      isLoading: false,
    });
    
    setLastValidation(Date.now());
  }, []);

  // Fungsi untuk membersihkan auth data
  const clearAuthData = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('last_validation');
    
    setAuthState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
    
    setLastValidation(0);
  }, []);

  // Fungsi validasi token dengan cache
  const validateToken = useCallback(async (force: boolean = false): Promise<boolean> => {
    // Prevent multiple simultaneous validations
    if (isValidating && !force) {
      return authState.isAuthenticated;
    }

    const token = getBearerToken();
    if (!token) {
      clearAuthData();
      return false;
    }

    try {
      setIsValidating(true);
      
      // Cek waktu validasi terakhir (cache 30 detik)
      const now = Date.now();
      const lastValidated = localStorage.getItem('last_validation');
      const lastValidationTime = lastValidated ? parseInt(lastValidated) : 0;
      
      // Jika sudah validasi dalam 30 detik terakhir dan tidak force, return cached result
      if (!force && now - lastValidationTime < 30000) {
        setIsValidating(false);
        return authState.isAuthenticated;
      }

      // Cek expire dari token JWT lokal terlebih dahulu
      const tokenData = decodeJWT(token);
      if (!tokenData || !tokenData.exp) {
        clearAuthData();
        setIsValidating(false);
        return false;
      }

      const tokenExp = tokenData.exp * 1000;
      
      // Jika token sudah expire
      if (now > tokenExp) {
        clearAuthData();
        setIsValidating(false);
        return false;
      }

      // Jika token hampir expire (kurang dari 5 menit) atau force, validasi ke server
      if (force || now > tokenExp - 5 * 60 * 1000) {
        const response = await authApi.post<ValidateResponse>('/validate', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.valid && response.data.user) {
          saveAuthData(token, response.data.user);
          setIsValidating(false);
          return true;
        } else {
          clearAuthData();
          setIsValidating(false);
          return false;
        }
      } else {
        // Token masih valid, update last validation time
        localStorage.setItem('last_validation', now.toString());
        setLastValidation(now);
        setIsValidating(false);
        return true;
      }
    } catch (error) {
      console.error('Token validation error:', error);
      clearAuthData();
      setIsValidating(false);
      return false;
    }
  }, [authApi, saveAuthData, clearAuthData, authState.isAuthenticated, isValidating]);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const userStr = localStorage.getItem('auth_user');
        
        if (token && userStr) {
          const user = JSON.parse(userStr);
          
          // Cek token expire dari JWT tanpa request ke server
          const tokenData = decodeJWT(token);
          if (tokenData && tokenData.exp) {
            const tokenExp = tokenData.exp * 1000;
            
            if (Date.now() < tokenExp) {
              // Token masih valid, set state
              setAuthState({
                user,
                token,
                isAuthenticated: true,
                isLoading: false,
              });
              setLastValidation(Date.now());
            } else {
              // Token expired, clear data
              clearAuthData();
            }
          } else {
            // Token invalid format, clear data
            clearAuthData();
          }
        } else {
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        clearAuthData();
      }
    };

    initAuth();
  }, [clearAuthData]);

  // Login function
  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      const response = await authApi.post<AuthResponse>('/login', credentials);
      
      if (response.data.status === 'success' && response.data.data.token && response.data.data.user) {
        const { token, user } = response.data.data;
        
        // Save auth data
        saveAuthData(token, user);
        
        // Redirect to dashboard
        router.push('/dashboard');
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error: any) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      
      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data;
        let errorMessage = 'Login failed';
        
        if (errorData?.errors) {
          errorMessage = Object.values(errorData.errors).flat().join(', ');
        } else if (errorData?.message) {
          errorMessage = errorData.message;
        }
        
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
      
      const response = await authApi.post<AuthResponse>('/register', data);
      
      if (response.data.status === 'success' && response.data.data.token && response.data.data.user) {
        const { token, user } = response.data.data;
        
        // Save auth data
        saveAuthData(token, user);
        
        // Redirect to dashboard
        router.push('/dashboard');
      } else {
        throw new Error(response.data.message || 'Registration failed');
      }
    } catch (error: any) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      
      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data;
        let errorMessage = 'Registration failed';
        
        if (errorData?.errors) {
          errorMessage = Object.values(errorData.errors).flat().join(', ');
        } else if (errorData?.message) {
          errorMessage = errorData.message;
        }
        
        throw new Error(errorMessage);
      } else {
        throw new Error('An unexpected error occurred');
      }
    }
  };

  // Logout function
  const logout = (): void => {
    clearAuthData();
    router.push('/login');
  };

  // Update user data
  const updateUser = (userData: Partial<User>): void => {
    if (authState.user) {
      const updatedUser = { ...authState.user, ...userData };
      localStorage.setItem('auth_user', JSON.stringify(updatedUser));
      setAuthState(prev => ({
        ...prev,
        user: updatedUser,
      }));
    }
  };

  // Check authentication
  const checkAuth = async (): Promise<boolean> => {
    return await validateToken(false); // Use cached validation
  };

  // Get user profile
  const getProfile = async (): Promise<User> => {
    try {
      const response = await authApi.get<{ status: string; data: User }>('/me');
      
      if (response.data.status === 'success') {
        updateUser(response.data.data);
        return response.data.data;
      } else {
        throw new Error('Failed to get profile');
      }
    } catch (error: any) {
      throw error;
    }
  };

  // Update user profile
  const updateProfile = async (data: Partial<User> & { password?: string; confirm_password?: string }): Promise<User> => {
    try {
      const response = await authApi.post<{ 
        status: string; 
        message: string; 
        data: User 
      }>('/updateProfile', data);
      
      if (response.data.status === 'success') {
        updateUser(response.data.data);
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to update profile');
      }
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data;
        let errorMessage = 'Failed to update profile';
        
        if (errorData?.errors) {
          errorMessage = Object.values(errorData.errors).flat().join(', ');
        } else if (errorData?.message) {
          errorMessage = errorData.message;
        }
        
        throw new Error(errorMessage);
      }
      throw error;
    }
  };

  const value: AuthContextType = {
    ...authState,
    login,
    logout,
    register,
    updateUser,
    checkAuth,
    validateToken,
    getProfile,
    updateProfile,
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