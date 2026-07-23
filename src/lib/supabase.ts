import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tkeockqfxlelrzviltkt.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);


export type RolUsuario = 'lider' | 'administrador';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  activo: boolean;
  created_at: string;
}

export interface Tecnico {
  id: string;
  legajo: string;
  nombre: string;
  distrito: string | null;
  celula: string | null;
  lider_id: string | null;
  activo: boolean;
  created_at: string;
  usuarios?: Usuario;
}

export interface Registro {
  id: string;
  tecnico_id: string | null;
  usuario_id: string | null;
  numero_serie: string;
  tecnico_nombre: string;
  tecnico_legajo: string | null;
  central?: string | null;
  lider_nombre?: string | null;
  distrito?: string | null;
  estado: 'pendiente' | 'aprobado' | 'observado';
  observaciones: string | null;
  created_at: string;
  tecnicos?: Tecnico;
  usuarios?: Usuario;
  fotos?: Foto[];
}


export interface Foto {
  id: string;
  registro_id: string;
  tipo: 'advertencia' | 'numero_serie' | 'escalera';
  url: string;
  created_at: string;
}
