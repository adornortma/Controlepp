'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { supabase, Usuario } from '@/lib/supabase';
import { Camera } from '@/components/camera';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import {
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Binary,
  Maximize,
  CheckCircle2,
  AlertCircle,
  FileText,
  Save,
  Trash2,
  User,
  Landmark,
  Building,
  Users,
  Camera as CameraIcon,
  Shield
} from 'lucide-react';

const DISTRITOS_CENTRALES: Record<string, string[]> = {
  'Florencio Varela': [
    'Berazategui',
    'Bernal',
    'Ms Varela',
    'Quilmes',
    'Ranelagh',
    'Varela 1',
    'Varela 2'
  ],
  'Lomas': [
    'Banfield',
    'Calzada',
    'Llavallol',
    'Lomas',
    'Ms Lomas',
    'Solano'
  ],
  'Monte Grande': [
    'Adrogué',
    'Burzaco',
    'Ezeiza',
    'Monte Grande',
    'Ms Monte Grande'
  ],
  'Lanús': [
    'Gm Lanús',
    'Gm Lomas',
    'Gm Monte Grande',
    'Gm Quilmes Varela',
    'Lanús',
    'Monte Chingolo',
    'Ms Lanús',
    'Piñeyro',
    'Sarandí'
  ]
};

export default function RegistroPage() {
  const { profile } = useAuth();
  const router = useRouter();

  // Estados del Formulario del Técnico (Paso 0)
  const [tecnicoNombre, setTecnicoNombre] = useState('');
  const [distrito, setDistrito] = useState('');
  const [central, setCentral] = useState('');
  const [liderNombre, setLiderNombre] = useState('');

  // Lista de líderes obtenidos de la base de datos
  const [lideres, setLideres] = useState<Usuario[]>([]);
  const [cargandoLideres, setCargandoLideres] = useState(true);

  // Estados del Asistente
  const [step, setStep] = useState(0); // 0 a 5
  const [fotoAdvertencia, setFotoAdvertencia] = useState<string | null>(null);
  const [fotoNumeroSerie, setFotoNumeroSerie] = useState<string | null>(null);
  const [fotoEscalera, setFotoEscalera] = useState<string | null>(null);
  const [numeroSerie, setNumeroSerie] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [guardadoExitoso, setGuardadoExitoso] = useState(false);

  // Carga de cámara activa en cada paso
  const [showCamera, setShowCamera] = useState(false);

  // Cargar líderes activos de Supabase
  useEffect(() => {
    const fetchLideres = async () => {
      try {
        const { data, error } = await supabase
          .from('usuarios')
          .select('*')
          .eq('activo', true)
          .order('nombre', { ascending: true });

        if (error) throw error;
        setLideres(data || []);
      } catch (err) {
        console.error('Error fetching leaders:', err);
      } finally {
        setCargandoLideres(false);
      }
    };

    fetchLideres();
  }, []);

  // Título e instrucciones de cada paso
  const totalSteps = 6; // Formulario Técnico, Advertencia, Serie, Escalera, Obs, Confirmación
  const stepProgress = Math.round(((step + 1) / totalSteps) * 100);

  const avanzar = () => {
    if (step === 0) {
      if (!tecnicoNombre.trim()) {
        toast.error('Debe escribir su Nombre y Apellido');
        return;
      }
      if (!distrito) {
        toast.error('Debe seleccionar su Distrito');
        return;
      }
      if (!central.trim()) {
        toast.error('Debe escribir su Central');
        return;
      }
    }
    if (step === 1 && !fotoAdvertencia) {
      toast.error('La fotografía de la advertencia es obligatoria');
      return;
    }
    if (step === 2 && !fotoNumeroSerie) {
      toast.error('La fotografía del número de serie es obligatoria');
      return;
    }
    setStep((prev) => Math.min(prev + 1, totalSteps - 1));
    setShowCamera(false);
  };

  const retroceder = () => {
    setStep((prev) => Math.max(prev - 1, 0));
    setShowCamera(false);
  };

  const base64ToBlob = (base64: string): Blob => {
    const arr = base64.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const handleSave = async () => {
    if (!tecnicoNombre.trim() || !distrito || !central.trim() || !fotoAdvertencia || !fotoNumeroSerie) {
      toast.error('Faltan completar campos obligatorios o fotografías');
      return;
    }

    setGuardando(true);

    try {
      // 1. Validar en cliente que existan las fotos obligatorias
      const blobAdvertencia = base64ToBlob(fotoAdvertencia);
      const blobNumeroSerie = base64ToBlob(fotoNumeroSerie);

      if (blobAdvertencia.size < 1000 || blobNumeroSerie.size < 1000) {
        throw new Error('Las imágenes obligatorias no son válidas o están dañadas.');
      }

      // 2. Insertar Registro (Inserción pública sin usuario_id autenticado obligatorio)
      const { data: registro, error: insertError } = await supabase
        .from('registros')
        .insert({
          tecnico_nombre: tecnicoNombre.trim(),
          distrito: distrito,
          central: central.trim(),
          lider_nombre: liderNombre,
          numero_serie: numeroSerie.trim() || 'S/N',
          estado: 'pendiente',
          observaciones: observaciones.trim() || null
        })
        .select()
        .single();

      if (insertError) throw insertError;
      if (!registro) throw new Error('No se pudo crear el registro');

      const registroId = registro.id;
      const anio = new Date().getFullYear();
      const mes = String(new Date().getMonth() + 1).padStart(2, '0');

      // 3. Subir fotos a Supabase Storage y registrar en la DB
      const fotosSubir = [
        { tipo: 'advertencia', data: fotoAdvertencia },
        { tipo: 'numero_serie', data: fotoNumeroSerie },
        ...(fotoEscalera ? [{ tipo: 'escalera', data: fotoEscalera }] : [])
      ];

      for (const f of fotosSubir) {
        const fileBlob = base64ToBlob(f.data);
        const fileName = `${f.tipo}.jpg`;
        // Organizar imágenes en carpetas por año/mes/registro
        const filePath = `${anio}/${mes}/${registroId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('fotos-escaleras')
          .upload(filePath, fileBlob, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError) throw uploadError;

        // Obtener URL pública
        const { data: { publicUrl } } = supabase.storage
          .from('fotos-escaleras')
          .getPublicUrl(filePath);

        // Guardar relación de foto en la base de datos
        const { error: dbFotoError } = await supabase
          .from('fotos')
          .insert({
            registro_id: registroId,
            tipo: f.tipo,
            url: publicUrl
          });

        if (dbFotoError) throw dbFotoError;
      }

      // Éxito completo
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
      });
      setGuardadoExitoso(true);
      toast.success('Registro guardado exitosamente');
    } catch (error: any) {
      console.error('Error al guardar registro:', error);
      toast.error(error.message || 'Error al guardar el registro. Intente de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const resetForm = () => {
    setStep(0);
    setTecnicoNombre('');
    setDistrito('');
    setCentral('');
    setLiderNombre('');
    setFotoAdvertencia(null);
    setFotoNumeroSerie(null);
    setFotoEscalera(null);
    setNumeroSerie('');
    setObservaciones('');
    setGuardadoExitoso(false);
    setShowCamera(false);
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50 relative pb-24">
      {/* Header Fijo */}
      <header className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-30">
        <div>
          <h1 className="font-bold text-slate-900 leading-tight">Cuidado y señalización de escaleras</h1>
          <p className="text-xs text-slate-500 font-medium">Formulario de Colocación de Calcos</p>
        </div>
        {/* Acceso rápido a Admin si el usuario de la sesión es administrador */}
        {profile?.rol === 'administrador' && (
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl flex items-center gap-1.5 text-xs font-bold transition"
            title="Ir al panel administrador"
          >
            <Shield className="h-4 w-4" /> Panel Admin
          </button>
        )}
      </header>

      {/* Barra de Progreso */}
      {!guardadoExitoso && (
        <div className="w-full bg-slate-100 h-1.5 sticky top-[69px] z-30">
          <div
            className="bg-indigo-600 h-full transition-all duration-300 ease-out"
            style={{ width: `${stepProgress}%` }}
          />
        </div>
      )}

      {/* Contenido Principal */}
      <main className="flex-1 flex flex-col justify-center px-4 py-6 max-w-md mx-auto w-full">
        {guardadoExitoso ? (
          /* Pantalla de Éxito */
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl text-center flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-300">
            <div className="h-20 w-20 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="h-12 w-12 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">¡Registro Guardado!</h2>
              <p className="text-slate-500 text-sm mt-2 px-2">
                La evidencia fotográfica del calco y número de serie ha sido registrada correctamente.
              </p>
            </div>

            <div className="w-full border-t border-slate-100 pt-6 flex flex-col gap-3">
              <div className="bg-slate-50 rounded-xl p-4 text-left text-sm flex flex-col gap-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Técnico:</span>
                  <span className="font-semibold text-slate-950">{tecnicoNombre}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">N° Serie:</span>
                  <span className="font-mono font-semibold text-indigo-600">{numeroSerie}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Distrito:</span>
                  <span className="font-semibold text-slate-950">{distrito}</span>
                </div>
              </div>

              <button
                onClick={resetForm}
                className="w-full mt-2 py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/10 active:scale-[0.98] transition"
              >
                Registrar Otra Escalera
              </button>
            </div>
          </div>
        ) : (
          /* Pasos del Formulario */
          <div className="flex flex-col flex-1">
            {/* Paso 0: Identificación del Técnico */}
            {step === 0 && (
              <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                <div>
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
                    Paso 1 de 6
                  </span>
                  <h2 className="text-2xl font-extrabold text-slate-900 mt-1">Tus Datos</h2>
                  <p className="text-slate-500 text-sm mt-1">
                    Completa tus datos personales y de asignación.
                  </p>
                </div>

                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
                  {/* Nombre */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-indigo-500" /> Nombre y Apellido
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Juan Pérez"
                      value={tecnicoNombre}
                      onChange={(e) => setTecnicoNombre(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
                    />
                  </div>

                  {/* Distrito */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <Landmark className="h-3.5 w-3.5 text-indigo-500" /> Distrito
                    </label>
                    <select
                      value={distrito}
                      onChange={(e) => {
                        setDistrito(e.target.value);
                        setCentral(''); // Reset central when district changes
                      }}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium"
                    >
                      <option value="">Seleccione Distrito...</option>
                      {Object.keys(DISTRITOS_CENTRALES).map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Central */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <Building className="h-3.5 w-3.5 text-indigo-500" /> Central / Célula
                    </label>
                    <select
                      value={central}
                      onChange={(e) => setCentral(e.target.value)}
                      disabled={!distrito}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium disabled:opacity-50 disabled:bg-slate-50"
                    >
                      <option value="">
                        {distrito ? 'Seleccione Central...' : 'Seleccione primero un Distrito...'}
                      </option>
                      {distrito &&
                        DISTRITOS_CENTRALES[distrito]?.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Líder */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-indigo-500" /> Líder a Cargo (Opcional)
                    </label>
                    {cargandoLideres ? (
                      <div className="text-xs text-slate-400 py-2 flex items-center gap-1.5">
                        <span className="h-3 w-3 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin"></span>
                        Cargando lista de líderes...
                      </div>
                    ) : (
                      <select
                        value={liderNombre}
                        onChange={(e) => setLiderNombre(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium"
                      >
                        <option value="">Seleccione su Líder (Opcional)...</option>
                        {lideres.map((l) => (
                          <option key={l.id} value={l.nombre}>
                            {l.nombre}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Paso 1: Advertencia Colocada */}
            {step === 1 && (
              <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                <div>
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
                    Paso 2 de 6
                  </span>
                  <h2 className="text-2xl font-extrabold text-slate-900 mt-1">Recomendaciones y ejemplos</h2>
                </div>

                {!showCamera && !fotoAdvertencia ? (
                  /* Guía visual */
                  <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
                    <div className="bg-indigo-50 border border-indigo-100/50 rounded-xl p-4 flex gap-3 text-indigo-900">
                      <ShieldAlert className="h-5 w-5 shrink-0 text-indigo-600 mt-0.5" />
                      <div className="text-xs leading-relaxed">
                        <strong className="font-semibold block mb-0.5">Ubicación recomendada:</strong>
                        Colocá el calco entre el 5º y el 6º escalón, sobre el parante izquierdo del lado interno de la escalera.
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Recomendaciones para la foto:
                      </h4>
                      <ul className="text-sm text-slate-600 flex flex-col gap-1.5">
                        <li className="flex items-center gap-2">
                          <span className="text-emerald-500 font-bold text-base">✓</span> Debe verse completa.
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-emerald-500 font-bold text-base">✓</span> Debe estar correctamente adherida.
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-emerald-500 font-bold text-base">✓</span> Debe tener buena iluminación.
                        </li>
                      </ul>
                    </div>

                    {/* Imagen de muestra */}
                    <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center py-2">
                      <img
                        src="/ejemplo-advertencia.png"
                        alt="Ejemplo colocación calco"
                        className="object-contain max-h-64 w-auto"
                      />
                      <span className="absolute bottom-2 right-2 bg-black/60 px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-wider">
                        Ejemplo de Colocación
                      </span>
                    </div>

                    <button
                      onClick={() => setShowCamera(true)}
                      className="w-full mt-2 py-4 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/10 active:scale-98 transition flex items-center justify-center gap-2 text-base"
                    >
                      <CameraIcon className="h-5 w-5" /> Tomar Fotografía
                    </button>
                  </div>
                ) : showCamera ? (
                  <Camera
                    onCapture={(base64) => {
                      setFotoAdvertencia(base64);
                      setShowCamera(false);
                    }}
                    aspectRatioLabel="ADVERTENCIA"
                  />
                ) : (
                  /* Vista previa de foto capturada */
                  <div className="flex flex-col gap-4 items-center">
                    <div className="relative w-full aspect-[3/4] bg-slate-900 rounded-2xl overflow-hidden shadow-md border border-slate-100">
                      <img
                        src={fotoAdvertencia || undefined}
                        alt="Advertencia Colocada"
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => {
                          setFotoAdvertencia(null);
                          setShowCamera(true);
                        }}
                        className="absolute bottom-4 right-4 bg-black/60 hover:bg-red-600 backdrop-blur-md p-3 text-white rounded-full border border-white/10 active:scale-90 transition"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Paso 2: Número de Serie */}
            {step === 2 && (
              <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                <div>
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
                    Paso 3 de 6
                  </span>
                  <h2 className="text-2xl font-extrabold text-slate-900 mt-1">Número de Serie</h2>
                  <p className="text-slate-500 text-sm mt-1">
                    Fotografía de la placa del fabricante.
                  </p>
                </div>

                {!showCamera && !fotoNumeroSerie ? (
                  /* Guía visual */
                  <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
                    <div className="bg-indigo-50 border border-indigo-100/50 rounded-xl p-4 flex gap-3 text-indigo-900">
                      <Binary className="h-5 w-5 shrink-0 text-indigo-600 mt-0.5" />
                      <div className="text-xs leading-relaxed">
                        <strong className="font-semibold block mb-0.5">Ubicación del N° de Serie:</strong>
                        Generalmente se encuentra en la etiqueta de características del lateral interior del larguero.
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Recomendaciones para la foto:
                      </h4>
                      <ul className="text-sm text-slate-600 flex flex-col gap-1.5">
                        <li className="flex items-center gap-2">
                          <span className="text-emerald-500 font-bold text-base">✓</span> El número debe ser completamente legible.
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-emerald-500 font-bold text-base">✓</span> Sin reflejos ni destellos de flash directos.
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-emerald-500 font-bold text-base">✓</span> Imagen completamente enfocada.
                        </li>
                      </ul>
                    </div>

                    {/* Imagen de muestra */}
                    <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center py-2">
                      <img
                        src="/ejemplo-serie.png"
                        alt="Ejemplo placa número de serie"
                        className="object-contain max-h-64 w-auto"
                      />
                      <span className="absolute bottom-2 right-2 bg-black/60 px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-wider">
                        Ejemplo de Placa de Serie
                      </span>
                    </div>

                    <button
                      onClick={() => setShowCamera(true)}
                      className="w-full mt-2 py-4 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/10 active:scale-98 transition flex items-center justify-center gap-2 text-base"
                    >
                      <CameraIcon className="h-5 w-5" /> Tomar Fotografía
                    </button>
                  </div>
                ) : showCamera ? (
                  <Camera
                    onCapture={(base64) => {
                      setFotoNumeroSerie(base64);
                      setShowCamera(false);
                    }}
                    aspectRatioLabel="NUMERO SERIE"
                  />
                ) : (
                  /* Vista previa e ingreso del número */
                  <div className="flex flex-col gap-4">
                    <div className="relative w-full aspect-[3/4] bg-slate-900 rounded-2xl overflow-hidden shadow-md border border-slate-100">
                      <img
                        src={fotoNumeroSerie || undefined}
                        alt="Número de Serie"
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => {
                          setFotoNumeroSerie(null);
                          setShowCamera(true);
                        }}
                        className="absolute bottom-4 right-4 bg-black/60 hover:bg-red-600 backdrop-blur-md p-3 text-white rounded-full border border-white/10 active:scale-90 transition"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Paso 3: Escalera Completa (Opcional) */}
            {step === 3 && (
              <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
                      Paso 4 de 6
                    </span>
                    <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      Opcional
                    </span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-900 mt-1">Escalera Completa</h2>
                  <p className="text-slate-500 text-sm mt-1">
                    Captura general de la escalera como evidencia de entorno.
                  </p>
                </div>

                {!showCamera && !fotoEscalera ? (
                  /* Guía visual */
                  <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex gap-3 text-slate-700">
                      <Maximize className="h-5 w-5 shrink-0 text-slate-500 mt-0.5" />
                      <div className="text-xs leading-relaxed">
                        Esta fotografía aporta evidencia adicional de que el trabajo general en la escalera ha sido terminado.
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Recomendación:
                      </h4>
                      <p className="text-sm text-slate-600">
                        Intente fotografiar la escalera en su totalidad a una distancia prudente de 2 metros.
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 mt-2">
                      <button
                        onClick={() => setShowCamera(true)}
                        className="w-full py-4 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg active:scale-98 transition flex items-center justify-center gap-2 text-base"
                      >
                        <CameraIcon className="h-5 w-5" /> Tomar Fotografía
                      </button>
                      <button
                        onClick={() => {
                          setFotoEscalera(null);
                          avanzar();
                        }}
                        className="w-full py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold active:scale-98 transition"
                      >
                        Omitir Paso
                      </button>
                    </div>
                  </div>
                ) : showCamera ? (
                  <Camera
                    onCapture={(base64) => {
                      setFotoEscalera(base64);
                      setShowCamera(false);
                    }}
                    aspectRatioLabel="ESCALERA COMPLETA"
                  />
                ) : (
                  /* Vista previa */
                  <div className="flex flex-col gap-4">
                    <div className="relative w-full aspect-[3/4] bg-slate-900 rounded-2xl overflow-hidden shadow-md border border-slate-100">
                      <img
                        src={fotoEscalera || undefined}
                        alt="Escalera Completa"
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => {
                          setFotoEscalera(null);
                          setShowCamera(true);
                        }}
                        className="absolute bottom-4 right-4 bg-black/60 hover:bg-red-600 backdrop-blur-md p-3 text-white rounded-full border border-white/10 active:scale-90 transition"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Paso 4: Observaciones */}
            {step === 4 && (
              <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
                      Paso 5 de 6
                    </span>
                    <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      Opcional
                    </span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-900 mt-1">Observaciones</h2>
                  <p className="text-slate-500 text-sm mt-1">
                    Agregue comentarios adicionales sobre el estado de la escalera o el proceso.
                  </p>
                </div>

                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col gap-3">
                  <div className="flex justify-between text-xs font-bold text-slate-400">
                    <span>COMENTARIOS (MÁX. 500 CARACTERES)</span>
                    <span className={observaciones.length > 500 ? 'text-red-500' : ''}>
                      {observaciones.length}/500
                    </span>
                  </div>
                  <textarea
                    rows={6}
                    maxLength={500}
                    placeholder="Detalles sobre adhesión, golpes, etc. (Opcional)"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className="w-full p-4 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm bg-white text-slate-900 leading-relaxed"
                  />
                </div>
              </div>
            )}

            {/* Paso 5: Confirmación */}
            {step === 5 && (
              <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                <div>
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
                    Paso 6 de 6
                  </span>
                  <h2 className="text-2xl font-extrabold text-slate-900 mt-1">Confirmar Registro</h2>
                  <p className="text-slate-500 text-sm mt-1">
                    Verifique el resumen de datos antes de subir.
                  </p>
                </div>

                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
                  {/* Ficha Resumen */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Técnico</h4>
                        <p className="text-base font-bold text-slate-950 mt-0.5">
                          {tecnicoNombre}
                        </p>
                        <p className="text-xs text-slate-500">
                          Central: {central}
                        </p>
                      </div>
                      <div className="bg-indigo-50 px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-700">
                        Distrito: {distrito}
                      </div>
                    </div>

                    <div className="flex justify-between py-1 text-sm border-b border-slate-50">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Binary className="h-4 w-4" /> N° Serie:
                      </span>
                      <span className="font-mono font-bold text-slate-950">{numeroSerie || 'S/N'}</span>
                    </div>

                    <div className="flex justify-between py-1 text-sm border-b border-slate-50">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <User className="h-4 w-4" /> Líder a cargo:
                      </span>
                      <span className="font-semibold text-slate-950">{liderNombre}</span>
                    </div>

                    <div className="flex justify-between py-1 text-sm border-b border-slate-50">
                      <span className="text-slate-500">Fecha y Hora:</span>
                      <span className="font-semibold text-slate-950">
                        {new Date().toLocaleDateString('es-AR')} - {new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {observaciones.trim() && (
                      <div className="pt-2">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5" /> Observaciones:
                        </h4>
                        <p className="text-xs text-slate-600 mt-1 italic leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          "{observaciones}"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Mosaico de fotos */}
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden relative border border-slate-200">
                      <img src={fotoAdvertencia!} alt="Advertencia" className="w-full h-full object-cover" />
                      <span className="absolute bottom-1 left-1 bg-black/60 px-1 py-0.5 rounded text-[8px] font-bold text-white uppercase tracking-wider">
                        Adv.
                      </span>
                    </div>
                    <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden relative border border-slate-200">
                      <img src={fotoNumeroSerie!} alt="Serie" className="w-full h-full object-cover" />
                      <span className="absolute bottom-1 left-1 bg-black/60 px-1 py-0.5 rounded text-[8px] font-bold text-white uppercase tracking-wider">
                        Serie
                      </span>
                    </div>
                    {fotoEscalera ? (
                      <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden relative border border-slate-200">
                        <img src={fotoEscalera || undefined} alt="Escalera" className="w-full h-full object-cover" />
                        <span className="absolute bottom-1 left-1 bg-black/60 px-1 py-0.5 rounded text-[8px] font-bold text-white uppercase tracking-wider">
                          Esc.
                        </span>
                      </div>
                    ) : (
                      <div className="aspect-square bg-slate-50 rounded-lg border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                        <span className="text-[9px] uppercase tracking-wider font-semibold">Sin</span>
                        <span className="text-[9px] uppercase tracking-wider font-semibold">Foto 3</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Botones Fijos de Control (Solo si no está en éxito) */}
      {!guardadoExitoso && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-100 p-4 max-w-md mx-auto w-full flex gap-3 z-30 shadow-lg">
          {step > 0 && (
            <button
              onClick={retroceder}
              disabled={guardando}
              className="py-3.5 px-4 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-1 transition"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}

          {step < totalSteps - 1 ? (
            <button
              onClick={avanzar}
              className="flex-1 py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-xl font-bold shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-1.5 transition"
            >
              Siguiente <ChevronRight className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={guardando}
              className="flex-1 py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 active:scale-[0.98] text-white rounded-xl font-bold shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {guardando ? (
                <>
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" /> Guardar Registro
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
