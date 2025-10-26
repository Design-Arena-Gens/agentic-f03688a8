import { NextRequest, NextResponse } from 'next/server';
import { getPost, updatePost, deletePost } from '@/lib/posts';
import { updatePostSchema } from '@/lib/validators';

function parseId(id: string) {
  const parsed = Number(id);
  if (Number.isNaN(parsed)) {
    throw new Error('Invalid post id');
  }
  return parsed;
}

async function getIdFromContext(context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return parseId(id);
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const postId = await getIdFromContext(context);
    const post = await getPost(postId);
    if (!post) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ post });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid id';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const postId = await getIdFromContext(context);
    const body = await request.json();
    const parsed = updatePostSchema.safeParse(body);

    if (!parsed.success) {
      const issues = parsed.error.flatten();
      return NextResponse.json({ errors: issues.fieldErrors }, { status: 400 });
    }

    const payload: Parameters<typeof updatePost>[1] = {};

    if (parsed.data.caption !== undefined) {
      payload.caption = parsed.data.caption;
    }
    if (parsed.data.videoUrl !== undefined) {
      payload.videoUrl = parsed.data.videoUrl;
    }
    if (parsed.data.scheduledAt !== undefined) {
      payload.scheduledAt = parsed.data.scheduledAt;
    }

    const updated = await updatePost(postId, payload);
    return NextResponse.json({ post: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid id';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const postId = await getIdFromContext(context);
    await deletePost(postId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid id';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
