import type { Profile, Site } from '@/types/crm'

export function profileDisplayName(
  profile: Profile | undefined,
  fallbackId: string,
): string {
  if (!profile) return fallbackId
  return profile.full_name ?? profile.email ?? fallbackId
}

export function formatFieldHistoryValue(
  fieldName: string,
  value: string | null | undefined,
  ctx: { profiles: Map<string, Profile>; sites: Map<string, Site> },
): string {
  if (value == null || value === '') return '—'
  if (fieldName === 'assignee_id') {
    return profileDisplayName(ctx.profiles.get(value), value)
  }
  if (fieldName === 'site_id') {
    return ctx.sites.get(value)?.title ?? value
  }
  return value
}
