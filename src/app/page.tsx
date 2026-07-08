'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { RefreshCw } from 'lucide-react';

export default function Home() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/login');
      } else if (profile) {
        if (profile.rol === 'administrador') {
          router.replace('/admin/dashboard');
        } else {
          router.replace('/registro');
        }
      }
    }
  }, [user, profile, loading, router]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 min-h-screen">
      <RefreshCw className="h-10 w-10 animate-spin text-indigo-600" />
      <p className="mt-4 text-sm font-medium text-slate-500">Cargando aplicación...</p>
    </div>
  );
}
