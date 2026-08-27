'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { 
  Plus, X, Calendar, MapPin, 
  Building2, Loader2, FolderKanban,
  FileText, Hammer, HardHat, Zap, Search, Filter, Pencil, Copy
} from 'lucide-react';

interface Proyecto {
  id: string;
  activo: string;
  address_id: string;
  central: string;
  sisvadi: string;
  estado_maximo: string;
  nombre_de_calle: string;
  nro: string;
  const_of: string;
  poligono: string;
  fecha_cita: string | null;
  contrata: string;
  estado: string;
  fecha_conectado: string | null;
  a_conectar: string;
  c_sp: string;
  created_at?: string;
}

// Helpers for robust date normalization
const getLocalIsoString = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const normalizeDateString = (dateStr: string | null | undefined): string | null => {
  if (!dateStr) return null;
  const dmmyyyyMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmmyyyyMatch) {
    const [_, d, m, y] = dmmyyyyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      return dateStr.substring(0, 10);
    }
    return getLocalIsoString(d);
  }
  return null;
};

// Helper to determine the visual category based on const_of
const getCategoriaVisual = (const_of: string | null | undefined): 'Mantenimiento' | 'Obras' | 'TECO' | 'Otro' => {
  const upper = (const_of || '').toUpperCase();
  if (upper.includes('MANTENIMIENTO')) return 'Mantenimiento';
  if (upper.includes('OBRA')) return 'Obras';
  if (upper.includes('TECO')) return 'TECO';
  return 'Otro';
};

