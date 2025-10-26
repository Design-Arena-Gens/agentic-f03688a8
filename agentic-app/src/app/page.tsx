import { Dashboard, type ClientPost, type CredentialSummary } from '@/components/dashboard';
import { listPosts } from '@/lib/posts';
import { getInstagramCredentials } from '@/lib/settings';

async function loadInitialData() {
  const [posts, credentials] = await Promise.all([listPosts(), getInstagramCredentials()]);

  const mappedPosts: ClientPost[] = posts.map((post) => ({
    ...post,
    scheduledAt: post.scheduledAt.toISOString(),
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
  }));

  const credentialSummary: CredentialSummary = credentials
    ? {
        hasCredentials: true,
        userId: credentials.userId,
        accessTokenPreview:
          credentials.accessToken.length > 8
            ? `${credentials.accessToken.slice(0, 4)}...${credentials.accessToken.slice(-4)}`
            : credentials.accessToken,
      }
    : { hasCredentials: false };

  return { posts: mappedPosts, credentialSummary };
}

export default async function Page() {
  const { posts, credentialSummary } = await loadInitialData();
  return <Dashboard initialPosts={posts} initialCredentials={credentialSummary} />;
}
