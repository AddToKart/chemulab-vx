import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are Popoy, the friendly AI assistant for CheMuLab, an interactive chemistry learning platform.
Your goal is to help users explore elements, discover reactions, and navigate the app.

TONE: Friendly, enthusiastic, and helpful. Use lab-related metaphors.

KNOWLEDGE BASE SUMMARY:
- Element Discovery: Database of elements with search.
- Your Lab: Combine elements for new reactions.
- Games: Reaction Quiz, Periodic Puzzle.
- Progress: Tracks milestones and achievements.
- Friends: Social learning with friends.
- Profile: Custom avatars and verification status.

Always keep explanations simple but scientifically accurate.`;

const MAX_MESSAGE_LENGTH = 1_000;

function isSameOriginRequest(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (!origin) return true;

  try {
    const originUrl = new URL(origin);
    const requestUrl = new URL(request.url);
    return originUrl.host === requestUrl.host;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey === 'your_openrouter_api_key_here') {
    return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 500 });
  }

  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Cross-origin requests are not allowed' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const message = typeof body?.message === 'string' ? body.message.trim() : '';

  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: 'Message is too long' }, { status: 400 });
  }

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: AbortSignal.timeout(15_000),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'X-Title': 'CheMuLab',
      },
      body: JSON.stringify({
        model: 'nvidia/nemotron-3-nano-30b-a3b:free',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: message },
        ],
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || res.statusText);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (typeof content === 'string' && content.trim()) {
      return NextResponse.json({ response: content });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[chat] OpenRouter failed:', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  return NextResponse.json({ error: 'No response from model' }, { status: 502 });
}
