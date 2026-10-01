import type { ApiProfile } from '../types'

/** Missing/deleted overrides follow the current global default. */
export function resolveConversationProfile(profiles: ApiProfile[], defaultId: string, overrideId?: string | null): ApiProfile | undefined {
  return profiles.find(profile => profile.id === overrideId)
    ?? profiles.find(profile => profile.id === defaultId)
    ?? profiles[0]
}
