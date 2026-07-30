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
        // Verificar si hay sesión local persistida por bypass primero
        const savedSession = localStorage.getItem('controlepp_session');
        if (savedSession) {
          const { user: u, profile: p } = JSON.parse(savedSession);
          setUser(u);
          setProfile(p);
          setLoading(false);
          return;
        }

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

    // 2. Suscribirse a cambios en el estado de autenticación (para sesiones reales de Supabase Auth)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Ignorar cambios si hay bypass activo
      if (localStorage.getItem('controlepp_session')) {
        return;
      }

      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        if (pathname && pathname.startsWith('/admin')) {
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
        // En caso de que no exista el registro aún, intentamos reintentar en 1.5s
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
      console.error('Error fetching user profile:', err);
    }
  };

  const login = async (email: string, contrasenia: string) => {
    const cleanEmail = email.trim().toLowerCase();
    
    try {
      // 1. Intentar iniciar sesión real con Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: contrasenia,
      });

      if (error) {
        // Si falla Supabase, ver si son las credenciales correctas del admin para hacer bypass local
        if (
          (cleanEmail === 'jarae' || cleanEmail === 'jarae@escaleras.com') &&
          contrasenia === 'Bera2026'
        ) {
          return triggerBypassLogin();
        }
        throw error;
      }

      if (data.user) {
        setUser(data.user);
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
          if (retryData) {
            setProfile(retryData);
            localStorage.setItem('controlepp_session', JSON.stringify({ user: data.user, profile: retryData }));
          }
        } else {
          setProfile(profileData);
          localStorage.setItem('controlepp_session', JSON.stringify({ user: data.user, profile: profileData }));
        }
      }
      return { error: null };
    } catch (err: any) {
      // Si tira error de conexión, proveedor deshabilitado u otro, y es el admin, usar bypass
      if (
        (cleanEmail === 'jarae' || cleanEmail === 'jarae@escaleras.com') &&
        contrasenia === 'Bera2026'
      ) {
        return triggerBypassLogin();
      }
      return { error: err.message || 'Error de autenticación' };
    }
  };

  // Login de emergencia bypass para Administrador Jarae
  const triggerBypassLogin = () => {
    const mockUser = {
      id: '00000000-0000-0000-0000-000000000000',
      email: 'jarae@escaleras.com',
      user_metadata: { nombre: 'Administrador Jarae' }
    };
    const mockProfile: Usuario = {
      id: '00000000-0000-0000-0000-000000000000',
      nombre: 'Administrador Jarae',
      email: 'jarae@escaleras.com',
      rol: 'administrador',
      activo: true,
      created_at: new Date().toISOString()
    };
    setUser(mockUser);
    setProfile(mockProfile);
    localStorage.setItem('controlepp_session', JSON.stringify({ user: mockUser, profile: mockProfile }));
    return { error: null };
  };

  const logout = async () => {
    setLoading(true);
    localStorage.removeItem('controlepp_session');
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Supabase signout failed, clearing local session anyway');
    }
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
