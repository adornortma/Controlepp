'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { toast } from 'sonner';
import { ShieldCheck, Mail, Lock, RefreshCw } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login, profile, user, loading } = useAuth();
  const router = useRouter();

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (!loading && user && profile) {
      if (profile.rol === 'administrador') {
        router.replace('/admin/dashboard');
      } else {
        router.replace('/registro');
      }
    }
  }, [user, profile, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Por favor complete todos los campos');
      return;
    }

    setSubmitting(true);
    const { error } = await login(email.trim(), password);

    if (error) {
      toast.error(error);
      setSubmitting(false);
    } else {
      toast.success('Sesión iniciada correctamente');
      // La redirección ocurre automáticamente en el useEffect
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 min-h-screen">
        <RefreshCw className="h-10 w-10 animate-spin text-indigo-600" />
        <p className="mt-4 text-sm font-medium text-slate-500">Cargando aplicación...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-center px-6 py-12 bg-gradient-to-b from-indigo-50/50 to-white min-h-screen">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Isotipo/Logo */}
        <div className="mx-auto h-14 w-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Registro de Escaleras
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          Acceso exclusivo para líderes y administradores
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-slate-100 sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
                Correo Electrónico
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@empresa.com"
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm bg-white text-slate-900 transition duration-150"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                Contraseña
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm bg-white text-slate-900 transition duration-150"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 active:scale-[0.98] transition duration-150"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Iniciando sesión...
                  </span>
                ) : (
                  'Iniciar Sesión'
                )}
              </button>
            </div>
          </form>

          {/* Tips e información útil de acceso */}
          <div className="mt-6 border-t border-slate-100 pt-6">
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Credenciales de prueba:
              </h4>
              <p className="mt-1 text-xs text-slate-500">
                Puedes iniciar sesión registrando la cuenta admin semilla en tu Supabase Console con el email <strong className="text-indigo-600">admin@escaleras.com</strong> y la contraseña <strong className="text-indigo-600">Adornor</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
