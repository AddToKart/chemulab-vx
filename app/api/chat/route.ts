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
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
  }

  const { message } = await request.json();
  if (!message || typeof message !== 'string') {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  const modelsToTry = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-flash-latest'];
  let lastError = '';

  for (const model of modelsToTry) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ parts: [{ text: message }] }],
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
          return NextResponse.json({ response: data.candidates[0].content.parts[0].text });
        }
      } else if (res.status !== 404) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error?.message || res.statusText);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[chat] ${model} failed:`, msg);
      lastError = msg;
    }
  }

  return NextResponse.json({ error: lastError || 'No working model found' }, { status: 502 });
}
