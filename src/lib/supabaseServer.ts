import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export function isSupabaseServerConfigured(): boolean {
  return Boolean(
    supabaseUrl &&
      supabaseUrl.startsWith('https://') &&
      !supabaseUrl.includes('your-project') &&
      (supabaseAnonKey.length > 20 || supabaseServiceKey.length > 20)
  );
}

/**
 * Creates an admin / service-role Supabase client for secure backend operations.
 * NEVER expose this to the browser or client-side components.
 */
export function createAdminClient(): SupabaseClient | null {
  if (!isSupabaseServerConfigured()) return null;
  const key = supabaseServiceKey || supabaseAnonKey;
  return createClient(supabaseUrl, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Creates a scoped Supabase client with the caller's JWT token for RLS enforcement.
 */
export function createUserClient(accessToken: string): SupabaseClient | null {
  if (!isSupabaseServerConfigured() || !accessToken) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
    },
  });
}

export interface AuthContext {
  user: User | { id: string; email: string } | null;
  isLocal: boolean;
  accessToken?: string;
  supabase: SupabaseClient | null;
}

/**
 * Extracts and verifies the authenticated user from the NextRequest.
 * If Supabase is not configured or in local/demo development, safely returns
 * a local student identity with isLocal: true.
 */
export async function getAuthenticatedUser(req: NextRequest): Promise<AuthContext> {
  const authHeader = req.headers.get('authorization') || '';
  const isDemo = req.headers.get('x-demo-mode') === 'true';

  if (isDemo) {
    return {
      user: {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'demo.student@gapfinder.ai',
      },
      isLocal: true,
      supabase: null,
    };
  }

  // If Supabase is genuinely not configured in server environment, fallback to local
  if (!isSupabaseServerConfigured()) {
    return {
      user: {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'local.student@gapfinder.ai',
      },
      isLocal: true,
      supabase: null,
    };
  }

  // Extract bearer token from Authorization header or cookie
  let token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    token = req.cookies.get('sb-access-token')?.value || '';
  }

  if (!token) {
    return {
      user: null,
      isLocal: false,
      supabase: null,
    };
  }

  const client = createUserClient(token);
  if (!client) {
    return {
      user: null,
      isLocal: false,
      supabase: null,
    };
  }

  const { data: { user }, error } = await client.auth.getUser(token);

  if (error || !user) {
    return {
      user: null,
      isLocal: false,
      supabase: null,
    };
  }

  return {
    user,
    isLocal: false,
    accessToken: token,
    supabase: client,
  };
}
