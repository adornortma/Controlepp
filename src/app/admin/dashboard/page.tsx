'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { supabase, Registro, Foto } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  BarChart3,
  Users,
  HardHat,
  Calendar,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  ChevronRight,
  LogOut,
  RefreshCw,
  Eye,
  CalendarDays,
  FileText
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { user, profile, loading, logout } = useAuth();
  const router = useRouter();

  // Estados de carga y datos
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [registroSeleccionado, setRegistroSeleccionado] = useState<Registro | null>(null);
  const [actualizandoEstado, setActualizandoEstado] = useState(false);

  // Redirigir a login si no es administrador
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/login');
      } else if (profile && profile.rol !== 'administrador') {
        router.replace('/registro');
      }
    }
  }, [user, profile, loading, router]);

  // Cargar datos del dashboard
  const fetchRegistros = async () => {
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from('registros')
        .select(`
          *,
          usuarios ( nombre, email ),
          fotos ( id, tipo, url )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRegistros(data || []);
    } catch (err: any) {
      console.error('Error fetching registrations:', err);
      toast.error('Error al cargar los registros');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (profile && profile.rol === 'administrador') {
      fetchRegistros();
    }
  }, [profile]);

  if (loading || !profile || profile.rol !== 'administrador') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 min-h-screen">
        <RefreshCw className="h-10 w-10 animate-spin text-indigo-600" />
        <p className="mt-4 text-sm font-medium text-slate-500">Verificando credenciales de administrador...</p>
      </div>
    );
  }

  // Filtrado de registros
  const registrosFiltrados = registros.filter((reg) => {
    const matchEstado = filtroEstado === 'todos' || reg.estado === filtroEstado;
    const cleanTexto = filtroTexto.toLowerCase().trim();
    if (!cleanTexto) return matchEstado;

    const liderNombre = (reg.usuarios as any)?.nombre?.toLowerCase() || '';
    const liderEmail = (reg.usuarios as any)?.email?.toLowerCase() || '';
    const matchTexto =
      reg.tecnico_nombre.toLowerCase().includes(cleanTexto) ||
      reg.tecnico_legajo.toLowerCase().includes(cleanTexto) ||
      reg.numero_serie.toLowerCase().includes(cleanTexto) ||
      liderNombre.includes(cleanTexto) ||
      liderEmail.includes(cleanTexto) ||
      (reg.observaciones && reg.observaciones.toLowerCase().includes(cleanTexto));

    return matchEstado && matchTexto;
  });

  // Métricas
  const totalRegistros = registros.length;
  const pendientes = registros.filter((r) => r.estado === 'pendiente').length;
  const aprobados = registros.filter((r) => r.estado === 'aprobado').length;
  const observados = registros.filter((r) => r.estado === 'observado').length;

  // Agrupaciones para las métricas
  const registrosPorLider = registros.reduce((acc: Record<string, number>, reg) => {
    const nombre = (reg.usuarios as any)?.nombre || 'Desconocido';
    acc[nombre] = (acc[nombre] || 0) + 1;
    return acc;
  }, {});

  const registrosPorTecnico = registros.reduce((acc: Record<string, number>, reg) => {
    const nombre = reg.tecnico_nombre;
    acc[nombre] = (acc[nombre] || 0) + 1;
    return acc;
  }, {});

  const registrosPorFecha = registros.reduce((acc: Record<string, number>, reg) => {
    const fecha = new Date(reg.created_at).toLocaleDateString('es-AR');
    acc[fecha] = (acc[fecha] || 0) + 1;
    return acc;
  }, {});

  // Actualizar estado del registro
  const cambiarEstado = async (registroId: string, nuevoEstado: 'pendiente' | 'aprobado' | 'observado') => {
    setActualizandoEstado(true);
    try {
      const { error } = await supabase
        .from('registros')
        .update({ estado: nuevoEstado })
        .eq('id', registroId);

      if (error) throw error;

      // Actualizar estado local
      setRegistros((prev) =>
        prev.map((r) => (r.id === registroId ? { ...r, estado: nuevoEstado } : r))
      );
      if (registroSeleccionado && registroSeleccionado.id === registroId) {
        setRegistroSeleccionado((prev) => prev ? { ...prev, estado: nuevoEstado } : null);
      }
      toast.success(`Estado actualizado a ${nuevoEstado.toUpperCase()}`);
    } catch (err: any) {
      console.error('Error updating status:', err);
      toast.error('Error al actualizar el estado del registro');
    } finally {
      setActualizandoEstado(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      {/* Header Fijo */}
      <header className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 leading-tight">Panel de Control</h1>
            <p className="text-xs text-slate-500 font-medium">Administración General • {profile.nombre}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchRegistros}
            className="p-2.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 active:scale-95 transition"
            title="Recargar datos"
          >
            <RefreshCw className={`h-5 w-5 ${cargando ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={logout}
            className="p-2.5 text-slate-400 hover:text-red-500 rounded-xl hover:bg-slate-50 active:scale-95 transition"
            title="Cerrar sesión"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Grid de Contenedores y Métricas */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col gap-6">
        {/* Fila de Tarjetas de Métricas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Registros Totales</span>
              <span className="text-3xl font-extrabold text-slate-900 mt-1 block">{totalRegistros}</span>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <FileText className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Pendientes</span>
              <span className="text-3xl font-extrabold text-amber-500 mt-1 block">{pendientes}</span>
            </div>
            <div className="p-3 bg-amber-50 text-amber-500 rounded-xl">
              <Clock className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Aprobados</span>
              <span className="text-3xl font-extrabold text-emerald-500 mt-1 block">{aprobados}</span>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-500 rounded-xl">
              <CheckCircle className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Observados</span>
              <span className="text-3xl font-extrabold text-red-500 mt-1 block">{observados}</span>
            </div>
            <div className="p-3 bg-red-50 text-red-500 rounded-xl">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Paneles de Datos Secundarios (Líderes, Técnicos, Fechas) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Registros por Líder */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-indigo-500" /> Registros por Líder
            </h3>
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
              {Object.keys(registrosPorLider).length === 0 ? (
                <p className="text-slate-400 text-xs text-center py-4">Sin datos registrados</p>
              ) : (
                Object.entries(registrosPorLider).map(([nombre, cantidad]) => (
                  <div key={nombre} className="flex justify-between items-center text-sm py-1.5 border-b border-slate-50 last:border-0">
                    <span className="text-slate-600 truncate max-w-[180px]">{nombre}</span>
                    <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full text-xs">
                      {cantidad}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Registros por Técnico */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 mb-3">
              <HardHat className="h-4 w-4 text-indigo-500" /> Registros por Técnico
            </h3>
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
              {Object.keys(registrosPorTecnico).length === 0 ? (
                <p className="text-slate-400 text-xs text-center py-4">Sin datos registrados</p>
              ) : (
                Object.entries(registrosPorTecnico).map(([nombre, cantidad]) => (
                  <div key={nombre} className="flex justify-between items-center text-sm py-1.5 border-b border-slate-50 last:border-0">
                    <span className="text-slate-600 truncate max-w-[180px]">{nombre}</span>
                    <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full text-xs">
                      {cantidad}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Registros por Fecha */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 mb-3">
              <CalendarDays className="h-4 w-4 text-indigo-500" /> Registros por Fecha
            </h3>
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
              {Object.keys(registrosPorFecha).length === 0 ? (
                <p className="text-slate-400 text-xs text-center py-4">Sin datos registrados</p>
              ) : (
                Object.entries(registrosPorFecha).map(([fecha, cantidad]) => (
                  <div key={fecha} className="flex justify-between items-center text-sm py-1.5 border-b border-slate-50 last:border-0">
                    <span className="text-slate-600">{fecha}</span>
                    <span className="font-bold text-slate-900 bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full text-xs">
                      {cantidad}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Listado Principal de Registros */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex-1 flex flex-col min-h-[400px]">
          {/* Barra de Filtros y Búsqueda */}
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:max-w-md">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Buscar técnico, legajo, serie, líder..."
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition shadow-inner"
              />
            </div>

            <div className="flex gap-2 w-full md:w-auto shrink-0 justify-end">
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/25"
              >
                <option value="todos">Todos los Estados</option>
                <option value="pendiente">Pendientes</option>
                <option value="aprobado">Aprobados</option>
                <option value="observado">Observados</option>
              </select>
            </div>
          </div>

          {/* Tabla de Registros */}
          <div className="flex-1 overflow-x-auto">
            {cargando ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
                <p className="text-sm font-medium">Cargando registros...</p>
              </div>
            ) : registrosFiltrados.length === 0 ? (
              <div className="text-center py-20 text-slate-400 text-sm">
                No se encontraron registros que coincidan con la búsqueda.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-6">Técnico</th>
                    <th className="py-3 px-6">Líder</th>
                    <th className="py-3 px-6">Fecha / Hora</th>
                    <th className="py-3 px-6">N° Serie</th>
                    <th className="py-3 px-6">Fotografías</th>
                    <th className="py-3 px-6">Estado</th>
                    <th className="py-3 px-6 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {registrosFiltrados.map((reg) => {
                    const cantFotos = reg.fotos?.length || 0;
                    return (
                      <tr key={reg.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-4 px-6">
                          <span className="font-bold text-slate-950 block">{reg.tecnico_nombre}</span>
                          <span className="text-xs text-slate-500 font-mono">Legajo: {reg.tecnico_legajo}</span>
                        </td>
                        <td className="py-4 px-6 text-slate-600">
                          {(reg.usuarios as any)?.nombre}
                        </td>
                        <td className="py-4 px-6 text-slate-600">
                          <span className="block">
                            {new Date(reg.created_at).toLocaleDateString('es-AR')}
                          </span>
                          <span className="text-xs text-slate-400">
                            {new Date(reg.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
                          </span>
                        </td>
                        <td className="py-4 px-6 font-mono font-semibold text-slate-700">
                          {reg.numero_serie}
                        </td>
                        <td className="py-4 px-6">
                          <span className="bg-slate-100 text-slate-800 text-xs px-2.5 py-1 rounded-full font-bold">
                            {cantFotos} fotos
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          {reg.estado === 'pendiente' && (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                              <Clock className="h-3 w-3" /> Pendiente
                            </span>
                          )}
                          {reg.estado === 'aprobado' && (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                              <CheckCircle className="h-3 w-3" /> Aprobado
                            </span>
                          )}
                          {reg.estado === 'observado' && (
                            <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                              <AlertTriangle className="h-3 w-3" /> Observado
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <button
                            onClick={() => setRegistroSeleccionado(reg)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100/75 px-3 py-1.5 rounded-xl transition active:scale-95"
                          >
                            <Eye className="h-3.5 w-3.5" /> Revisar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* Modal / Sidebar de Detalle de Registro */}
      {registroSeleccionado && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
            {/* Header del Modal */}
            <div className="bg-slate-900 px-6 py-5 flex items-center justify-between text-white">
              <div>
                <h3 className="text-lg font-bold">Detalle del Registro</h3>
                <p className="text-xs text-slate-400 mt-0.5">ID: {registroSeleccionado.id}</p>
              </div>
              <button
                onClick={() => setRegistroSeleccionado(null)}
                className="text-slate-400 hover:text-white text-sm font-bold bg-white/10 hover:bg-white/20 p-2 rounded-full h-8 w-8 flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Columna Izquierda: Detalles del Registro */}
              <div className="lg:col-span-4 flex flex-col gap-5">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-3">
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Técnico</h4>
                    <p className="text-base font-extrabold text-slate-950 mt-0.5">
                      {registroSeleccionado.tecnico_nombre}
                    </p>
                    <p className="text-xs font-mono text-slate-500">Legajo: {registroSeleccionado.tecnico_legajo}</p>
                  </div>
                  <hr className="border-slate-100" />
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Líder que Registró</h4>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">
                      {(registroSeleccionado.usuarios as any)?.nombre}
                    </p>
                    <p className="text-xs text-slate-500">{(registroSeleccionado.usuarios as any)?.email}</p>
                  </div>
                  <hr className="border-slate-100" />
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Número de Serie</h4>
                    <p className="text-sm font-mono font-bold text-indigo-700 mt-0.5">
                      {registroSeleccionado.numero_serie}
                    </p>
                  </div>
                  <hr className="border-slate-100" />
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha y Hora</h4>
                    <p className="text-xs text-slate-700 mt-0.5">
                      {new Date(registroSeleccionado.created_at).toLocaleDateString('es-AR')} a las {new Date(registroSeleccionado.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
                    </p>
                  </div>
                  {registroSeleccionado.observaciones && (
                    <>
                      <hr className="border-slate-100" />
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Observaciones</h4>
                        <p className="text-xs text-slate-600 mt-1 italic bg-white p-2 rounded-lg border border-slate-200/50 leading-relaxed">
                          "{registroSeleccionado.observaciones}"
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Controles de Estado de Aprobación */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Administrar Estado
                  </h4>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => cambiarEstado(registroSeleccionado.id, 'aprobado')}
                      disabled={actualizandoEstado}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition active:scale-98 ${
                        registroSeleccionado.estado === 'aprobado'
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/10'
                          : 'bg-white border-slate-200 text-emerald-600 hover:bg-emerald-50'
                      }`}
                    >
                      <CheckCircle className="h-4 w-4" /> Aprobar Registro
                    </button>

                    <button
                      onClick={() => cambiarEstado(registroSeleccionado.id, 'observado')}
                      disabled={actualizandoEstado}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition active:scale-98 ${
                        registroSeleccionado.estado === 'observado'
                          ? 'bg-red-600 border-red-600 text-white shadow-md shadow-red-600/10'
                          : 'bg-white border-slate-200 text-red-600 hover:bg-red-50'
                      }`}
                    >
                      <AlertTriangle className="h-4 w-4" /> Observar / Rechazar
                    </button>

                    <button
                      onClick={() => cambiarEstado(registroSeleccionado.id, 'pendiente')}
                      disabled={actualizandoEstado}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition active:scale-98 ${
                        registroSeleccionado.estado === 'pendiente'
                          ? 'bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-500/10'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Clock className="h-4 w-4" /> Dejar Pendiente
                    </button>
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Fotos del Registro */}
              <div className="lg:col-span-8 flex flex-col gap-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Fotografías de Evidencia ({registroSeleccionado.fotos?.length || 0})
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {registroSeleccionado.fotos?.map((foto: Foto) => (
                    <div key={foto.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow flex flex-col relative aspect-[3/4]">
                      <span className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-wider border border-white/10 z-10">
                        {foto.tipo === 'advertencia' ? 'Advertencia Colocada' : foto.tipo === 'numero_serie' ? 'Número de Serie' : 'Escalera Completa'}
                      </span>
                      <a
                        href={foto.url}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute top-3 right-3 bg-black/60 hover:bg-white hover:text-black text-white p-2 rounded-full border border-white/10 z-10 transition active:scale-95"
                        title="Ver en pantalla completa"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      <img
                        src={foto.url}
                        alt={`Foto tipo ${foto.tipo}`}
                        className="w-full h-full object-cover select-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

