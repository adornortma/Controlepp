'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Wrench, Briefcase } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-indigo-600 text-white shadow-md py-6">
        <div className="max-w-4xl mx-auto px-6 flex justify-center items-center">
          <h1 className="text-3xl font-extrabold tracking-tight">CONTROL EPP</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-slate-800 mb-8 text-center">
          Seleccione el módulo al que desea ingresar
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          {/* Módulo: Gestión Operativa */}
          <Link href="/registro" className="group">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col items-center text-center transition-all duration-200 hover:shadow-lg hover:border-indigo-300 hover:-translate-y-1 h-full cursor-pointer">
              <div className="h-20 w-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Wrench className="h-10 w-10" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Gestión Operativa</h3>
              <p className="text-slate-500 mb-8 flex-1">
                Registro de escaleras, inspecciones, distritos, células y control de técnicos.
              </p>
              <div className="flex items-center text-blue-600 font-semibold w-full justify-center gap-2 group-hover:gap-3 transition-all">
                Ingresar al módulo <ArrowRight className="h-5 w-5" />
              </div>
            </div>
          </Link>

          {/* Módulo: Tablero de Proyectos */}
          <Link href="/proyectos" className="group">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col items-center text-center transition-all duration-200 hover:shadow-lg hover:border-emerald-300 hover:-translate-y-1 h-full cursor-pointer">
              <div className="h-20 w-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Briefcase className="h-10 w-10" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Tablero de Proyectos</h3>
              <p className="text-slate-500 mb-8 flex-1">
                Visualización y seguimiento de proyectos, avance de obras y gestión centralizada.
              </p>
              <div className="flex items-center text-emerald-600 font-semibold w-full justify-center gap-2 group-hover:gap-3 transition-all">
                Ingresar al módulo <ArrowRight className="h-5 w-5" />
              </div>
            </div>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white py-6 border-t border-slate-200 mt-auto">
        <div className="max-w-4xl mx-auto px-6 text-center text-sm text-slate-500">
          CONTROL EPP &copy; {new Date().getFullYear()} - Sistema Integrado
        </div>
      </footer>
    </div>
  );
}
