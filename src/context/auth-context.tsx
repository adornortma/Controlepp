'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase, Usuario } from '@/lib/supabase';

interface AuthContextType {
  user: any | null;
  profile: Usuario | null;
  loading: boolean;
  login: (email: string, contrasenia: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  login: async () => ({ error: 'Not initialized' }),
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 1. Obtener sesión activa inicial
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error('Error fetching session:', err);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // 2. Suscribirse a cambios en el estado de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        if (pathname !== '/login') {
          router.push('/login');
        }
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // En caso de que no exista el registro aún, intentamos reintentar en 1.5s (por el trigger de creación)
        console.warn('Profile not found, retrying...');
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const { data: retryData, error: retryError } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', userId)
          .single();

        if (retryError) throw retryError;
        setProfile(retryData);
      } else {
        setProfile(data);
      }
    } catch (err: any) {
      console.error('Error fetching user profile:', {
        message: err.message,
        details: err.details,
        code: err.code,
        error: err
      });
    }
  };


  const login = async (email: string, contrasenia: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: contrasenia,
      });

      if (error) throw error;

      if (data.user) {
        setUser(data.user);
        // Obtener el perfil inmediatamente
        const { data: profileData, error: profileErr } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', data.user.id)
          .single();
        
        if (profileErr) {
          console.warn('Profile sync delay...');
          await new Promise((resolve) => setTimeout(resolve, 1500));
          const { data: retryData } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id', data.user.id)
            .single();
          if (retryData) setProfile(retryData);
        } else {
          setProfile(profileData);
        }
      }
      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Error de autenticación' };
    }
  };

  const logout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    router.push('/login');
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
