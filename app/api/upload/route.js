import { NextResponse } from 'next/server';
import { handleUpload } from '@vercel/blob/client';
import { getCurrentUser } from '@/lib/auth';

const RULES = {
  image: {
    types: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    max: 8 * 1024 * 1024,
  },
  song: {
    types: ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/ogg', 'audio/wav'],
    max: 15 * 1024 * 1024,
  },
};

export async function POST(request) {
  const body = await request.json();
  try {
    const result = await handleUpload({
      body,
      request,
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
    return NextResponse.json({ error: err?.message || 'Upload failed' }, { status: 400 });
  }
}
