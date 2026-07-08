import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

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
  activo: boolean;
  created_at: string;
}

export interface Registro {
  id: string;
  tecnico_id: string;
  usuario_id: string;
  numero_serie: string;
  tecnico_nombre: string;
  tecnico_legajo: string;
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
