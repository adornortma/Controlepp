'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { 
  Plus, X, Briefcase, Calendar, MapPin, 
  Building2, Loader2, FolderKanban,
  FileText, Hammer, HardHat, Zap, Search, Filter
} from 'lucide-react';

interface Proyecto {
  id: string;
  sigest: string;
  titulo: string;
  fecha_cita: string;
  fecha_construido: string | null;
  ejecutado_por: 'Mantenimiento' | 'Obras' | 'TECO';
  direccion: string;
  central: string;
  created_at: string;
}

export default function ProyectosDashboard() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Estados para búsqueda y filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEjecutado, setFiltroEjecutado] = useState('Todos');

  // Form state
  const [formData, setFormData] = useState({
    sigest: '',
    titulo: '',
    fecha_cita: '',
    fecha_construido: '',
    ejecutado_por: 'Mantenimiento',
    direccion: '',
    central: ''
  });

  const fetchProyectos = async () => {
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from('proyectos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          toast.error('La tabla de proyectos no existe en la base de datos. Debes ejecutar el script SQL.');
        } else {
          throw error;
        }
      } else {
        setProyectos(data || []);
      }
    } catch (err: any) {
      console.error('Error fetching proyectos:', err);
      toast.error('Error al cargar el tablero de proyectos');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchProyectos();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);

    try {
      if (!formData.sigest || !formData.titulo || !formData.fecha_cita || !formData.direccion || !formData.central) {
        toast.error('Por favor complete todos los campos obligatorios');
        setGuardando(false);
        return;
      }

      const payload = {
        sigest: formData.sigest,
        titulo: formData.titulo,
        fecha_cita: formData.fecha_cita,
        fecha_construido: formData.fecha_construido ? formData.fecha_construido : null,
        ejecutado_por: formData.ejecutado_por,
        direccion: formData.direccion,
        central: formData.central
      };

      const { error } = await supabase
        .from('proyectos')
        .insert([payload]);

      if (error) throw error;

      toast.success('Proyecto registrado exitosamente');
      setIsModalOpen(false);
      
      setFormData({
        sigest: '',
        titulo: '',
        fecha_cita: '',
        fecha_construido: '',
        ejecutado_por: 'Mantenimiento',
        direccion: '',
        central: ''
      });

      fetchProyectos();
    } catch (err: any) {
      console.error('Error guardando proyecto:', err);
      toast.error('Ocurrió un error al guardar el proyecto');
    } finally {
      setGuardando(false);
    }
  };

  // Lógica de filtrado y búsqueda
  const proyectosFiltrados = proyectos.filter(proyecto => {
    // Filtrar por término de búsqueda (SIGEST, Título, Dirección, Central)
    const termino = searchTerm.toLowerCase();
    const coincideBusqueda = 
      proyecto.sigest.toLowerCase().includes(termino) ||
      proyecto.titulo.toLowerCase().includes(termino) ||
      proyecto.direccion.toLowerCase().includes(termino) ||
      proyecto.central.toLowerCase().includes(termino);
      
    // Filtrar por Ejecutado Por
    const coincideEjecutado = filtroEjecutado === 'Todos' || proyecto.ejecutado_por === filtroEjecutado;

    return coincideBusqueda && coincideEjecutado;
  });

  // Indicadores calculados sobre el TOTAL (sin importar filtros) para dar contexto general
  const totalProyectos = proyectos.length;
  const totalMantenimiento = proyectos.filter(p => p.ejecutado_por === 'Mantenimiento').length;
  const totalObras = proyectos.filter(p => p.ejecutado_por === 'Obras').length;
  const totalTeco = proyectos.filter(p => p.ejecutado_por === 'TECO').length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header Elegante */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <FolderKanban className="h-6 w-6 text-emerald-600" />
              Proyectos
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Seguimiento y evolución de proyectos
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-600 text-white px-5 py-2.5 rounded-lg font-semibold shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="h-5 w-5" />
            Nuevo proyecto
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
        
        {/* Tarjetas de Resumen */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {/* Card Total */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-slate-100 p-2 rounded-lg text-slate-500">
                <FileText className="h-5 w-5" />
              </div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total</h3>
            </div>
            <div className="text-3xl font-extrabold text-slate-800">
              {cargando ? '-' : totalProyectos}
            </div>
          </div>
          {/* Card Mantenimiento */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600">
                <Hammer className="h-5 w-5" />
              </div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mantenimiento</h3>
            </div>
            <div className="text-3xl font-extrabold text-slate-800">
              {cargando ? '-' : totalMantenimiento}
            </div>
          </div>
          {/* Card Obras */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                <HardHat className="h-5 w-5" />
              </div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Obras</h3>
            </div>
            <div className="text-3xl font-extrabold text-slate-800">
              {cargando ? '-' : totalObras}
            </div>
          </div>
          {/* Card TECO */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-purple-50 p-2 rounded-lg text-purple-600">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">TECO</h3>
            </div>
            <div className="text-3xl font-extrabold text-slate-800">
              {cargando ? '-' : totalTeco}
            </div>
          </div>
        </section>

        {/* Búsqueda, Filtros y Tablero Principal */}
        <section className="flex flex-col gap-4">
          
          {/* Barra de Búsqueda y Filtros */}
          <div className="flex flex-col sm:flex-row gap-4 mb-2">
            {/* Buscador de texto */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar por SIGEST, título, dirección o central..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-900 shadow-sm transition-colors"
              />
            </div>
            {/* Selector de Ejecutor */}
            <div className="relative sm:max-w-xs w-full">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Filter className="h-5 w-5 text-slate-400" />
              </div>
              <select
                value={filtroEjecutado}
                onChange={(e) => setFiltroEjecutado(e.target.value)}
                className="block w-full pl-10 pr-8 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-900 shadow-sm transition-colors cursor-pointer appearance-none"
              >
                <option value="Todos">Todos los ejecutores</option>
                <option value="Mantenimiento">Mantenimiento</option>
                <option value="Obras">Obras</option>
                <option value="TECO">TECO</option>
              </select>
            </div>
          </div>

          {cargando ? (
            <div className="flex flex-col items-center justify-center py-20 text-emerald-600 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <Loader2 className="h-10 w-10 animate-spin mb-4 text-emerald-500" />
              <p className="text-slate-500 font-medium">Cargando proyectos...</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                {proyectos.length === 0 ? (
                  <div className="text-center py-20 px-4">
                    <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-5 border border-slate-100">
                      <FolderKanban className="h-8 w-8 text-slate-300" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">No hay proyectos cargados todavía</h3>
                    <p className="text-slate-500 max-w-sm mx-auto mb-8 text-sm">
                      Creá el primer proyecto para comenzar a realizar el seguimiento de manera centralizada.
                    </p>
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-semibold shadow-sm hover:bg-emerald-700 active:scale-95 transition-all"
                    >
                      <Plus className="h-5 w-5" />
                      Nuevo proyecto
                    </button>
                  </div>
                ) : proyectosFiltrados.length === 0 ? (
                  <div className="text-center py-20 px-4">
                    <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-5 border border-slate-100">
                      <Search className="h-8 w-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">Sin resultados</h3>
                    <p className="text-slate-500 text-sm">
                      No se encontraron proyectos que coincidan con la búsqueda.
                    </p>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-slate-200 text-left">
                    <thead className="bg-slate-50/50">
                      <tr>
                        <th scope="col" className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                          Proyecto / SIGEST
                        </th>
                        <th scope="col" className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Título
                        </th>
                        <th scope="col" className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                          Fechas
                        </th>
                        <th scope="col" className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                          Ejecutado Por
                        </th>
                        <th scope="col" className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Dirección
                        </th>
                        <th scope="col" className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Central
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {proyectosFiltrados.map((proyecto) => (
                        <tr 
                          key={proyecto.id} 
                          className="hover:bg-slate-50/80 transition-colors duration-150 cursor-pointer group"
                        >
                          <td className="px-6 py-5 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-bold tracking-wide border border-slate-200 group-hover:border-slate-300 transition-colors">
                              {proyecto.sigest}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <div className="text-base font-bold text-slate-900 leading-tight">
                              {proyecto.titulo}
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="flex flex-col gap-1.5">
                              <div className="text-xs text-slate-600 flex items-center gap-1.5 font-medium" title="Fecha de cita">
                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                <span className="w-10 text-slate-400 font-normal">Cita:</span>
                                {proyecto.fecha_cita ? new Date(proyecto.fecha_cita + 'T00:00:00').toLocaleDateString() : '-'}
                              </div>
                              <div className="text-xs text-slate-600 flex items-center gap-1.5 font-medium" title="Fecha construido">
                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                <span className="w-10 text-slate-400 font-normal">Const:</span>
                                {proyecto.fecha_construido ? new Date(proyecto.fecha_construido + 'T00:00:00').toLocaleDateString() : '-'}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border
                              ${proyecto.ejecutado_por === 'Mantenimiento' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                                proyecto.ejecutado_por === 'Obras' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                                'bg-purple-50 text-purple-700 border-purple-200'}`}
                            >
                              {proyecto.ejecutado_por === 'Mantenimiento' && <Hammer className="h-3.5 w-3.5" />}
                              {proyecto.ejecutado_por === 'Obras' && <HardHat className="h-3.5 w-3.5" />}
                              {proyecto.ejecutado_por === 'TECO' && <Zap className="h-3.5 w-3.5" />}
                              {proyecto.ejecutado_por}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <div className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                              <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                              {proyecto.direccion}
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                              <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                              {proyecto.central}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </section>

      </main>

      {/* Modal / Formulario */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FolderKanban className="h-5 w-5 text-emerald-600" />
                Registrar Nuevo Proyecto
              </h2>
              <button 
                onClick={() => !guardando && setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 hover:bg-slate-200 p-2 rounded-full transition-colors"
                disabled={guardando}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* SIGEST */}
                <div className="md:col-span-1">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Proyecto / SIGEST *
                  </label>
                  <input
                    type="text"
                    name="sigest"
                    required
                    value={formData.sigest}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-900 transition-colors"
                  />
                </div>

                {/* Título */}
                <div className="md:col-span-1">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Título del Proyecto *
                  </label>
                  <input
                    type="text"
                    name="titulo"
                    required
                    value={formData.titulo}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-900 transition-colors"
                  />
                </div>

                {/* Ejecutado por */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Ejecutado por *
                  </label>
                  <select
                    name="ejecutado_por"
                    required
                    value={formData.ejecutado_por}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-900 transition-colors font-medium cursor-pointer"
                  >
                    <option value="Mantenimiento">Mantenimiento</option>
                    <option value="Obras">Obras</option>
                    <option value="TECO">TECO</option>
                  </select>
                </div>

                {/* Fecha Cita */}
                <div className="md:col-span-1">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Fecha de Cita *
                  </label>
                  <input
                    type="date"
                    name="fecha_cita"
                    required
                    value={formData.fecha_cita}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-900 transition-colors cursor-pointer"
                  />
                </div>

                {/* Fecha Construido */}
                <div className="md:col-span-1">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Fecha de Construido (Opcional)
                  </label>
                  <input
                    type="date"
                    name="fecha_construido"
                    value={formData.fecha_construido}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-900 transition-colors cursor-pointer"
                  />
                </div>

                {/* Central */}
                <div className="md:col-span-1">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Central *
                  </label>
                  <input
                    type="text"
                    name="central"
                    required
                    value={formData.central}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-900 transition-colors"
                  />
                </div>

                {/* Dirección */}
                <div className="md:col-span-1">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Dirección *
                  </label>
                  <input
                    type="text"
                    name="direccion"
                    required
                    value={formData.direccion}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-900 transition-colors"
                  />
                </div>

              </div>

              {/* Modal Footer */}
              <div className="mt-8 pt-5 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={guardando}
                  className="px-5 py-2.5 text-slate-600 font-bold rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-lg shadow-sm hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {guardando ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Guardar Proyecto'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
