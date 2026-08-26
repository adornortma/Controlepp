'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { 
  Plus, X, Briefcase, Calendar, MapPin, 
  Building2, UserCircle2, ArrowLeft, Loader2, FolderKanban
} from 'lucide-react';
import Link from 'next/link';

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
          // Relación/Tabla no existe
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
      // Validate
      if (!formData.sigest || !formData.titulo || !formData.fecha_cita || !formData.direccion || !formData.central) {
        toast.error('Por favor complete todos los campos obligatorios');
        setGuardando(false);
        return;
      }

      // Format payload (handle empty optional dates)
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
      
      // Reset form
      setFormData({
        sigest: '',
        titulo: '',
        fecha_cita: '',
        fecha_construido: '',
        ejecutado_por: 'Mantenimiento',
        direccion: '',
        central: ''
      });

      // Reload table
      fetchProyectos();
    } catch (err: any) {
      console.error('Error guardando proyecto:', err);
      toast.error('Ocurrió un error al guardar el proyecto');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header NavBar */}
      <header className="bg-emerald-600 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <FolderKanban className="h-6 w-6" />
              <h1 className="text-xl font-bold">Tablero de Proyectos</h1>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-white text-emerald-600 px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-emerald-50 transition-colors flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            <span className="hidden sm:inline">Nuevo proyecto</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        {cargando ? (
          <div className="flex flex-col items-center justify-center py-20 text-emerald-600">
            <Loader2 className="h-10 w-10 animate-spin mb-4" />
            <p className="text-slate-500 font-medium">Cargando proyectos...</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              {proyectos.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <Briefcase className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">No hay proyectos cargados</h3>
                  <p className="text-slate-500 max-w-sm mx-auto mb-6">
                    Aún no se ha registrado ningún proyecto en el sistema. Comience creando uno nuevo.
                  </p>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-emerald-700 transition"
                  >
                    <Plus className="h-5 w-5" />
                    Crear primer proyecto
                  </button>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        Proyecto / SIGEST
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Título
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        Fecha Cita
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        Fecha Construido
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        Ejecutado Por
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Dirección
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Central
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {proyectos.map((proyecto) => (
                      <tr key={proyecto.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-sm font-medium border border-slate-200">
                            {proyecto.sigest}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-semibold text-slate-900">{proyecto.titulo}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-600 flex items-center gap-1.5">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            {proyecto.fecha_cita ? new Date(proyecto.fecha_cita + 'T00:00:00').toLocaleDateString() : '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-600 flex items-center gap-1.5">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            {proyecto.fecha_construido ? new Date(proyecto.fecha_construido + 'T00:00:00').toLocaleDateString() : '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900 flex items-center gap-2">
                            <UserCircle2 className="h-4 w-4 text-slate-400" />
                            {proyecto.ejecutado_por}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-600 flex items-center gap-1.5 line-clamp-1">
                            <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                            {proyecto.direccion}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                            <Building2 className="h-4 w-4 text-slate-400" />
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
      </main>

      {/* Modal / Formulario */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-emerald-600" />
                Registrar Nuevo Proyecto
              </h2>
              <button 
                onClick={() => !guardando && setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-2 rounded-full transition-colors"
                disabled={guardando}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* SIGEST */}
                <div className="md:col-span-1">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Proyecto / SIGEST *
                  </label>
                  <input
                    type="text"
                    name="sigest"
                    required
                    value={formData.sigest}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-900"

                  />
                </div>

                {/* Título */}
                <div className="md:col-span-1">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Título del Proyecto *
                  </label>
                  <input
                    type="text"
                    name="titulo"
                    required
                    value={formData.titulo}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-900"

                  />
                </div>

                {/* Ejecutado por */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Ejecutado por *
                  </label>
                  <select
                    name="ejecutado_por"
                    required
                    value={formData.ejecutado_por}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-900"
                  >
                    <option value="Mantenimiento">Mantenimiento</option>
                    <option value="Obras">Obras</option>
                    <option value="TECO">TECO</option>
                  </select>
                </div>

                {/* Fecha Cita */}
                <div className="md:col-span-1">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Fecha de Cita *
                  </label>
                  <input
                    type="date"
                    name="fecha_cita"
                    required
                    value={formData.fecha_cita}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-900"
                  />
                </div>

                {/* Fecha Construido */}
                <div className="md:col-span-1">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Fecha de Construido (Opcional)
                  </label>
                  <input
                    type="date"
                    name="fecha_construido"
                    value={formData.fecha_construido}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-900"
                  />
                </div>

                {/* Central */}
                <div className="md:col-span-1">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Central *
                  </label>
                  <input
                    type="text"
                    name="central"
                    required
                    value={formData.central}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-900"

                  />
                </div>

                {/* Dirección */}
                <div className="md:col-span-1">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Dirección *
                  </label>
                  <input
                    type="text"
                    name="direccion"
                    required
                    value={formData.direccion}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-900"

                  />
                </div>

              </div>

              {/* Modal Footer */}
              <div className="mt-8 pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={guardando}
                  className="px-5 py-2.5 text-slate-600 font-semibold rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-lg shadow-sm hover:bg-emerald-700 active:scale-[0.98] transition disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
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
