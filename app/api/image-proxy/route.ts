import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_ALLOWED_HOSTS = new Set(['images.unsplash.com', 'lh3.googleusercontent.com']);

function getAllowedHosts() {
  const configured = process.env.IMAGE_PROXY_ALLOWED_HOSTS
    ?.split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);

  return new Set(configured?.length ? configured : Array.from(DEFAULT_ALLOWED_HOSTS));
}

function parseImageUrl(rawUrl: string) {
  let parsed: URL;

  try {
    parsed = new URL(rawUrl);
  } catch {
    return { error: 'Invalid url parameter' } as const;
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { error: 'Only http and https URLs are allowed' } as const;
  }

  if (!getAllowedHosts().has(parsed.hostname.toLowerCase())) {
    return { error: 'Host is not allowed' } as const;
  }

  return { parsed } as const;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  const result = parseImageUrl(imageUrl);
  if ('error' in result) {
    return new NextResponse(result.error, { status: 400 });
  }

  try {
    const response = await fetch(result.parsed, {
      signal: AbortSignal.timeout(8_000),
      headers: {
        Accept: 'image/*',
      },
    });

    if (!response.ok) {
      return new NextResponse(`Failed to fetch image: ${response.statusText}`, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    if (!contentType.startsWith('image/')) {
      return new NextResponse('Upstream URL did not return an image', { status: 415 });
    }

    const blob = await response.blob();

    return new NextResponse(blob, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
