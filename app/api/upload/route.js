import { NextResponse } from 'next/server';
import { handleUpload } from '@vercel/blob/client';
import { getCurrentUser } from '@/lib/auth';

const RULES = {
  image: {
    types: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    max: 8 * 1024 * 1024,
  },
  video: {
    types: ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'],
    // Videos are big and cost storage + bandwidth. Change the limit with VIDEO_MAX_MB in Vercel.
    max: Math.max(5, Math.min(500, parseInt(process.env.VIDEO_MAX_MB || '100', 10) || 100)) * 1024 * 1024,
  },
  song: {
    types: ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/ogg', 'audio/wav'],
    max: 15 * 1024 * 1024,
  },
};

/** The Blob key, tidied up in case it was pasted with quotes or spaces. */
function blobToken() {
  let t = process.env.BLOB_READ_WRITE_TOKEN;
  if (!t) {
    // Accept a prefixed name, e.g. MYSTORE_READ_WRITE_TOKEN.
    const key = Object.keys(process.env).find((k) => k.endsWith('_READ_WRITE_TOKEN') && process.env[k]);
    t = key ? process.env[key] : '';
  }
  return String(t || '').trim().replace(/^["']|["']$/g, '').trim();
}

/** Diagnostic: visit /api/upload in the browser to see why uploads fail. Never reveals the key. */
export async function GET() {
  const user = await getCurrentUser();
  const token = blobToken();
  const problems = [];
  if (!token) problems.push('No BLOB_READ_WRITE_TOKEN found. Connect a Blob store (Storage tab), then redeploy.');
  else if (!token.startsWith('vercel_blob_rw_')) problems.push('BLOB_READ_WRITE_TOKEN does not look right. It should start with vercel_blob_rw_. Copy it again from the Blob store page, then redeploy.');
  if (!user) problems.push('You are not logged in on this browser.');
  return NextResponse.json({
    uploadsReady: problems.length === 0,
    tokenFound: !!token,
    tokenLooksValid: token.startsWith('vercel_blob_rw_'),
    loggedIn: !!user,
    problems,
  });
}

export async function POST(request) {
  const token = blobToken();
  if (!token) {
    return NextResponse.json(
      { error: 'Uploads are not set up yet: connect a Blob store in Vercel (Storage tab). You can paste a link instead.' },
      { status: 400 }
    );
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Bad upload request.' }, { status: 400 });
  }
  try {
    const result = await handleUpload({
      body,
      request,
      token,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const user = await getCurrentUser();
        if (!user) throw new Error('Please log in first.');
        const rule = RULES[clientPayload];
        if (!rule) throw new Error('Unsupported upload type.');
        return {
          allowedContentTypes: rule.types,
          maximumSizeInBytes: rule.max,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: user.id }),
        };
      },
      onUploadCompleted: async () => {
        // The browser saves the link through the form, so nothing to do here.
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error('[upload] failed:', err);
    return NextResponse.json({ error: err?.message || 'Upload failed' }, { status: 400 });
  }
}
