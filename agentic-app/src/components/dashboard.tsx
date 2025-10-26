'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';

export type ClientPost = {
  id: number;
  caption: string;
  videoUrl: string;
  scheduledAt: string;
  status: 'PENDING' | 'PROCESSING' | 'PUBLISHED' | 'FAILED';
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  instagramId: string | null;
};

export type CredentialSummary = {
  hasCredentials: boolean;
  userId?: string;
  accessTokenPreview?: string;
};

type ApiPostPayload = Omit<ClientPost, 'failureReason' | 'publishedAt' | 'instagramId'> & {
  failureReason?: string | null;
  publishedAt?: string | null;
  instagramId?: string | null;
};

type Toast = { id: number; message: string; tone: 'success' | 'error' };

const statusColors: Record<ClientPost['status'], string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  PROCESSING: 'bg-sky-100 text-sky-800',
  PUBLISHED: 'bg-emerald-100 text-emerald-800',
  FAILED: 'bg-rose-100 text-rose-800',
};

function formatDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return format(date, 'PPpp');
}

const normalizePost = (post: ApiPostPayload): ClientPost => ({
  id: post.id,
  caption: post.caption,
  videoUrl: post.videoUrl,
  scheduledAt: post.scheduledAt,
  status: post.status,
  failureReason: post.failureReason ?? null,
  createdAt: post.createdAt,
  updatedAt: post.updatedAt,
  publishedAt: post.publishedAt ?? null,
  instagramId: post.instagramId ?? null,
});

