export type ReasoningEffort = 'default' | 'none' | 'low' | 'medium' | 'high'

/** JoyFox's roleplay preset is trained and recommended in non-thinking mode. */
export function defaultReasoningEffort(model: string): ReasoningEffort {
  return /joyfox-qwen3\.6-35b-a3b-rp-aggressive/i.test(model) ? 'none' : 'default'
}

export function modelOptions(model: string, selected?: string): Record<string, unknown> {
  const effort = selected ?? defaultReasoningEffort(model)
  return ['none', 'low', 'medium', 'high'].includes(effort)
    ? { reasoning_effort: effort }
    : {}
}
