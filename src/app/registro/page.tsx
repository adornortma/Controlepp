'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { supabase, Tecnico } from '@/lib/supabase';
import { SearchBar } from '@/components/search-bar';
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
  LogOut,
  Save,
  Trash2,
  Info,
  Camera as CameraIcon
} from 'lucide-react';

export default function RegistroPage() {
  const { user, profile, loading, logout } = useAuth();
  const router = useRouter();

  // Redirigir a login si no está autenticado, o a admin si es administrador
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/login');
      } else if (profile && profile.rol === 'administrador') {
        router.replace('/admin/dashboard');
      }
    }
  }, [user, profile, loading, router]);

  // Estados del Asistente
  const [step, setStep] = useState(0); // 0 a 5
  const [selectedTecnico, setSelectedTecnico] = useState<Tecnico | null>(null);
  const [fotoAdvertencia, setFotoAdvertencia] = useState<string | null>(null);
  const [fotoNumeroSerie, setFotoNumeroSerie] = useState<string | null>(null);
  const [fotoEscalera, setFotoEscalera] = useState<string | null>(null);
  const [numeroSerie, setNumeroSerie] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [guardadoExitoso, setGuardadoExitoso] = useState(false);

  // Carga de cámara activa en cada paso
  const [showCamera, setShowCamera] = useState(false);

  if (loading || !profile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 min-h-screen">
        <span className="h-8 w-8 border-4 border-slate-300 border-t-indigo-600 rounded-full animate-spin"></span>
        <p className="mt-4 text-sm font-medium text-slate-500">Cargando...</p>
      </div>
    );
  }

  // Título e instrucciones de cada paso
  const totalSteps = 6; // Técnico, Advertencia, Serie, Escalera, Obs, Confirmación
  const stepProgress = Math.round(((step + 1) / totalSteps) * 100);

  const avanzar = () => {
    if (step === 0 && !selectedTecnico) {
      toast.error('Debe seleccionar un técnico para continuar');
      return;
    }
    if (step === 1 && !fotoAdvertencia) {
      toast.error('La fotografía de la advertencia es obligatoria');
      return;
    }
    if (step === 2) {
      if (!fotoNumeroSerie) {
        toast.error('La fotografía del número de serie es obligatoria');
        return;
      }
      if (!numeroSerie.trim()) {
        toast.error('Debe ingresar el número de serie de la escalera');
        return;
      }
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
    if (!selectedTecnico || !fotoAdvertencia || !fotoNumeroSerie || !numeroSerie.trim()) {
      toast.error('Faltan completar campos obligatorios o fotografías');
      return;
    }

    setGuardando(true);

    try {
      // 1. Validar en cliente/servidor que existan las fotos obligatorias antes de guardar
      const blobAdvertencia = base64ToBlob(fotoAdvertencia);
      const blobNumeroSerie = base64ToBlob(fotoNumeroSerie);

      if (blobAdvertencia.size < 1000 || blobNumeroSerie.size < 1000) {
        throw new Error('Las imágenes obligatorias no son válidas o están dañadas.');
      }

      // 2. Insertar Registro
      const { data: registro, error: insertError } = await supabase
        .from('registros')
        .insert({
          tecnico_id: selectedTecnico.id,
          usuario_id: user.id,
          numero_serie: numeroSerie.trim(),
          tecnico_nombre: selectedTecnico.nombre,
          tecnico_legajo: selectedTecnico.legajo,
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
    setSelectedTecnico(null);
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
          <h1 className="font-bold text-slate-900 leading-tight">Nueva Inspección</h1>
          <p className="text-xs text-slate-500 font-medium">Líder: {profile.nombre}</p>
        </div>
        <button
          onClick={logout}
          className="p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-slate-50 active:scale-95 transition"
          title="Cerrar sesión"
        >
          <LogOut className="h-5 w-5" />
        </button>
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
                La evidencia fotográfica y el número de serie de la escalera han sido guardados correctamente en el sistema.
              </p>
            </div>

            <div className="w-full border-t border-slate-100 pt-6 flex flex-col gap-3">
              <div className="bg-slate-50 rounded-xl p-4 text-left text-sm flex flex-col gap-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Técnico:</span>
                  <span className="font-semibold text-slate-950">{selectedTecnico?.nombre}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">N° Serie:</span>
                  <span className="font-mono font-semibold text-indigo-600">{numeroSerie}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Imágenes subidas:</span>
                  <span className="font-semibold text-slate-950">
                    {fotoEscalera ? '3 de 3' : '2 de 3'}
                  </span>
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
            {/* Paso 0: Selección de Técnico */}
            {step === 0 && (
              <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                <div>
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
                    Paso 1 de 6
                  </span>
                  <h2 className="text-2xl font-extrabold text-slate-900 mt-1">Seleccionar Técnico</h2>
                  <p className="text-slate-500 text-sm mt-1">
                    Seleccione al técnico sobre el cual realizará el registro.
                  </p>
                </div>
                <SearchBar
                  onSelect={(t) => setSelectedTecnico(t)}
                  selectedTecnicoId={selectedTecnico?.id}
                />
              </div>
            )}

            {/* Paso 1: Advertencia Colocada */}
            {step === 1 && (
              <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                <div>
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
                    Paso 2 de 6
                  </span>
                  <h2 className="text-2xl font-extrabold text-slate-900 mt-1">Señal de Advertencia</h2>
                  <p className="text-slate-500 text-sm mt-1">
                    Evidencia de la etiqueta de advertencia colocada.
                  </p>
                </div>

                {!showCamera && !fotoAdvertencia ? (
                  /* Guía visual */
                  <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
                    <div className="bg-indigo-50 border border-indigo-100/50 rounded-xl p-4 flex gap-3 text-indigo-900">
                      <ShieldAlert className="h-5 w-5 shrink-0 text-indigo-600 mt-0.5" />
                      <div className="text-xs leading-relaxed">
                        <strong className="font-semibold block mb-0.5">Ubicación recomendada:</strong>
                        Debe colocarse visible en la parte frontal del primer tramo de la escalera.
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
                          <span className="text-emerald-500 font-bold text-base">✓</span> No debe tapar el número de serie.
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
                    Fotografía de la placa del fabricante e ingreso del código.
                  </p>
                </div>

                {!showCamera && !fotoNumeroSerie ? (
                  /* Guía visual */
                  <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
                    <div className="bg-indigo-50 border border-indigo-100/50 rounded-xl p-4 flex gap-3 text-indigo-900">
                      <Binary className="h-5 w-5 shrink-0 text-indigo-600 mt-0.5" />
                      <div className="text-xs leading-relaxed">
                        <strong className="font-semibold block mb-0.5">Ubicación del N° de Serie:</strong>
                        Generalmente se encuentra en la etiqueta de características del lateral exterior del larguero.
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

                    <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex flex-col gap-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Escriba el Número de Serie Legible:
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. ESC-100293"
                        value={numeroSerie}
                        onChange={(e) => setNumeroSerie(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono font-semibold text-lg bg-white text-indigo-700 placeholder:text-slate-300"
                      />
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
                          {selectedTecnico?.nombre}
                        </p>
                        <p className="text-xs font-mono text-slate-500">
                          Legajo: {selectedTecnico?.legajo}
                        </p>
                      </div>
                      <div className="bg-indigo-50 px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-700">
                        {selectedTecnico?.distrito}
                      </div>
                    </div>

                    <div className="flex justify-between py-1 text-sm border-b border-slate-50">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Binary className="h-4 w-4" /> N° Serie:
                      </span>
                      <span className="font-mono font-bold text-slate-950">{numeroSerie}</span>
                    </div>

                    <div className="flex justify-between py-1 text-sm border-b border-slate-50">
                      <span className="text-slate-500">Fecha y Hora:</span>
                      <span className="font-semibold text-slate-950">
                        {new Date().toLocaleDateString('es-AR')} - {new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex justify-between py-1 text-sm border-b border-slate-50">
                      <span className="text-slate-500">Fotografías:</span>
                      <span className="font-semibold text-slate-950">
                        {fotoEscalera ? '3' : '2'} (Comprimidas)
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
                  Guardando Registro...
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
