'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { 
  Plus, X, Calendar, MapPin, 
  Building2, Loader2, FolderKanban,
  FileText, Hammer, HardHat, Zap, Search, Filter, Pencil, Copy,
  Upload, CheckCircle2, AlertTriangle, AlertCircle, Info
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
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.substring(0, 10);
    return getLocalIsoString(d);
  }
  return null;
};

const parseExcelDate = (val: string | null | undefined): string | null => {
  if (!val) return null;
  val = val.trim();
  if (!val) return null;
  
  const matchDate = val.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (matchDate) {
     const d = matchDate[1].padStart(2, '0');
     const m = matchDate[2].padStart(2, '0');
     const y = matchDate[3];
     return `${y}-${m}-${d}`;
  }

  const matchMonth = val.match(/^(\d{1,2})-(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)/i);
  if (matchMonth) {
     const d = matchMonth[1].padStart(2, '0');
     const monthStr = matchMonth[2].toLowerCase();
     const months: Record<string, string> = {
       ene: '01', feb: '02', mar: '03', abr: '04', may: '05', jun: '06',
       jul: '07', ago: '08', sep: '09', oct: '10', nov: '11', dic: '12'
     };
     const m = months[monthStr];
     const y = new Date().getFullYear(); 
     return `${y}-${m}-${d}`;
  }
  
  const dObj = new Date(val);
  if (!isNaN(dObj.getTime())) {
     if (/^\d{4}-\d{2}-\d{2}/.test(val)) return val.substring(0, 10);
     return dObj.toISOString().substring(0, 10);
  }
  return null;
};

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
  
  // Nuevo Proyecto / Edit States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [proyectoEditando, setProyectoEditando] = useState<Proyecto | null>(null);

  // Carga Masiva States
  const [isCargaMasivaOpen, setIsCargaMasivaOpen] = useState(false);
  const [pastedData, setPastedData] = useState('');
  const [cargaStep, setCargaStep] = useState<'input' | 'preview'>('input');
  const [parsedProyectos, setParsedProyectos] = useState<any[]>([]);
  const [cargaDuplicadosAccion, setCargaDuplicadosAccion] = useState<'omit' | 'update'>('omit');
  const [cargaGuardando, setCargaGuardando] = useState(false);

  // Filtros
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
      toast.error('Ocurrió un error al guardar el proyecto');
    } finally {
      setGuardando(false);
    }
  };

  // --- Logica de Carga Masiva ---
  const handleRevisarDatos = async () => {
    if (!pastedData.trim()) {
      toast.error('Copiá y pegá filas desde Excel primero.');
      return;
    }
    
    const rows = pastedData.split('\n').map(r => r.split('\t'));
    
    let startIndex = 0;
    if (rows.length > 0 && rows[0].length > 0 && rows[0][0].toLowerCase().includes('activo')) {
       startIndex = 1;
    }
    
    const parsed = [];
    const activosToQuery = [];
    
    for (let i = startIndex; i < rows.length; i++) {
       const cols = rows[i];
       if (cols.length === 1 && !cols[0].trim()) continue; 
       
       let status = 'valid';
       let errorMsg = '';
       
       if (cols.length < 15) {
          status = 'error';
          errorMsg = `La fila tiene ${cols.length} columnas, se esperaban 15.`;
       }
       
       const activo = cols[0]?.trim();
       if (!activo && status !== 'error') {
          status = 'error';
          errorMsg = 'Falta el código de Activo.';
       }
       
       if (status !== 'error') {
          activosToQuery.push(activo);
       }
       
       parsed.push({
         _rowNum: i + 1,
         _status: status,
         _errorMsg: errorMsg,
         activo,
         address_id: cols[1]?.trim() || '',
         central: cols[2]?.trim() || '',
         sisvadi: cols[3]?.trim() || '',
         estado_maximo: cols[4]?.trim() || '',
         nombre_de_calle: cols[5]?.trim() || '',
         nro: cols[6]?.trim() || '',
         const_of: cols[7]?.trim() || '',
         poligono: cols[8]?.trim() || '',
         fecha_cita: parseExcelDate(cols[9]),
         contrata: cols[10]?.trim() || '',
         estado: cols[11]?.trim() || '',
         fecha_conectado: parseExcelDate(cols[12]),
         a_conectar: cols[13]?.trim() || '',
         c_sp: cols[14]?.trim() || ''
       });
    }
    
    // Check duplicates
    if (activosToQuery.length > 0) {
       const { data, error } = await supabase.from('proyectos').select('activo').in('activo', activosToQuery);
       if (data && !error) {
          const existingSet = new Set(data.map(d => d.activo));
          for (const p of parsed) {
             if (p._status === 'valid' && existingSet.has(p.activo)) {
                p._status = 'duplicate';
             }
          }
       }
    }
    
    setParsedProyectos(parsed);
    setCargaStep('preview');
  };

  const handleConfirmarCarga = async () => {
    setCargaGuardando(true);
    try {
      const toInsert = [];
      const toUpdate = [];
      
      for (const p of parsedProyectos) {
        if (p._status === 'error') continue;
        if (p._status === 'duplicate' && cargaDuplicadosAccion === 'omit') continue;
        
        const payload = {
          activo: p.activo,
          address_id: p.address_id,
          central: p.central,
          sisvadi: p.sisvadi,
          estado_maximo: p.estado_maximo,
          nombre_de_calle: p.nombre_de_calle,
          nro: p.nro,
          const_of: p.const_of,
          poligono: p.poligono,
          fecha_cita: p.fecha_cita ? p.fecha_cita : null,
          contrata: p.contrata,
          estado: p.estado,
          fecha_conectado: p.fecha_conectado ? p.fecha_conectado : null,
          a_conectar: p.a_conectar,
          c_sp: p.c_sp
        };

        if (p._status === 'duplicate') {
          toUpdate.push(payload);
        } else {
          toInsert.push(payload);
        }
      }
      
      if (toInsert.length > 0) {
        const { error } = await supabase.from('proyectos').insert(toInsert);
        if (error) throw error;
      }
      
      for (const up of toUpdate) {
        const { error } = await supabase.from('proyectos').update(up).eq('activo', up.activo);
        if (error) console.error("Error updating", up.activo, error);
      }
      
      toast.success(`Se importaron correctamente ${toInsert.length + toUpdate.length} proyectos.`);
      
      setIsCargaMasivaOpen(false);
      setPastedData('');
      setCargaStep('input');
      fetchProyectos();
      
    } catch (e) {
      console.error(e);
      toast.error("Ocurrió un error al importar los datos.");
    } finally {
      setCargaGuardando(false);
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

  // Counters preview
  const validCount = parsedProyectos.filter(p => p._status === 'valid').length;
  const errorCount = parsedProyectos.filter(p => p._status === 'error').length;
  const dupCount = parsedProyectos.filter(p => p._status === 'duplicate').length;

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
              Seguimiento y evolución de proyectos
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => { setIsCargaMasivaOpen(true); setCargaStep('input'); setPastedData(''); }}
              className="bg-white border border-slate-300 text-slate-700 px-5 py-2.5 rounded-lg font-semibold shadow-sm hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Upload className="h-5 w-5" />
              ⇧ Carga de datos
            </button>
            <button
              onClick={handleOpenNuevo}
              className="bg-emerald-600 text-white px-5 py-2.5 rounded-lg font-semibold shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Plus className="h-5 w-5" />
              Nuevo proyecto
            </button>
          </div>
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

        {/* Zona Integrada de Búsqueda y Filtros */}
        <section className="flex flex-col gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar por Activo, SISVADI, dirección o central..."
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
              <h3 className="text-xl font-bold text-slate-800 mb-2">No hay proyectos cargados todavía</h3>
              <p className="text-slate-500 max-w-sm mx-auto mb-8 text-sm">
                Creá el primer proyecto o importa tu archivo Excel para comenzar el seguimiento.
              </p>
              <div className="flex justify-center gap-3 mt-4">
                <button
                  onClick={() => setIsCargaMasivaOpen(true)}
                  className="inline-flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-6 py-2.5 rounded-lg font-semibold shadow-sm hover:bg-slate-50 transition-all"
                >
                  <Upload className="h-5 w-5" />
                  Carga masiva
                </button>
                <button
                  onClick={handleOpenNuevo}
                  className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-semibold shadow-sm hover:bg-emerald-700 active:scale-95 transition-all"
                >
                  <Plus className="h-5 w-5" />
                  Nuevo proyecto
                </button>
              </div>
            </div>
          ) : proyectosFiltrados.length === 0 ? (
            <div className="text-center py-20 px-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-5 border border-slate-100">
                <Search className="h-8 w-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">Sin resultados</h3>
              <p className="text-slate-500 text-sm">
                No se encontraron proyectos que coincidan con la búsqueda y filtros aplicados.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {proyectosFiltrados.map((proyecto) => {
                const categoria = getCategoriaVisual(proyecto.const_of);
                const borderColor = 
                  categoria === 'Mantenimiento' ? 'bg-emerald-500' :
                  categoria === 'Obras' ? 'bg-blue-500' :
                  categoria === 'TECO' ? 'bg-purple-500' : 'bg-slate-400';
                  
                const isConectado = (proyecto.estado || '').toUpperCase() === 'CONECTADO';

                return (
                  <div key={proyecto.id} className="relative p-4 sm:p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col gap-3.5 group">
                    {/* Borde izquierdo redondeado */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl ${borderColor} opacity-90 group-hover:opacity-100 transition-opacity`}></div>
                    
                    {/* Nivel 1: Identificación y Estado */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 pl-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-extrabold text-slate-900 text-lg tracking-tight">{proyecto.activo || 'S/N'}</span>
                        <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                          <Building2 className="h-4 w-4 text-slate-500" />
                          {proyecto.central}
                        </span>
                        <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                          SISVADI {proyecto.sisvadi}
                        </span>
                      </div>
                      
                      <div className="flex-1"></div>
                      
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estado Máximo:</span>
                          <span className="text-xs font-bold bg-slate-100 text-slate-800 px-2.5 py-1 rounded-md border border-slate-200 shadow-sm">
                            {proyecto.estado_maximo || 'N/A'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estado Actual:</span>
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1.5 border shadow-sm
                            ${isConectado ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-slate-50 text-slate-800 border-slate-200'}`}>
                            {isConectado && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)]"></span>}
                            {proyecto.estado || 'N/A'}
                          </span>
                        </div>

                        <button
                          onClick={() => handleEdit(proyecto)}
                          className="ml-1 p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                          title="Editar proyecto"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Nivel 2: Ubicación y Operativa */}
                    <div className="flex flex-col gap-3 pl-2">
                      <div className="flex items-center gap-1.5 font-extrabold text-slate-800 text-sm">
                        <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
                        {proyecto.nombre_de_calle} {proyecto.nro}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                        
                        {/* Grupo Técnico */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                          <div 
                            className="flex items-center gap-1.5 cursor-pointer group/tooltip relative" 
                            onClick={() => copiarAlPortapapeles(proyecto.address_id || '')}
                            title="Clic para copiar"
                          >
                            <span className="font-semibold text-slate-500">address_id:</span> 
                            <span className="font-bold text-slate-800 hover:text-emerald-700 transition-colors flex items-center gap-1">
                              {proyecto.address_id ? `${proyecto.address_id.substring(0, 8)}...` : '—'}
                              <Copy className="h-3 w-3 opacity-0 group-hover/tooltip:opacity-100 transition-opacity" />
                            </span>
                          </div>
                          <div><span className="font-semibold text-slate-500">const_of:</span> <span className="font-bold text-slate-800">{proyecto.const_of || '—'}</span></div>
                          <div><span className="font-semibold text-slate-500">Polígono:</span> <span className="font-bold text-slate-800">{proyecto.poligono || '—'}</span></div>
                        </div>

                        {/* Separador Visual */}
                        <div className="hidden sm:block w-px h-4 bg-slate-300"></div>

                        {/* Grupo Seguimiento */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                          <div><span className="font-semibold text-slate-500">Fecha cita:</span> <span className="font-bold text-slate-800">{proyecto.fecha_cita ? new Date(proyecto.fecha_cita + 'T00:00:00').toLocaleDateString() : '—'}</span></div>
                          <div><span className="font-semibold text-slate-500">Contrata:</span> <span className="font-bold text-slate-800">{proyecto.contrata || '—'}</span></div>
                          <div><span className="font-semibold text-slate-500">Fecha conectado:</span> <span className="font-bold text-slate-800">{proyecto.fecha_conectado ? new Date(proyecto.fecha_conectado + 'T00:00:00').toLocaleDateString() : '—'}</span></div>
                          <div><span className="font-semibold text-slate-500">a conectar:</span> <span className="font-bold text-slate-800">{proyecto.a_conectar || '—'}</span></div>
                          <div><span className="font-semibold text-slate-500">C/SP:</span> <span className="font-bold text-slate-800">{proyecto.c_sp || '—'}</span></div>
                        </div>

                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </main>

      {/* Modal Carga Masiva */}
      {isCargaMasivaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden my-8 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Upload className="h-5 w-5 text-emerald-600" />
                Carga masiva de proyectos
              </h2>
              <button 
                onClick={() => { if(!cargaGuardando) setIsCargaMasivaOpen(false); }}
                className="text-slate-400 hover:text-slate-700 hover:bg-slate-200 p-2 rounded-full transition-colors"
                disabled={cargaGuardando}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              {cargaStep === 'input' ? (
                <div className="flex flex-col gap-4">
                  <p className="text-sm font-medium text-slate-600">
                    Copiá las filas directamente desde Excel y pegálas aquí.
                  </p>
                  
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-1">
                    <textarea 
                      value={pastedData}
                      onChange={(e) => setPastedData(e.target.value)}
                      placeholder="Pegá aquí los datos copiados de Excel (Ctrl + V)..."
                      className="w-full h-64 p-4 bg-transparent outline-none resize-y font-mono text-sm text-slate-700 whitespace-pre"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-slate-500 bg-blue-50 text-blue-800 p-3 rounded-lg">
                    <Info className="h-4 w-4 shrink-0" />
                    <p>Las columnas esperadas son 15 en este orden exacto: <strong>Activo, address_id, central, sisvadi, Estado Maximo, Nombre_de_Calle, nro, const_of, poligono, Fecha de Cita, Contrata, Estado, Fecha CONECTADO, a conectar, C/SP</strong>.</p>
                  </div>

                  <div className="mt-4 flex justify-end gap-3">
                    <button 
                      type="button" 
                      onClick={() => setIsCargaMasivaOpen(false)} 
                      className="px-5 py-2.5 text-slate-600 font-bold rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="button" 
                      onClick={handleRevisarDatos} 
                      className="px-6 py-2.5 bg-slate-800 text-white font-bold rounded-lg shadow-sm hover:bg-slate-900 transition-all flex items-center gap-2"
                    >
                      Revisar datos
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <h3 className="font-bold text-slate-800 text-base mb-1">Datos procesados</h3>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                          <CheckCircle2 className="h-4 w-4" /> {validCount} válidos
                        </span>
                        <span className="flex items-center gap-1.5 text-amber-600 font-semibold">
                          <AlertTriangle className="h-4 w-4" /> {dupCount} duplicados
                        </span>
                        <span className="flex items-center gap-1.5 text-red-600 font-semibold">
                          <AlertCircle className="h-4 w-4" /> {errorCount} con errores
                        </span>
                      </div>
                    </div>
                    
                    {dupCount > 0 && (
                      <div className="bg-white p-3 rounded-lg border border-amber-200 shadow-sm">
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Acción para duplicados:</label>
                        <select 
                          value={cargaDuplicadosAccion}
                          onChange={(e) => setCargaDuplicadosAccion(e.target.value as any)}
                          className="w-full text-sm font-semibold text-slate-700 border-none outline-none cursor-pointer bg-transparent"
                        >
                          <option value="omit">Omitir los duplicados</option>
                          <option value="update">Actualizar registros existentes</option>
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto max-h-[40vh]">
                      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                        <thead className="bg-slate-100 sticky top-0 z-10">
                          <tr>
                            <th className="px-4 py-3 font-bold text-slate-600">Estado</th>
                            <th className="px-4 py-3 font-bold text-slate-600">Activo</th>
                            <th className="px-4 py-3 font-bold text-slate-600">Central</th>
                            <th className="px-4 py-3 font-bold text-slate-600">SISVADI</th>
                            <th className="px-4 py-3 font-bold text-slate-600">Estado Máximo</th>
                            <th className="px-4 py-3 font-bold text-slate-600">Estado Actual</th>
                            <th className="px-4 py-3 font-bold text-slate-600">Fecha CONECTADO</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                          {parsedProyectos.map((p, idx) => (
                            <tr key={idx} className={p._status === 'error' ? 'bg-red-50/50' : p._status === 'duplicate' ? 'bg-amber-50/50' : 'hover:bg-slate-50'}>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {p._status === 'valid' && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">Válido</span>}
                                {p._status === 'duplicate' && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800" title="Activo ya existe">Duplicado</span>}
                                {p._status === 'error' && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800" title={p._errorMsg}>Error: Fila {p._rowNum}</span>}
                              </td>
                              <td className="px-4 py-3 font-bold text-slate-800">{p.activo || '-'}</td>
                              <td className="px-4 py-3 text-slate-600">{p.central || '-'}</td>
                              <td className="px-4 py-3 text-slate-600">{p.sisvadi || '-'}</td>
                              <td className="px-4 py-3 text-slate-600">{p.estado_maximo || '-'}</td>
                              <td className="px-4 py-3 text-slate-600">{p.estado || '-'}</td>
                              <td className="px-4 py-3 text-slate-600">{p.fecha_conectado || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="mt-2 flex justify-between items-center border-t border-slate-100 pt-5">
                    <button 
                      type="button" 
                      onClick={() => setCargaStep('input')} 
                      disabled={cargaGuardando}
                      className="px-5 py-2.5 text-slate-600 font-bold rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      Volver
                    </button>
                    <button 
                      type="button" 
                      onClick={handleConfirmarCarga} 
                      disabled={cargaGuardando || (validCount === 0 && (dupCount === 0 || cargaDuplicadosAccion === 'omit'))}
                      className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-lg shadow-sm hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {cargaGuardando ? <><Loader2 className="h-4 w-4 animate-spin" /> Importando...</> : `Importar ${(validCount + (cargaDuplicadosAccion === 'update' ? dupCount : 0))} proyectos`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal / Formulario Nuevo Proyecto */}
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
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              
              {/* Sección 1: Identificación */}
              <h3 className="text-sm font-bold text-emerald-700 mb-3 uppercase tracking-wide border-b border-emerald-100 pb-1">Identificación del Proyecto</h3>
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

              {/* Sección 2: Estado y Planificación */}
              <h3 className="text-sm font-bold text-emerald-700 mb-3 uppercase tracking-wide border-b border-emerald-100 pb-1">Estado y Planificación</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Estado Máximo *</label>
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

              {/* Sección 3: Ubicación */}
              <h3 className="text-sm font-bold text-emerald-700 mb-3 uppercase tracking-wide border-b border-emerald-100 pb-1">Ubicación Geográfica</h3>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Polígono</label>
                  <input type="text" name="poligono" value={formData.poligono} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-900 shadow-sm" />
                </div>
                <div className="md:col-span-4">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Address ID</label>
                  <input type="text" name="address_id" value={formData.address_id} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-900 shadow-sm" />
                </div>
              </div>

              {/* Sección 4: Datos Operativos */}
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
