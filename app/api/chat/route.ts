import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are Popoy, the friendly AI assistant for CheMuLab, an interactive chemistry learning platform. 
Your goal is to help users explore elements, discover reactions, and navigate the app.

TONE: Friendly, enthusiastic, and helpful. Use lab-related metaphors.

KNOWLEDGE BASE SUMMARY:
- Element Discovery: Database of elements with search.
- Your Lab: Combine elements for new reactions.
- Games: Reaction Quiz, Periodic Puzzle, Whack-a-Mole.
- Progress: Tracks milestones and achievements.
- Friends: Social learning with friends.
- Profile: Custom avatars and verification status.

Always keep explanations simple but scientifically accurate.`;

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey === 'your_openrouter_api_key_here') {
    return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 500 });
  }

  const { message } = await request.json();
  if (!message || typeof message !== 'string') {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
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

    if (res.ok) {
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        return NextResponse.json({ response: content });
      }
    } else {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || res.statusText);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[chat] OpenRouter failed:`, msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  return NextResponse.json({ error: 'No response from model' }, { status: 502 });
}