export default function ProyectosDashboard() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [guardando, setGuardando] = useState(false);
  
  const [proyectoEditando, setProyectoEditando] = useState<Proyecto | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEjecutado, setFiltroEjecutado] = useState('Todos');
  const [filtroFecha, setFiltroFecha] = useState<'Todas' | 'Hoy' | 'Ayer' | 'EstaSemana' | 'Elegir'>('Todas');
  const [fechaElegida, setFechaElegida] = useState<string>('');

  const [formData, setFormData] = useState({
    activo: '', address_id: '', central: '', sisvadi: '', estado_maximo: '',
    nombre_de_calle: '', nro: '', const_of: '', poligono: '', fecha_cita: '',
    contrata: '', estado: '', fecha_conectado: '', a_conectar: '', c_sp: ''
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
          toast.error('La tabla de proyectos no tiene la estructura correcta. Actualiza la BD.');
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
  
  const handleOpenNuevo = () => {
    setProyectoEditando(null);
    setFormData({
      activo: '', address_id: '', central: '', sisvadi: '', estado_maximo: '',
      nombre_de_calle: '', nro: '', const_of: '', poligono: '', fecha_cita: '',
      contrata: '', estado: '', fecha_conectado: '', a_conectar: '', c_sp: ''
    });
    setIsModalOpen(true);
  };
  
  const handleEdit = (proyecto: Proyecto) => {
    setProyectoEditando(proyecto);
    setFormData({
      activo: proyecto.activo || '',
      address_id: proyecto.address_id || '',
      central: proyecto.central || '',
      sisvadi: proyecto.sisvadi || '',
      estado_maximo: proyecto.estado_maximo || '',
      nombre_de_calle: proyecto.nombre_de_calle || '',
      nro: proyecto.nro || '',
      const_of: proyecto.const_of || '',
      poligono: proyecto.poligono || '',
      fecha_cita: proyecto.fecha_cita || '',
      contrata: proyecto.contrata || '',
      estado: proyecto.estado || '',
      fecha_conectado: proyecto.fecha_conectado || '',
      a_conectar: proyecto.a_conectar || '',
      c_sp: proyecto.c_sp || ''
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (!guardando) {
      setIsModalOpen(false);
      setProyectoEditando(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);

    try {
      const payload = {
        activo: formData.activo,
        address_id: formData.address_id,
        central: formData.central,
        sisvadi: formData.sisvadi,
        estado_maximo: formData.estado_maximo,
        nombre_de_calle: formData.nombre_de_calle,
        nro: formData.nro,
        const_of: formData.const_of,
        poligono: formData.poligono,
        fecha_cita: formData.fecha_cita ? formData.fecha_cita : null,
        contrata: formData.contrata,
        estado: formData.estado,
        fecha_conectado: formData.fecha_conectado ? formData.fecha_conectado : null,
        a_conectar: formData.a_conectar,
        c_sp: formData.c_sp
      };

      if (proyectoEditando) {
        const { error } = await supabase.from('proyectos').update(payload).eq('id', proyectoEditando.id);
        if (error) throw error;
        toast.success('Proyecto actualizado exitosamente');
      } else {
        const { error } = await supabase.from('proyectos').insert([payload]);
        if (error) throw error;
        toast.success('Proyecto registrado exitosamente');
      }

      handleCloseModal();
      fetchProyectos();
    } catch (err: any) {
      console.error('Error guardando proyecto:', err);
      toast.error('OcurriÃ³ un error al guardar el proyecto');
    } finally {
      setGuardando(false);
    }
  };

  const copiarAlPortapapeles = (texto: string) => {
    navigator.clipboard.writeText(texto);
    toast.success('Copiado al portapapeles');
  };

  // Variables para rango de fechas
  const hoy = new Date();
  const todayStr = getLocalIsoString(hoy);
  
  const ayer = new Date(hoy);
  ayer.setDate(hoy.getDate() - 1);
  const yesterdayStr = getLocalIsoString(ayer);
  
  const startOfWeek = new Date(hoy);
  const dayOfWeek = startOfWeek.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  startOfWeek.setDate(hoy.getDate() + diffToMonday);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  const startOfWeekStr = getLocalIsoString(startOfWeek);
  const endOfWeekStr = getLocalIsoString(endOfWeek);

  const proyectosFiltrados = proyectos.filter(proyecto => {
    const termino = searchTerm.toLowerCase();
    const coincideBusqueda = 
      (proyecto.activo || '').toLowerCase().includes(termino) ||
      (proyecto.sisvadi || '').toLowerCase().includes(termino) ||
      (proyecto.nombre_de_calle || '').toLowerCase().includes(termino) ||
      (proyecto.nro || '').toLowerCase().includes(termino) ||
      (proyecto.central || '').toLowerCase().includes(termino) ||
      (proyecto.address_id || '').toLowerCase().includes(termino);
      
    // AdaptaciÃ³n: el filtro "Todos" se mantiene, si elige una categorÃ­a visual, buscamos que const_of la contenga.
    let coincideEjecutado = true;
    if (filtroEjecutado !== 'Todos') {
       coincideEjecutado = getCategoriaVisual(proyecto.const_of) === filtroEjecutado;
    }

    let coincideFecha = true;
    if (filtroFecha !== 'Todas') {
      const normalized = normalizeDateString(proyecto.fecha_conectado);
      if (!normalized) {
        coincideFecha = false;
      } else {
        if (filtroFecha === 'Hoy') {
          coincideFecha = normalized === todayStr;
        } else if (filtroFecha === 'Ayer') {
          coincideFecha = normalized === yesterdayStr;
        } else if (filtroFecha === 'EstaSemana') {
          coincideFecha = normalized >= startOfWeekStr && normalized <= endOfWeekStr;
        } else if (filtroFecha === 'Elegir') {
          coincideFecha = fechaElegida ? normalized === fechaElegida : false;
        }
      }
    }

    return coincideBusqueda && coincideEjecutado && coincideFecha;
  });

  const totalProyectos = proyectos.length;
  const totalMantenimiento = proyectos.filter(p => getCategoriaVisual(p.const_of) === 'Mantenimiento').length;
  const totalObras = proyectos.filter(p => getCategoriaVisual(p.const_of) === 'Obras').length;
  const totalTeco = proyectos.filter(p => getCategoriaVisual(p.const_of) === 'TECO').length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <FolderKanban className="h-6 w-6 text-emerald-600" />
              Proyectos
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Seguimiento y evoluciÃ³n de proyectos
            </p>
          </div>
          <button
            onClick={handleOpenNuevo}
            className="bg-emerald-600 text-white px-5 py-2.5 rounded-lg font-semibold shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="h-5 w-5" />
            Nuevo proyecto
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
        
        {/* Tarjetas de Resumen */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 border-l-4 border-l-slate-400 shadow-sm flex flex-col">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-slate-100 p-2 rounded-lg text-slate-600">
                <FileText className="h-5 w-5" />
              </div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total</h3>
            </div>
            <div className="text-3xl font-extrabold text-slate-800">{cargando ? '-' : totalProyectos}</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 border-l-4 border-l-emerald-500 shadow-sm flex flex-col">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-emerald-100 p-2 rounded-lg text-emerald-700">
                <Hammer className="h-5 w-5" />
              </div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mantenimiento</h3>
            </div>
            <div className="text-3xl font-extrabold text-slate-800">{cargando ? '-' : totalMantenimiento}</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 border-l-4 border-l-blue-500 shadow-sm flex flex-col">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-blue-100 p-2 rounded-lg text-blue-700">
                <HardHat className="h-5 w-5" />
              </div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Obras</h3>
            </div>
            <div className="text-3xl font-extrabold text-slate-800">{cargando ? '-' : totalObras}</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 border-l-4 border-l-purple-500 shadow-sm flex flex-col">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-purple-100 p-2 rounded-lg text-purple-700">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">TECO</h3>
            </div>
            <div className="text-3xl font-extrabold text-slate-800">{cargando ? '-' : totalTeco}</div>
          </div>
        </section>

        {/* Zona Integrada de BÃºsqueda y Filtros */}
        <section className="flex flex-col gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar por Activo, SISVADI, direcciÃ³n o central..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50 text-slate-900 transition-colors"
                />
              </div>
              <div className="relative sm:max-w-xs w-full">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Filter className="h-5 w-5 text-slate-400" />
                </div>
                <select
                  value={filtroEjecutado}
                  onChange={(e) => setFiltroEjecutado(e.target.value)}
                  className="block w-full pl-10 pr-8 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50 text-slate-900 transition-colors cursor-pointer appearance-none"
                >
                  <option value="Todos">Todos los ejecutores</option>
                  <option value="Mantenimiento">Mantenimiento</option>
                  <option value="Obras">Obras</option>
                  <option value="TECO">TECO</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-4 border-t border-slate-100">
              <span className="text-sm font-semibold text-slate-700">Fecha conectado:</span>
              <div className="flex flex-wrap items-center gap-2">
                <button 
                  onClick={() => setFiltroFecha('Todas')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors border ${filtroFecha === 'Todas' ? 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                >Todas</button>
                <button 
                  onClick={() => setFiltroFecha('Hoy')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors border ${filtroFecha === 'Hoy' ? 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                >Hoy</button>
                <button 
                  onClick={() => setFiltroFecha('Ayer')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors border ${filtroFecha === 'Ayer' ? 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                >Ayer</button>
                <button 
                  onClick={() => setFiltroFecha('EstaSemana')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors border ${filtroFecha === 'EstaSemana' ? 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                >Esta semana</button>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setFiltroFecha('Elegir')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors border flex items-center gap-1.5 ${filtroFecha === 'Elegir' ? 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                  >
                    <Calendar className="h-4 w-4" />
                    Elegir fecha
                  </button>
                  {filtroFecha === 'Elegir' && (
                    <input 
                      type="date"
                      value={fechaElegida}
                      onChange={(e) => setFechaElegida(e.target.value)}
                      className="px-3 py-1 rounded-lg text-sm font-medium border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-700 shadow-sm"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-2 pt-2">
            <h2 className="text-sm font-bold text-slate-700">
              Proyectos cargados <span className="text-emerald-600 font-extrabold ml-2">[ {proyectosFiltrados.length} encontrado{proyectosFiltrados.length !== 1 ? 's' : ''} ]</span>
            </h2>
          </div>

          {/* Listado 2 niveles */}
          {cargando ? (
            <div className="flex flex-col items-center justify-center py-20 text-emerald-600 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <Loader2 className="h-10 w-10 animate-spin mb-4 text-emerald-500" />
              <p className="text-slate-500 font-medium">Cargando proyectos...</p>
            </div>
          ) : proyectos.length === 0 ? (
            <div className="text-center py-20 px-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-5 border border-slate-100">
                <FolderKanban className="h-8 w-8 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">No hay proyectos cargados todavÃ­a</h3>
              <p className="text-slate-500 max-w-sm mx-auto mb-8 text-sm">
                CreÃ¡ el primer proyecto o importa tu archivo Excel para comenzar el seguimiento.
              </p>
              <button
                onClick={handleOpenNuevo}
                className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-semibold shadow-sm hover:bg-emerald-700 active:scale-95 transition-all"
              >
                <Plus className="h-5 w-5" />
                Nuevo proyecto
              </button>
            </div>
          ) : proyectosFiltrados.length === 0 ? (
            <div className="text-center py-20 px-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-5 border border-slate-100">
                <Search className="h-8 w-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">Sin resultados</h3>
              <p className="text-slate-500 text-sm">
                No se encontraron proyectos que coincidan con la bÃºsqueda y filtros aplicados.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              {proyectosFiltrados.map((proyecto) => {
                const categoria = getCategoriaVisual(proyecto.const_of);
                const borderColor = 
                  categoria === 'Mantenimiento' ? 'bg-emerald-500' :
                  categoria === 'Obras' ? 'bg-blue-500' :
                  categoria === 'TECO' ? 'bg-purple-500' : 'bg-slate-300';
                  
                const isConectado = (proyecto.estado || '').toUpperCase() === 'CONECTADO';

                return (
                  <div key={proyecto.id} className="relative p-5 border-b border-slate-100 hover:bg-slate-50 transition-colors flex flex-col gap-3 group">
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${borderColor}`}></div>
                    
                    {/* Nivel 1 */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 pl-2">
                      <div className="flex items-center gap-3">
                        <span className="font-extrabold text-slate-900 text-lg tracking-tight">{proyecto.activo || 'S/N'}</span>
                        <span className="text-sm font-semibold text-slate-600 flex items-center gap-1.5">
                          <Building2 className="h-4 w-4 text-slate-400" />
                          {proyecto.central}
                        </span>
                        <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                          SISVADI {proyecto.sisvadi}
                        </span>
                      </div>
                      
                      <div className="flex-1"></div>
                      
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estado MÃ¡ximo:</span>
                          <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200 shadow-sm">
                            {proyecto.estado_maximo || 'N/A'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estado Actual:</span>
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1.5 border shadow-sm
                            ${isConectado ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                            {isConectado && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)]"></span>}
                            {proyecto.estado || 'N/A'}
                          </span>
                        </div>

                        <button
                          onClick={() => handleEdit(proyecto)}
                          className="ml-1 p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                          title="Editar proyecto"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Nivel 2 */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pl-2 text-sm">
                      <div className="flex items-center gap-1.5 font-bold text-slate-700">
                        <MapPin className="h-4 w-4 text-emerald-500 shrink-0" />
                        {proyecto.nombre_de_calle} {proyecto.nro}
                      </div>

                      <span className="text-slate-300 hidden sm:inline">|</span>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                        <div 
                          className="flex items-center gap-1 cursor-pointer group/tooltip relative" 
                          onClick={() => copiarAlPortapapeles(proyecto.address_id || '')}
                          title="Clic para copiar"
                        >
                          <span className="font-semibold text-slate-400">address_id:</span> 
                          <span className="text-slate-600 hover:text-emerald-600 transition-colors flex items-center gap-1">
                            {proyecto.address_id ? `${proyecto.address_id.substring(0, 8)}...` : 'â€”'}
                            <Copy className="h-3 w-3 opacity-0 group-hover/tooltip:opacity-100 transition-opacity" />
                          </span>
                        </div>
                        
                        <div><span className="font-semibold text-slate-400">const_of:</span> <span className="text-slate-600">{proyecto.const_of || 'â€”'}</span></div>
                        <div><span className="font-semibold text-slate-400">PolÃ­gono:</span> <span className="text-slate-600">{proyecto.poligono || 'â€”'}</span></div>
                        <div><span className="font-semibold text-slate-400">Fecha cita:</span> <span className="text-slate-600">{proyecto.fecha_cita ? new Date(proyecto.fecha_cita + 'T00:00:00').toLocaleDateString() : 'â€”'}</span></div>
                        <div><span className="font-semibold text-slate-400">Contrata:</span> <span className="text-slate-600">{proyecto.contrata || 'â€”'}</span></div>
                        <div><span className="font-semibold text-slate-400">Fecha conectado:</span> <span className="text-slate-600">{proyecto.fecha_conectado ? new Date(proyecto.fecha_conectado + 'T00:00:00').toLocaleDateString() : 'â€”'}</span></div>
                        <div><span className="font-semibold text-slate-400">a conectar:</span> <span className="text-slate-600">{proyecto.a_conectar || 'â€”'}</span></div>
                        <div><span className="font-semibold text-slate-400">C/SP:</span> <span className="text-slate-600">{proyecto.c_sp || 'â€”'}</span></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </main>

      {/* Modal / Formulario (Actualizado con nuevos campos) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden my-8 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FolderKanban className="h-5 w-5 text-emerald-600" />
                {proyectoEditando ? 'Editar Proyecto' : 'Registrar Nuevo Proyecto'}
              </h2>
              <button 
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-700 hover:bg-slate-200 p-2 rounded-full transition-colors"
                disabled={guardando}
              >
                <X className="h-5 w-5" />
              </button></div><form onSubmit={handleSubmit} className="p-6">
              
              {/* SecciÃ³n 1: IdentificaciÃ³n */}
              <h3 className="text-sm font-bold text-emerald-700 mb-3 uppercase tracking-wide border-b border-emerald-100 pb-1">IdentificaciÃ³n del Proyecto</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Activo *</label>
                  <input type="text" name="activo" required value={formData.activo} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-900 shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">SISVADI *</label>
                  <input type="text" name="sisvadi" required value={formData.sisvadi} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-900 shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Central *</label>
                  <input type="text" name="central" required value={formData.central} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-900 shadow-sm" />
                </div>
              </div>

              {/* SecciÃ³n 2: Estado y PlanificaciÃ³n */}
              <h3 className="text-sm font-bold text-emerald-700 mb-3 uppercase tracking-wide border-b border-emerald-100 pb-1">Estado y PlanificaciÃ³n</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Estado MÃ¡ximo *</label>
                  <input type="text" name="estado_maximo" required value={formData.estado_maximo} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-900 shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Estado Actual *</label>
                  <input type="text" name="estado" required value={formData.estado} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-900 shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Fecha Cita</label>
                  <input type="date" name="fecha_cita" value={formData.fecha_cita} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-900 shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Fecha Conectado</label>
                  <input type="date" name="fecha_conectado" value={formData.fecha_conectado} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-900 shadow-sm" />
                </div>
              </div>

              {/* SecciÃ³n 3: UbicaciÃ³n */}
              <h3 className="text-sm font-bold text-emerald-700 mb-3 uppercase tracking-wide border-b border-emerald-100 pb-1">UbicaciÃ³n GeogrÃ¡fica</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Nombre de Calle *</label>
                  <input type="text" name="nombre_de_calle" required value={formData.nombre_de_calle} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-900 shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Nro *</label>
                  <input type="text" name="nro" required value={formData.nro} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-900 shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">PolÃ­gono</label>
                  <input type="text" name="poligono" value={formData.poligono} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-900 shadow-sm" />
                </div>
                <div className="md:col-span-4">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Address ID</label>
                  <input type="text" name="address_id" value={formData.address_id} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-900 shadow-sm" />
                </div>
              </div>

              {/* SecciÃ³n 4: Datos Operativos */}
              <h3 className="text-sm font-bold text-emerald-700 mb-3 uppercase tracking-wide border-b border-emerald-100 pb-1">Datos Operativos</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Const Of</label>
                  <input type="text" name="const_of" value={formData.const_of} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-900 shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Contrata</label>
                  <input type="text" name="contrata" value={formData.contrata} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-900 shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">A conectar</label>
                  <input type="text" name="a_conectar" value={formData.a_conectar} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-900 shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">C/SP</label>
                  <input type="text" name="c_sp" value={formData.c_sp} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-900 shadow-sm" />
                </div>
              </div>

              <div className="mt-8 pt-5 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={handleCloseModal} disabled={guardando} className="px-5 py-2.5 text-slate-600 font-bold rounded-lg hover:bg-slate-100 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={guardando} className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-lg shadow-sm hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-70 flex items-center gap-2">
                  {guardando ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</> : proyectoEditando ? 'Actualizar Proyecto' : 'Guardar Proyecto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
