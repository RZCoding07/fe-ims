'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LoadingSpinner } from './loading-spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  redirectTo = '/login',
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);

  useEffect(() => {
    const checkAuth = async () => {
      // Jika masih loading, tunggu
      if (isLoading) return;

      // Jika tidak terautentikasi, redirect ke login
      if (!isAuthenticated) {
        router.push(`${redirectTo}?redirect=${encodeURIComponent(pathname)}`);
        return;
      }

      // Jika ada requiredRole, cek apakah user memiliki role yang sesuai
      if (requiredRole && user) {
        const userRole = user.role?.toLowerCase();
        const requiredRoles = Array.isArray(requiredRole)
          ? requiredRole.map(r => r.toLowerCase())
          : [requiredRole.toLowerCase()];

        if (!userRole || !requiredRoles.includes(userRole)) {
          // Redirect ke unauthorized page atau dashboard
          router.push('/unauthorized');
          return;
        }
      }

      // Jika semua cek lolos, set authorized
      setIsAuthorized(true);
    };

    checkAuth();
  }, [isAuthenticated, isLoading, user, requiredRole, router, pathname, redirectTo]);

  // Tampilkan loading spinner
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Tampilkan children jika authorized
  return isAuthorized ? <>{children}</> : null;
};

export default ProtectedRoute;