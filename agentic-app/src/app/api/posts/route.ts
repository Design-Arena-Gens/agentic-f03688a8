import { NextResponse } from 'next/server';
import { postInputSchema } from '@/lib/validators';
import { createPost, listPosts } from '@/lib/posts';

export async function GET() {
  const posts = await listPosts();
  return NextResponse.json({ posts });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = postInputSchema.safeParse(body);

  if (!parsed.success) {
    const issues = parsed.error.flatten();
    return NextResponse.json({ errors: issues.fieldErrors }, { status: 400 });
  }

  const result = await createPost(parsed.data);
  return NextResponse.json({ post: result });
}
