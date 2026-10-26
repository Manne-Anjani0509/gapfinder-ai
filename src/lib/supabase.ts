import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('https://') &&
    !supabaseUrl.includes('your-project') &&
    supabaseAnonKey.length > 20
  );
}

let supabase: SupabaseClient | null = null;
if (isSupabaseConfigured()) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
  }
}

export { supabase };

export interface StorageAdapter {
  isCloud: boolean;
  saveMaterials: (materials: any[]) => Promise<void>;
  getMaterials: () => Promise<any[]>;
  saveQuizSubmission: (sub: any) => Promise<void>;
  getQuizSubmissions: () => Promise<any[]>;
}
