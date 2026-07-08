'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Camera as CameraIcon, RotateCw, AlertTriangle, Upload, RefreshCw } from 'lucide-react';
import { compressImage } from '@/utils/image-compression';

interface CameraProps {
  onCapture: (base64Image: string) => void;
  aspectRatioLabel?: string;
  idealHeight?: number;
}

export const Camera: React.FC<CameraProps> = ({ onCapture, aspectRatioLabel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [usingFallback, setUsingFallback] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Iniciar la cámara cuando el usuario lo solicite
  const startCamera = async () => {
    setLoading(true);
    setUsingFallback(false);
    try {
      // Detener cualquier stream anterior
      stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasPermission(true);
      setIsCameraActive(true);
    } catch (error) {
      console.error('Error al acceder a la cámara:', error);
      setHasPermission(false);
      setUsingFallback(true);
    } finally {
      setLoading(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    // Intentar iniciar la cámara al cargar, pero si falla o no hay permiso, se habilitará el fallback
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const handleCapture = async () => {
    if (!videoRef.current || !streamRef.current) return;
    setLoading(true);

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        // Si la cámara del móvil está girada
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        
        // Comprimir antes de enviar
        const compressedBlob = await compressImage(dataUrl);
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            onCapture(reader.result);
          }
        };
        reader.readAsDataURL(compressedBlob);
        stopCamera();
      }
    } catch (e) {
      console.error('Error al capturar la imagen:', e);
    } finally {
      setLoading(false);
    }
  };

  // Manejo de carga de archivos (Fallback de cámara nativa en móvil)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const compressedBlob = await compressImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          onCapture(reader.result);
        }
      };
      reader.readAsDataURL(compressedBlob);
    } catch (err) {
      console.error('Error procesando imagen subida:', err);
    } finally {
      setLoading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto bg-slate-900 rounded-2xl overflow-hidden shadow-xl aspect-[3/4] relative border border-slate-800">
      {/* Campo oculto para fallback en móviles */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 z-20 text-white gap-3 backdrop-blur-sm">
          <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm font-medium">Procesando imagen...</p>
        </div>
      )}

      {usingFallback ? (
        // Fallback UI
        <div className="flex flex-col items-center justify-center p-6 text-center h-full text-slate-300 gap-4">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
            <Upload className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Capturar con Cámara Nativa</h3>
            <p className="text-xs text-slate-400 mt-1 px-4">
              Para máxima compatibilidad y calidad, abriremos la cámara de tu teléfono móvil.
            </p>
          </div>
          <button
            type="button"
            onClick={triggerFileInput}
            className="mt-2 w-full max-w-xs py-3.5 px-6 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-xl font-medium shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] transition duration-200"
          >
            Abrir Cámara del Dispositivo
          </button>
        </div>
      ) : (
        // Real-time camera preview
        <>
          <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
            {isCameraActive ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-slate-500 text-sm">Cámara no iniciada</div>
            )}
            
            {aspectRatioLabel && (
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-medium text-white tracking-wider border border-white/10 uppercase">
                {aspectRatioLabel}
              </div>
            )}
          </div>

          {/* Panel de Controles Inferior */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-6 flex items-center justify-between z-10">
            <button
              type="button"
              onClick={triggerFileInput}
              className="p-3 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-full transition duration-150 border border-white/10"
              title="Cargar archivo"
            >
              <Upload className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={handleCapture}
              disabled={loading || !isCameraActive}
              className="p-5 bg-white hover:bg-slate-100 disabled:bg-slate-500 disabled:opacity-50 text-slate-950 rounded-full transition duration-150 shadow-2xl scale-110 active:scale-95"
              title="Tomar Foto"
            >
              <CameraIcon className="h-7 w-7 stroke-[2.5]" />
            </button>

            <button
              type="button"
              onClick={startCamera}
              className="p-3 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-full transition duration-150 border border-white/10"
              title="Reiniciar Cámara"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};
