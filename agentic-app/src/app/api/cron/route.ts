import { NextResponse } from 'next/server';
import { getInstagramCredentials } from '@/lib/settings';
import { getDuePosts, markFailed, markProcessing, markPublished } from '@/lib/posts';
import { publishVideo } from '@/lib/instagram';

const CRON_SECRET_HEADER = 'x-cron-secret';

export async function POST(request: Request) {
  if (process.env.CRON_SECRET) {
    const provided = request.headers.get(CRON_SECRET_HEADER);
    if (provided !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const credentials = await getInstagramCredentials();
  if (!credentials) {
    return NextResponse.json({ error: 'Instagram credentials are not configured.' }, { status: 400 });
  }

  const duePosts = await getDuePosts();

  if (!duePosts.length) {
    return NextResponse.json({ processed: 0, successes: 0, failures: 0 });
  }

  let successes = 0;
  let failures = 0;

  for (const post of duePosts) {
    await markProcessing(post.id);
    const result = await publishVideo({
      caption: post.caption,
      videoUrl: post.videoUrl,
      accessToken: credentials.accessToken,
      userId: credentials.userId,
    });

    if (result.status === 'failed') {
      failures += 1;
      await markFailed(post.id, result.reason);
      continue;
    }

    successes += 1;
    await markPublished(post.id, result.instagramId);
  }

  return NextResponse.json({ processed: duePosts.length, successes, failures });
}
