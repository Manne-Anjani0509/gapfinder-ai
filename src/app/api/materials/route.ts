import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabaseServer';

export async function GET(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(req);
    if (!authContext.user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in to access study materials.' }, { status: 401 });
    }
    const userId = authContext.user.id;
    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get('subjectId');

    if (authContext.supabase) {
      let query = authContext.supabase
        .from('materials')
        .select('id, title, file_name, file_type, file_size, word_count, status, created_at, is_demo')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (subjectId) {
        query = query.eq('subject_id', subjectId);
      }

      const { data, error } = await query;
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, materials: data || [] });
    }

    // Local / fallback mode
    return NextResponse.json({
      success: true,
      materials: [],
      storageMode: 'Local Browser Storage',
    });
  } catch (err: any) {
    console.error('Materials GET route error:', err);
    return NextResponse.json({ error: err.message || 'Failed to list materials' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(req);
    if (!authContext.user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in to delete materials.' }, { status: 401 });
    }
    const userId = authContext.user.id;
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await req.json();
        id = body.id;
      } catch {
        // no body provided
      }
    }

    if (!id) {
      return NextResponse.json({ error: 'Material ID is required for deletion.' }, { status: 400 });
    }

    if (authContext.supabase) {
      const { error } = await authContext.supabase
        .from('materials')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: any) {
    console.error('Materials DELETE route error:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete material' }, { status: 500 });
  }
}
