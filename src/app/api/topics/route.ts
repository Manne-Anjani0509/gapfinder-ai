import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabaseServer';

export async function GET(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(req);
    if (!authContext.user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }
    const userId = authContext.user.id;
    const { searchParams } = new URL(req.url);
    const materialId = searchParams.get('materialId');
    const subjectId = searchParams.get('subjectId');

    if (authContext.supabase) {
      let query = authContext.supabase
        .from('topics')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (materialId) query = query.eq('material_id', materialId);
      if (subjectId) query = query.eq('subject_id', subjectId);

      const { data, error } = await query;
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, topics: data || [] });
    }

    return NextResponse.json({
      success: true,
      topics: [],
      storageMode: 'Local Browser Storage',
    });
  } catch (err: any) {
    console.error('Topics GET route error:', err);
    return NextResponse.json({ error: err.message || 'Failed to list topics' }, { status: 500 });
  }
}
