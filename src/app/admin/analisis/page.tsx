'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { supabase, Registro, Tecnico, Usuario } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  TrendingUp,
  BarChart3,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  Filter,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  Building,
  UserCheck,
  ArrowLeft,
  Search,
  MessageSquare,
  ShieldAlert,
  Percent,
  Info,
  X
} from 'lucide-react';

export default function AnalisisPage() {
  const router = useRouter();
  const { profile } = useAuth();

  // Estados de datos
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [cargando, setCargando] = useState(true);

  // Control de Pestañas
  const [tabActiva, setTabActiva] = useState<'cumplimiento' | 'observaciones'>('cumplimiento');

  // Filtros
  const [filtroDistrito, setFiltroDistrito] = useState<string>('todos');
  const [filtroCelula, setFiltroCelula] = useState<string>('todos');
  const [filtroLider, setFiltroLider] = useState<string>('todos');
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');

  // Detalles expandidos / modales
  const [celulaExpandida, setCelulaExpandida] = useState<string | null>(null);
  const [observacionModal, setObservacionModal] = useState<Registro | null>(null);

  // Resetear célula si cambia el distrito
  useEffect(() => {
    setFiltroCelula('todos');
  }, [filtroDistrito]);

  // Cargar datos (READ-ONLY)
  const fetchData = async () => {
    setCargando(true);
    try {
      // 1. Cargar universo de técnicos activos
      const { data: dataTecnicos, error: errT } = await supabase
        .from('tecnicos')
        .select(`
          *,
          usuarios ( id, nombre, email )
        `)
        .eq('activo', true);

      if (errT) throw errT;

      // 2. Cargar historial de registros
      const { data: dataRegistros, error: errR } = await supabase
        .from('registros')
        .select(`
          *,
          usuarios ( id, nombre, email ),
          tecnicos ( id, legajo, nombre, celula, distrito, lider_id )
        `)
        .order('created_at', { ascending: false });

      if (errR) throw errR;

      setTecnicos(dataTecnicos || []);
      setRegistros(dataRegistros || []);
    } catch (err: any) {
      console.error('Error al cargar datos para análisis:', err);
      toast.error('Error al cargar la información para análisis');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Helper para normalizar cadenas de texto (ignora mayúsculas, tildes y espacios)
  const normalizeStr = (s: string | null | undefined) => {
    if (!s) return '';
    return s
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_')
      .trim();
  };

  // Listados dinámicos para los selectores de filtros
  const distritosDisponibles = Array.from(
    new Set(tecnicos.map((t) => t.distrito).filter(Boolean))
  ) as string[];
  distritosDisponibles.sort();

  const celulasDisponibles = Array.from(
    new Set(
      tecnicos
        .filter((t) => filtroDistrito === 'todos' || normalizeStr(t.distrito) === normalizeStr(filtroDistrito))
        .map((t) => t.celula)
        .filter(Boolean)
    )
  ) as string[];
  celulasDisponibles.sort();

  const lideresDisponibles = Array.from(
    new Set(tecnicos.map((t) => t.usuarios?.nombre).filter(Boolean))
  ) as string[];
  lideresDisponibles.sort();

  // Limpiar filtros
  const limpiarFiltros = () => {
    setFiltroDistrito('todos');
    setFiltroCelula('todos');
    setFiltroLider('todos');
    setFechaDesde('');
    setFechaHasta('');
    toast.success('Filtros restablecidos');
  };

  // ==========================================
  // FILTRADO Y CÁLCULOS SOBRE LOS DATOS
  // ==========================================

  // 1. Filtrar técnicos según Distrito, Célula y Líder
  const tecnicosFiltrados = tecnicos.filter((t) => {
    const matchDistrito =
      filtroDistrito === 'todos' || normalizeStr(t.distrito) === normalizeStr(filtroDistrito);
    const matchCelula =
      filtroCelula === 'todos' || normalizeStr(t.celula) === normalizeStr(filtroCelula);
    const matchLider =
      filtroLider === 'todos' || (t.usuarios?.nombre && t.usuarios.nombre === filtroLider);

    return matchDistrito && matchCelula && matchLider;
  });

  // 2. Filtrar registros por fecha [Desde, Hasta] y por el alcance filtrado de técnicos/distrito
  const registrosFiltrados = registros.filter((reg) => {
    // Filtro de Fecha Desde
    if (fechaDesde) {
      const fechaReg = new Date(reg.created_at);
      const desde = new Date(fechaDesde + 'T00:00:00');
      if (fechaReg < desde) return false;
    }

    // Filtro de Fecha Hasta
    if (fechaHasta) {
      const fechaReg = new Date(reg.created_at);
      const hasta = new Date(fechaHasta + 'T23:59:59');
      if (fechaReg > hasta) return false;
    }

    // Filtro por alcance (Distrito, Célula, Líder)
    const regDistrito = (reg as any).distrito || reg.tecnicos?.distrito;
    const regCelula = (reg as any).central || reg.tecnicos?.celula;
    const regLider = (reg as any).lider_nombre || reg.usuarios?.nombre;

    const matchDistrito =
      filtroDistrito === 'todos' || normalizeStr(regDistrito) === normalizeStr(filtroDistrito);
    const matchCelula =
      filtroCelula === 'todos' || normalizeStr(regCelula) === normalizeStr(filtroCelula);
    const matchLider =
      filtroLider === 'todos' || regLider === filtroLider;

    return matchDistrito && matchCelula && matchLider;
  });

  // 3. Determinar Técnicos Únicos Registrados dentro del período y alcance
  const IDsTecnicosRegistradosEnPeriodo = new Set<string>();
  const legajosTecnicosRegistradosEnPeriodo = new Set<string>();

  registrosFiltrados.forEach((r) => {
    if (r.tecnico_id) IDsTecnicosRegistradosEnPeriodo.add(r.tecnico_id);
    if (r.tecnico_legajo) legajosTecnicosRegistradosEnPeriodo.add(r.tecnico_legajo);
  });

  const esTecnicoRegistrado = (t: Tecnico) => {
    if (t.id && IDsTecnicosRegistradosEnPeriodo.has(t.id)) return true;
    if (t.legajo && legajosTecnicosRegistradosEnPeriodo.has(t.legajo)) return true;
    return false;
  };

  // KPIs Generales de Cumplimiento
  const totalTecnicosActivos = tecnicosFiltrados.length;
  const tecnicosUnicosRelevados = tecnicosFiltrados.filter(esTecnicoRegistrado).length;
  const tecnicosPendientes = Math.max(0, totalTecnicosActivos - tecnicosUnicosRelevados);
  const porcentajeCumplimiento =
    totalTecnicosActivos > 0
      ? ((tecnicosUnicosRelevados / totalTecnicosActivos) * 100).toFixed(1)
      : '0.0';

  // 4. Agrupación por Distrito y Célula para la Tabla de Cumplimiento
  interface CélulaEstadistica {
    distrito: string;
    celula: string;
    totalTecnicos: number;
    relevados: number;
    pendientes: number;
    cumplimientoPct: number;
    tecnicosDetalle: Array<{
      tecnico: Tecnico;
      estado: 'REGISTRADO' | 'PENDIENTE';
      ultimoRegistroFecha: string | null;
      cantRegistros: number;
    }>;
  }

  const gruposPorDistritoCelula: Record<string, CélulaEstadistica> = {};

  tecnicosFiltrados.forEach((t) => {
    const dist = t.distrito || 'Sin Distrito';
    const cel = t.celula || 'Sin Célula';
    const key = `${dist}__${cel}`;

    if (!gruposPorDistritoCelula[key]) {
      gruposPorDistritoCelula[key] = {
        distrito: dist,
        celula: cel,
        totalTecnicos: 0,
        relevados: 0,
        pendientes: 0,
        cumplimientoPct: 0,
        tecnicosDetalle: []
      };
    }

    const registrado = esTecnicoRegistrado(t);
    const regTecnicoEnPeriodo = registrosFiltrados.filter(
      (r) =>
        r.tecnico_id === t.id ||
        (r.tecnico_legajo && r.tecnico_legajo === t.legajo) ||
        normalizeStr(r.tecnico_nombre) === normalizeStr(t.nombre)
    );

    const ultimoReg = regTecnicoEnPeriodo.length > 0 ? regTecnicoEnPeriodo[0] : null;

    gruposPorDistritoCelula[key].totalTecnicos += 1;
    if (registrado) {
      gruposPorDistritoCelula[key].relevados += 1;
    } else {
      gruposPorDistritoCelula[key].pendientes += 1;
    }

    gruposPorDistritoCelula[key].tecnicosDetalle.push({
      tecnico: t,
      estado: registrado ? 'REGISTRADO' : 'PENDIENTE',
      ultimoRegistroFecha: ultimoReg ? ultimoReg.created_at : null,
      cantRegistros: regTecnicoEnPeriodo.length
    });
  });

  const listaEstadisticasCelulas = Object.values(gruposPorDistritoCelula).map((item) => {
    item.cumplimientoPct =
      item.totalTecnicos > 0
        ? parseFloat(((item.relevados / item.totalTecnicos) * 100).toFixed(1))
        : 0;
    // Ordenar técnicos del detalle (Pendientes primero, luego por nombre)
    item.tecnicosDetalle.sort((a, b) => {
      if (a.estado !== b.estado) {
        return a.estado === 'PENDIENTE' ? -1 : 1;
      }
      return a.tecnico.nombre.localeCompare(b.tecnico.nombre);
    });
    return item;
  });

  // Ordenar la tabla por Distrito y luego por Célula
  listaEstadisticasCelulas.sort((a, b) => {
    if (a.distrito !== b.distrito) return a.distrito.localeCompare(b.distrito);
    return a.celula.localeCompare(b.celula);
  });

  // 5. Análisis de Observaciones
  const registrosConObservacion = registrosFiltrados.filter(
    (r) => r.observaciones && r.observaciones.trim() !== ''
  );
  const totalRegistrosEnPeriodo = registrosFiltrados.length;
  const totalConObs = registrosConObservacion.length;
  const totalSinObs = Math.max(0, totalRegistrosEnPeriodo - totalConObs);
  const pctConObs =
    totalRegistrosEnPeriodo > 0
      ? ((totalConObs / totalRegistrosEnPeriodo) * 100).toFixed(1)
      : '0.0';

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50 pb-16">
      {/* Header Fijo */}
      <header className="sticky top-0 bg-white border-b border-slate-200/80 px-4 sm:px-8 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            title="Volver al Panel de Control"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 leading-tight">Análisis Operativo</h1>
            <p className="text-xs text-slate-500 font-medium">Módulo de Inspección de Cumplimiento & Novedades</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            onClick={limpiarFiltros}
            className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 rounded-xl transition flex items-center gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Limpiar Filtros
          </button>
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 rounded-xl transition flex items-center gap-1.5"
          >
            <BarChart3 className="h-4 w-4" /> Panel Dashboard
          </button>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 px-4 sm:px-8 py-6 max-w-7xl mx-auto w-full flex flex-col gap-6">
        {/* BLOQUE DE FILTROS APLICADOS A AMBAS PESTAÑAS */}
        <section className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Filter className="h-4 w-4 text-indigo-600" /> Filtros de Período y Alcance
            </h2>
            <span className="text-xs font-medium text-slate-400">
              Aplicado a ambas vistas (Read-Only)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {/* Distrito */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Distrito</label>
              <select
                value={filtroDistrito}
                onChange={(e) => setFiltroDistrito(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="todos">🌐 Todos los Distritos</option>
                {distritosDisponibles.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Célula */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Célula</label>
              <select
                value={filtroCelula}
                onChange={(e) => setFiltroCelula(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="todos">🏢 Todas las Células</option>
                {celulasDisponibles.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Líder */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Líder a Cargo</label>
              <select
                value={filtroLider}
                onChange={(e) => setFiltroLider(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="todos">👨‍💼 Todos los Líderes</option>
                {lideresDisponibles.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>

            {/* Fecha Desde */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="h-3 w-3 text-indigo-500" /> Fecha Desde
              </label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Fecha Hasta */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="h-3 w-3 text-indigo-500" /> Fecha Hasta
              </label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>
        </section>

        {/* ========================================== */}
        {/* NAVEGACIÓN POR PESTAÑAS (TABS) */}
        {/* ========================================== */}
        <div className="flex items-center gap-2 border-b border-slate-200/80 pt-2">
          <button
            onClick={() => setTabActiva('cumplimiento')}
            className={`pb-3 px-5 text-sm font-extrabold flex items-center gap-2 border-b-2 transition ${
              tabActiva === 'cumplimiento'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserCheck className="h-4.5 w-4.5" /> Cumplimiento
          </button>

          <button
            onClick={() => setTabActiva('observaciones')}
            className={`pb-3 px-5 text-sm font-extrabold flex items-center gap-2 border-b-2 transition ${
              tabActiva === 'observaciones'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="h-4.5 w-4.5" /> Observaciones
            {totalConObs > 0 && (
              <span className="ml-1 bg-amber-100 text-amber-800 text-[11px] px-2 py-0.5 rounded-full font-extrabold">
                {totalConObs}
              </span>
            )}
          </button>
        </div>

        {/* ========================================== */}
        {/* PESTAÑA 1: CUMPLIMIENTO */}
        {/* ========================================== */}
        {tabActiva === 'cumplimiento' && (
          <section className="flex flex-col gap-6 animate-in fade-in duration-200">
            {/* TARJETAS DE KPIS GENERALES */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Técnicos */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Técnicos Activos</span>
                  <span className="text-3xl font-black text-slate-900 mt-1 block">
                    {cargando ? '...' : totalTecnicosActivos}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500 mt-1 block">Universo total en alcance</span>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Users className="h-6 w-6" />
                </div>
              </div>

              {/* Relevados / Registrados */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block">Relevados</span>
                  <span className="text-3xl font-black text-emerald-700 mt-1 block">
                    {cargando ? '...' : tecnicosUnicosRelevados}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500 mt-1 block">Técnicos únicos registrados</span>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
              </div>

              {/* Pendientes */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-amber-600 uppercase tracking-wider block">Pendientes</span>
                  <span className="text-3xl font-black text-amber-600 mt-1 block">
                    {cargando ? '...' : tecnicosPendientes}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500 mt-1 block">Sin registro en el período</span>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Clock className="h-6 w-6" />
                </div>
              </div>

              {/* % Cumplimiento */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Cumplimiento</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                    {porcentajeCumplimiento}%
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-3xl font-black text-indigo-950 block">{porcentajeCumplimiento}%</span>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
                    <div
                      className="bg-indigo-600 h-full transition-all duration-500 rounded-full"
                      style={{ width: `${Math.min(100, parseFloat(porcentajeCumplimiento))}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* TABLA PRINCIPAL: CUMPLIMIENTO POR DISTRITO Y CÉLULA */}
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Análisis por Distrito y Célula</h3>
                  <p className="text-xs text-slate-500">Seleccioná una célula para desplegar la lista de técnicos y su estado.</p>
                </div>
                <span className="text-xs font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
                  {listaEstadisticasCelulas.length} Células
                </span>
              </div>

              {cargando ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <div className="h-8 w-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                  <span className="text-sm font-medium">Calculando cumplimiento operativo...</span>
                </div>
              ) : listaEstadisticasCelulas.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  No se encontraron datos para los filtros seleccionados.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3.5 px-6">Distrito</th>
                        <th className="py-3.5 px-6">Célula</th>
                        <th className="py-3.5 px-6 text-center">Técnicos</th>
                        <th className="py-3.5 px-6 text-center">Relevados</th>
                        <th className="py-3.5 px-6 text-center">Pendientes</th>
                        <th className="py-3.5 px-6 text-center">Cumplimiento</th>
                        <th className="py-3.5 px-6 text-right">Detalle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                      {listaEstadisticasCelulas.map((item) => {
                        const key = `${item.distrito}__${item.celula}`;
                        const estaExpandido = celulaExpandida === key;

                        return (
                          <React.Fragment key={key}>
                            <tr
                              onClick={() => setCelulaExpandida(estaExpandido ? null : key)}
                              className={`hover:bg-indigo-50/40 cursor-pointer transition ${
                                estaExpandido ? 'bg-indigo-50/30' : ''
                              }`}
                            >
                              <td className="py-4 px-6 font-bold text-slate-900">{item.distrito}</td>
                              <td className="py-4 px-6 font-semibold text-slate-800">
                                <span className="inline-flex items-center gap-1.5">
                                  <Building className="h-4 w-4 text-indigo-500" /> {item.celula}
                                </span>
                              </td>
                              <td className="py-4 px-6 text-center font-bold text-slate-900">{item.totalTecnicos}</td>
                              <td className="py-4 px-6 text-center font-bold text-emerald-600">{item.relevados}</td>
                              <td className="py-4 px-6 text-center font-bold text-amber-600">{item.pendientes}</td>
                              <td className="py-4 px-6 text-center">
                                <div className="inline-flex items-center gap-2">
                                  <span
                                    className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${
                                      item.cumplimientoPct >= 80
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : item.cumplimientoPct >= 50
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}
                                  >
                                    {item.cumplimientoPct}%
                                  </span>
                                </div>
                              </td>
                              <td className="py-4 px-6 text-right">
                                <button className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-200 px-3 py-1.5 rounded-xl shadow-sm transition inline-flex items-center gap-1">
                                  {estaExpandido ? (
                                    <>
                                      Ocultar <ChevronUp className="h-3.5 w-3.5" />
                                    </>
                                  ) : (
                                    <>
                                      Ver Técnicos <ChevronDown className="h-3.5 w-3.5" />
                                    </>
                                  )}
                                </button>
                              </td>
                            </tr>

                            {/* FILA DESPLEGABLE: DETALLE DE TÉCNICOS */}
                            {estaExpandido && (
                              <tr>
                                <td colSpan={7} className="p-0 bg-slate-100/60 border-y border-slate-200/60">
                                  <div className="p-5 flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                        <Users className="h-4 w-4 text-indigo-600" /> Detalle de Técnicos de {item.celula} ({item.totalTecnicos})
                                      </h4>
                                      <span className="text-xs font-medium text-slate-500">
                                        {item.relevados} Registrados • {item.pendientes} Pendientes
                                      </span>
                                    </div>

                                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                      <table className="w-full text-left text-xs">
                                        <thead>
                                          <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                            <th className="py-2.5 px-4">Técnico</th>
                                            <th className="py-2.5 px-4">Legajo</th>
                                            <th className="py-2.5 px-4">Líder a Cargo</th>
                                            <th className="py-2.5 px-4 text-center">Estado</th>
                                            <th className="py-2.5 px-4 text-right">Último Registro</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-medium">
                                          {item.tecnicosDetalle.map((td) => (
                                            <tr key={td.tecnico.id} className="hover:bg-slate-50/80">
                                              <td className="py-2.5 px-4 font-bold text-slate-900">{td.tecnico.nombre}</td>
                                              <td className="py-2.5 px-4 font-mono text-slate-600">{td.tecnico.legajo}</td>
                                              <td className="py-2.5 px-4 text-slate-700">{td.tecnico.usuarios?.nombre || '—'}</td>
                                              <td className="py-2.5 px-4 text-center">
                                                {td.estado === 'REGISTRADO' ? (
                                                  <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                                                    <CheckCircle2 className="h-3 w-3" /> REGISTRADO ({td.cantRegistros})
                                                  </span>
                                                ) : (
                                                  <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                                                    <Clock className="h-3 w-3" /> PENDIENTE
                                                  </span>
                                                )}
                                              </td>
                                              <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                                                {td.ultimoRegistroFecha
                                                  ? new Date(td.ultimoRegistroFecha).toLocaleDateString('es-AR')
                                                  : '—'}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ========================================== */}
        {/* PESTAÑA 2: OBSERVACIONES */}
        {/* ========================================== */}
        {tabActiva === 'observaciones' && (
          <section className="flex flex-col gap-6 animate-in fade-in duration-200">
            {/* KPIS DE OBSERVACIONES */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Registros Totales</span>
                  <span className="text-3xl font-black text-slate-900 mt-1 block">{cargando ? '...' : totalRegistrosEnPeriodo}</span>
                  <span className="text-[11px] text-slate-500 block mt-1">En el período filtrado</span>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  <FileText className="h-6 w-6" />
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-amber-600 uppercase tracking-wider block">Con Observación</span>
                  <span className="text-3xl font-black text-amber-600 mt-1 block">{cargando ? '...' : totalConObs}</span>
                  <span className="text-[11px] text-slate-500 block mt-1">Reportaron novedades</span>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <ShieldAlert className="h-6 w-6" />
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block">Sin Observación</span>
                  <span className="text-3xl font-black text-emerald-600 mt-1 block">{cargando ? '...' : totalSinObs}</span>
                  <span className="text-[11px] text-slate-500 block mt-1">Inspección limpia</span>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">% Novedades</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                    {pctConObs}%
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-3xl font-black text-indigo-950 block">{pctConObs}%</span>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
                    <div
                      className="bg-amber-500 h-full transition-all duration-500 rounded-full"
                      style={{ width: `${Math.min(100, parseFloat(pctConObs))}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* TABLA DE OBSERVACIONES */}
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Listado de Observaciones Registradas</h3>
                  <p className="text-xs text-slate-500">Mapeo de textos de observación ingresados por los técnicos.</p>
                </div>
                <span className="text-xs font-bold bg-amber-100 text-amber-800 px-3 py-1 rounded-full">
                  {registrosConObservacion.length} Novedades
                </span>
              </div>

              {cargando ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <div className="h-8 w-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                  <span className="text-sm font-medium">Cargando observaciones...</span>
                </div>
              ) : registrosConObservacion.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  No existen observaciones registradas para el período y filtros seleccionados.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3.5 px-6">Fecha</th>
                        <th className="py-3.5 px-6">Distrito</th>
                        <th className="py-3.5 px-6">Célula</th>
                        <th className="py-3.5 px-6">Técnico</th>
                        <th className="py-3.5 px-6">Líder</th>
                        <th className="py-3.5 px-6">Observación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-800">
                      {registrosConObservacion.map((reg) => (
                        <tr key={reg.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-4 px-6 whitespace-nowrap font-mono text-xs text-slate-600">
                            {new Date(reg.created_at).toLocaleDateString('es-AR')}
                            <span className="block text-[10px] text-slate-400">
                              {new Date(reg.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
                            </span>
                          </td>
                          <td className="py-4 px-6 font-bold text-slate-900 whitespace-nowrap">{(reg as any).distrito || reg.tecnicos?.distrito || '-'}</td>
                          <td className="py-4 px-6 font-semibold text-slate-800 whitespace-nowrap">{(reg as any).central || reg.tecnicos?.celula || '-'}</td>
                          <td className="py-4 px-6 whitespace-nowrap font-bold text-slate-900">{reg.tecnico_nombre}</td>
                          <td className="py-4 px-6 whitespace-nowrap text-slate-600">{(reg as any).lider_nombre || reg.usuarios?.nombre || '-'}</td>
                          <td className="py-4 px-6">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-slate-950 font-semibold bg-amber-50/70 border border-amber-200/60 p-2.5 rounded-xl text-xs leading-relaxed max-w-xl">
                                "{reg.observaciones}"
                              </p>
                              {reg.observaciones && reg.observaciones.length > 60 && (
                                <button
                                  onClick={() => setObservacionModal(reg)}
                                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1.5 rounded-lg whitespace-nowrap transition"
                                >
                                  Ver Completa
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* MODAL DETALLE OBSERVACIÓN EXTENSA */}
      {observacionModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-xl p-6 shadow-2xl flex flex-col gap-4 border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-indigo-600" /> Detalle de Novedad
              </h3>
              <button
                onClick={() => setObservacionModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block font-semibold">Técnico</span>
                  <span className="font-bold text-slate-900 block mt-0.5">{observacionModal.tecnico_nombre}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Célula / Distrito</span>
                  <span className="font-bold text-slate-900 block mt-0.5">
                    {(observacionModal as any).central} | {(observacionModal as any).distrito}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Líder</span>
                  <span className="font-semibold text-slate-800 block mt-0.5">{(observacionModal as any).lider_nombre}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Fecha</span>
                  <span className="font-mono text-slate-700 block mt-0.5">
                    {new Date(observacionModal.created_at).toLocaleDateString('es-AR')}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 font-bold block mb-1.5">Observación Completa:</span>
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-slate-950 font-bold text-sm leading-relaxed shadow-inner">
                  "{observacionModal.observaciones}"
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setObservacionModal(null)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