export function Dashboard({ initialPosts, initialCredentials }: { initialPosts: ClientPost[]; initialCredentials: CredentialSummary }) {
  const [posts, setPosts] = useState<ClientPost[]>(initialPosts);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [caption, setCaption] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [token, setToken] = useState('');
  const [userId, setUserId] = useState('');
  const [credentials, setCredentials] = useState(initialCredentials);
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [creatingPost, setCreatingPost] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    let current = true;
    async function refreshPosts() {
      setIsLoadingPosts(true);
      try {
        const response = await fetch('/api/posts');
        const data = await response.json();
        if (current && Array.isArray(data.posts)) {
          const mapped = (data.posts as ApiPostPayload[]).map((post) => normalizePost(post));
          setPosts(mapped);
        }
      } finally {
        if (current) {
          setIsLoadingPosts(false);
        }
      }
    }

    refreshPosts();
    const id = setInterval(refreshPosts, 15_000);
    return () => {
      current = false;
      clearInterval(id);
    };
  }, []);

  const scheduleDisabled = useMemo(() => {
    return !caption || !videoUrl || !scheduledAt;
  }, [caption, videoUrl, scheduledAt]);

  const addToast = (message: string, tone: Toast['tone'] = 'success') => {
    setToasts((prev) => [...prev, { id: Date.now(), message, tone }]);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const handleCredentialsSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingCredentials(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: token, userId }),
      });

      if (!response.ok) {
        const data = await response.json();
        const message = data.errors
          ? Object.values<string[]>(data.errors).flat().join(', ')
          : 'Unable to save credentials.';
        throw new Error(message);
      }

      setCredentials({
        hasCredentials: true,
        userId,
        accessTokenPreview: token.length > 8 ? `${token.slice(0, 4)}...${token.slice(-4)}` : token,
      });
      setToken('');
      setUserId('');
      addToast('Instagram credentials saved');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to save credentials', 'error');
    } finally {
      setSavingCredentials(false);
    }
  };

  const handleCreatePost = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreatingPost(true);
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption, videoUrl, scheduledAt }),
      });

      if (!response.ok) {
        const data = await response.json();
        const message = data.errors
          ? Object.values<string[]>(data.errors).flat().join(', ')
          : 'Unable to create post.';
        throw new Error(message);
      }

      const data = await response.json();
      setPosts((prev) => [normalizePost(data.post as ApiPostPayload), ...prev]);
      setCaption('');
      setVideoUrl('');
      setScheduledAt('');
      addToast('Post scheduled');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to schedule post', 'error');
    } finally {
      setCreatingPost(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = confirm('Delete this scheduled post?');
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/posts/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Failed to delete post');
      }
      setPosts((prev) => prev.filter((post) => post.id !== id));
      addToast('Post removed');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to delete post', 'error');
    }
  };

  const handlePublishNow = async (id: number) => {
    try {
      const response = await fetch(`/api/posts/${id}/run`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to trigger publish');
      }
      addToast('Publish triggered');
      setPosts((prev) => prev.map((post) => (post.id === id ? { ...post, status: 'PROCESSING' } : post)));
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to publish now', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-sky-400">Automation studio</p>
            <h1 className="text-2xl font-semibold">Instagram Video Auto-Publisher</h1>
            <p className="mt-1 max-w-xl text-sm text-slate-400">
              Orchestrate your short-form video pipeline, schedule uploads, and push them live automatically via the Instagram Graph API.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-10 md:grid-cols-[360px_1fr]">
        <section className="space-y-6">
          <form onSubmit={handleCredentialsSubmit} className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/30">
            <h2 className="text-lg font-semibold">Instagram Credentials</h2>
            <p className="mt-1 text-sm text-slate-400">
              Provide a long-lived Instagram access token and your Instagram Business Account ID. Credentials are stored encrypted in the project database.
            </p>
            <div className="mt-4 space-y-4">
              <label className="block text-sm font-medium text-slate-200">
                Access Token
                <input
                  type="password"
                  autoComplete="off"
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 shadow-inner focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  placeholder="EAAG..."
                />
              </label>
              <label className="block text-sm font-medium text-slate-200">
                Instagram Business Account ID
                <input
                  type="text"
                  value={userId}
                  onChange={(event) => setUserId(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 shadow-inner focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  placeholder="178414..."
                />
              </label>
            </div>
            {credentials.hasCredentials ? (
              <p className="mt-3 text-xs text-emerald-400">
                Connected as <span className="font-mono">{credentials.userId}</span> • Token {credentials.accessTokenPreview}
              </p>
            ) : (
              <p className="mt-3 text-xs text-amber-400">Credentials not configured.</p>
            )}
            <button
              type="submit"
              disabled={savingCredentials}
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700"
            >
              {savingCredentials ? 'Saving…' : 'Save Credentials'}
            </button>
          </form>

          <form onSubmit={handleCreatePost} className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/30">
            <h2 className="text-lg font-semibold">Schedule Video Post</h2>
            <div className="mt-4 space-y-4">
              <label className="block text-sm font-medium text-slate-200">
                Video URL
                <input
                  type="url"
                  required
                  value={videoUrl}
                  onChange={(event) => setVideoUrl(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 shadow-inner focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  placeholder="https://cdn.yourdomain/video.mp4"
                />
              </label>
              <label className="block text-sm font-medium text-slate-200">
                Caption
                <textarea
                  required
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                  className="mt-1 h-24 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 shadow-inner focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  placeholder="Add hashtags, mentions, and CTAs"
                />
              </label>
              <label className="block text-sm font-medium text-slate-200">
                Scheduled Time
                <input
                  type="datetime-local"
                  required
                  value={scheduledAt}
                  onChange={(event) => setScheduledAt(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 shadow-inner focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={scheduleDisabled || creatingPost}
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700"
            >
              {creatingPost ? 'Scheduling…' : 'Queue Post'}
            </button>
          </form>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Automation Queue</h2>
              <p className="text-sm text-slate-400">Monitor scheduled jobs, rerun failures, or push posts immediately.</p>
            </div>
            <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs text-slate-400">
              {isLoadingPosts ? 'Refreshing…' : `${posts.length} scheduled`}
            </span>
          </div>

          <div className="space-y-3">
            {posts.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/60 p-10 text-center text-sm text-slate-400">
                No scheduled posts yet. Create one to see it here.
              </div>
            )}

            {posts.map((post) => (
              <article key={post.id} className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg shadow-slate-950/20">
                <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColors[post.status]}`}>
                      {post.status}
                    </span>
                    <p className="text-xs text-slate-500">#{post.id}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>Scheduled {formatDate(post.scheduledAt)}</span>
                    {post.publishedAt && <span>• Published {formatDate(post.publishedAt)}</span>}
                    {post.instagramId && <span>• IG ID {post.instagramId}</span>}
                  </div>
                </header>

                <p className="mt-4 whitespace-pre-wrap break-words text-sm text-slate-100">{post.caption}</p>
                <a
                  href={post.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center text-xs font-medium text-sky-400 hover:text-sky-300"
                >
                  {post.videoUrl}
                </a>

                {post.failureReason && (
                  <p className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                    Failure: {post.failureReason}
                  </p>
                )}

                <footer className="mt-4 flex flex-wrap items-center gap-3 text-xs">
                  <button
                    onClick={() => handlePublishNow(post.id)}
                    className="inline-flex items-center rounded-lg bg-sky-500 px-3 py-1.5 font-semibold text-white shadow shadow-sky-500/30 transition hover:bg-sky-400"
                    disabled={post.status === 'PROCESSING'}
                  >
                    Publish Now
                  </button>
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="inline-flex items-center rounded-lg border border-slate-700 px-3 py-1.5 font-semibold text-slate-200 transition hover:border-rose-500 hover:text-rose-300"
                  >
                    Delete
                  </button>
                </footer>
              </article>
            ))}
          </div>
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-4 flex flex-col items-center gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 rounded-full px-4 py-2 text-sm shadow-lg ${
              toast.tone === 'success'
                ? 'bg-emerald-500/10 text-emerald-200 shadow-emerald-500/20'
                : 'bg-rose-500/10 text-rose-200 shadow-rose-500/20'
            }`}
          >
            <span>{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} className="text-xs uppercase tracking-wide text-slate-300">
              Dismiss
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
