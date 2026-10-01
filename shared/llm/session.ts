/** OpenRouter-specific routing hint; other OpenAI-compatible APIs stay unchanged.
 * The persisted conversation ID survives reloads. Separate tasks use separate
 * sessions so a summary/refiner cannot move the chat's sticky provider.
 */
export function conversationSessionOptions(
  baseUrl: string,
  conversationId?: string,
  purpose: 'chat' | 'summary' | 'refiner' = 'chat',
): Record<string, string> {
  if (!conversationId || conversationId.length > 128) return {}
  try {
    const url = new URL(baseUrl)
    if (url.protocol !== 'https:' || url.hostname !== 'openrouter.ai') return {}
  } catch { return {} }
  return { session_id: `rp:${purpose}:${conversationId}` }
}
