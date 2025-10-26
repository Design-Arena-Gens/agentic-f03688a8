import { NextRequest, NextResponse } from 'next/server';
import { getPost, markFailed, markProcessing, markPublished } from '@/lib/posts';
import { getInstagramCredentials } from '@/lib/settings';
import { publishVideo } from '@/lib/instagram';

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

export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const postId = await getIdFromContext(context);
    const post = await getPost(postId);

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const credentials = await getInstagramCredentials();

    if (!credentials) {
      return NextResponse.json({ error: 'Instagram credentials are not configured.' }, { status: 400 });
    }

    await markProcessing(postId);

    const result = await publishVideo({
      caption: post.caption,
      videoUrl: post.videoUrl,
      accessToken: credentials.accessToken,
      userId: credentials.userId,
    });

    if (result.status === 'failed') {
      await markFailed(postId, result.reason);
      return NextResponse.json({ error: result.reason }, { status: 502 });
    }

    await markPublished(postId, result.instagramId);

    return NextResponse.json({ success: true, instagramId: result.instagramId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
