import { NextResponse } from 'next/server';
import { credentialsSchema } from '@/lib/validators';
import { getInstagramCredentials, updateInstagramCredentials } from '@/lib/settings';

export async function GET() {
  const credentials = await getInstagramCredentials();

  if (!credentials) {
    return NextResponse.json({ hasCredentials: false });
  }

  const maskedToken = credentials.accessToken.length > 8
    ? `${credentials.accessToken.slice(0, 4)}...${credentials.accessToken.slice(-4)}`
    : credentials.accessToken;

  return NextResponse.json({
    hasCredentials: true,
    userId: credentials.userId,
    accessTokenPreview: maskedToken,
  });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const parsed = credentialsSchema.safeParse(body);

  if (!parsed.success) {
    const issues = parsed.error.flatten();
    return NextResponse.json({ errors: issues.fieldErrors }, { status: 400 });
  }

  await updateInstagramCredentials(parsed.data);
  return NextResponse.json({ success: true });
}
