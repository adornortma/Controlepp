'use client';

import React, { useState, useEffect } from 'react';
import { Search, User, Landmark, Check } from 'lucide-react';
import { supabase, Tecnico } from '@/lib/supabase';

interface SearchBarProps {
  onSelect: (tecnico: Tecnico) => void;
  selectedTecnicoId?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSelect, selectedTecnicoId }) => {
  const [query, setQuery] = useState('');
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [filtered, setFiltered] = useState<Tecnico[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar técnicos activos desde Supabase
  useEffect(() => {
    const fetchTecnicos = async () => {
      try {
        const { data, error } = await supabase
          .from('tecnicos')
          .select('*')
          .eq('activo', true)
          .order('nombre', { ascending: true });

        if (error) throw error;
        setTecnicos(data || []);
        setFiltered(data || []);
      } catch (err) {
        console.error('Error fetching tecnicos:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTecnicos();
  }, []);

  // Filtrar técnicos localmente
  useEffect(() => {
    const cleanQuery = query.toLowerCase().trim();
    if (!cleanQuery) {
      setFiltered(tecnicos);
      return;
    }

    const matched = tecnicos.filter(
      (t) =>
        t.nombre.toLowerCase().includes(cleanQuery) ||
        t.legajo.toLowerCase().includes(cleanQuery) ||
        (t.distrito && t.distrito.toLowerCase().includes(cleanQuery))
    );
    setFiltered(matched);
  }, [query, tecnicos]);

  return (
    <div className="flex flex-col w-full gap-4">
      {/* Buscador */}
      <div className="relative">
        <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
          <Search className="h-5 w-5" />
        </span>
        <input
          type="text"
          placeholder="Buscar por Nombre o Legajo..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition duration-150 text-base"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 inset-y-0 text-slate-400 hover:text-slate-600 font-medium text-sm my-auto h-fit"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Lista de técnicos */}
      <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex justify-center items-center py-8 text-slate-400 text-sm gap-2">
            <span className="h-4 w-4 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin"></span>
            Cargando técnicos...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            No se encontraron técnicos.
          </div>
        ) : (
          filtered.map((t) => {
            const isSelected = t.id === selectedTecnicoId;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelect(t)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition duration-200 select-none ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600'
                    : 'border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 leading-snug">{t.nombre}</h4>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                      <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                        Legajo: {t.legajo}
                      </span>
                      {t.distrito && (
                        <span className="flex items-center gap-0.5">
                          <Landmark className="h-3 w-3" />
                          {t.distrito}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <div className="h-6 w-6 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                    <Check className="h-4 w-4 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
