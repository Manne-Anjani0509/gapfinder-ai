import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabaseServer';
import { z } from 'zod';

const UpdateTaskSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
  completed: z.boolean(),
});

export async function PATCH(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(req);
    if (!authContext.user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }
    const userId = authContext.user.id;
    const body = await req.json();

    const parseResult = UpdateTaskSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || 'Invalid task update payload' },
        { status: 400 }
      );
    }

    const { taskId, completed } = parseResult.data;

    if (authContext.supabase) {
      const { error } = await authContext.supabase
        .from('revision_tasks')
        .update({
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq('id', taskId)
        .eq('user_id', userId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      taskId,
      completed,
      message: 'Task completion status updated.',
    });
  } catch (err: any) {
    console.error('Task update error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to update revision task status.' },
      { status: 500 }
    );
  }
}
