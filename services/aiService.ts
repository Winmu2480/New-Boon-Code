import { Post, ChatMessage, DealResult } from '../types';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';

// ─── System Prompt ─────────────────────────────────────────────────────────
const DEAL_FINDER_SYSTEM_PROMPT = `You are Boon's AI Deal Finder — a savvy, friendly shopping assistant.

Your job is to help users:
1. Find coupon codes and discounts for stores they've discovered
2. Find the same or similar products at better prices elsewhere
3. Track price drops and notify when deals expire
4. Suggest related stores and products based on user taste

When given a post context (store name + URL), proactively:
- Search for active coupon codes for that store
- Compare prices across major retailers
- Identify if the URL leads to a sale or regular-priced item
- Suggest the best time to buy (seasonal sales, etc.)

Format deal results as JSON when found:
{
  "deals": [
    {
      "source": "RetailMeNot",
      "title": "20% off sitewide",
      "code": "SAVE20",
      "discount": "20%",
      "url": "https://...",
      "expiresAt": "2024-12-31"
    }
  ]
}

Be conversational, concise, and enthusiastic about deals. Use emojis sparingly but effectively.
Always cite your sources. If you can't find deals, say so honestly and suggest alternatives.`;

// ─── Chat with Streaming ──────────────────────────────────────────────────
export const sendDealFinderMessage = async (
  messages: ChatMessage[],
  attachedPost: Post | null,
  onChunk: (chunk: string) => void,
  onComplete: (fullResponse: string, deals: DealResult[]) => void,
  onError: (error: string) => void
) => {
  try {
    // Build messages for OpenAI
    const systemMessage = {
      role: 'system',
      content: DEAL_FINDER_SYSTEM_PROMPT,
    };

    const conversationMessages = messages
      .filter((m) => !m.isLoading)
      .map((m) => {
        let content = m.content;
        if (m.attachedPost) {
          content += `\n\n[Shared Post Context]\nStore: ${m.attachedPost.storeName}\nURL: ${m.attachedPost.storeUrl}\nCaption: ${m.attachedPost.caption}`;
        }
        return { role: m.role, content };
      });

    // Add current post context if attached
    const latestUserMsg = conversationMessages[conversationMessages.length - 1];
    if (attachedPost && latestUserMsg?.role === 'user') {
      latestUserMsg.content += `\n\n[Attached Post]\nStore: ${attachedPost.storeName}\nURL: ${attachedPost.storeUrl}\nCaption: ${attachedPost.caption}`;
    }

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [systemMessage, ...conversationMessages],
        stream: true,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    // Stream the response
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    if (!reader) throw new Error('No response body');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter((l) => l.startsWith('data: '));

      for (const line of lines) {
        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content || '';
          if (delta) {
            fullText += delta;
            onChunk(delta);
          }
        } catch {
          // Skip malformed chunks
        }
      }
    }

    // Extract deal results from JSON in response
    const deals = extractDeals(fullText);
    onComplete(fullText, deals);
  } catch (err: any) {
    onError(err.message || 'Something went wrong with the Deal Finder');
  }
};

// ─── Extract Structured Deals from Response ──────────────────────────────
const extractDeals = (text: string): DealResult[] => {
  try {
    const jsonMatch = text.match(/\{[\s\S]*"deals"[\s\S]*\}/);
    if (!jsonMatch) return [];
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.deals || [];
  } catch {
    return [];
  }
};

// ─── URL Validation ──────────────────────────────────────────────────────
export const validateUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

export const normalizeUrl = (url: string): string => {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
};
