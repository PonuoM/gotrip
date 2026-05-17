// ==========================================================================
// Permission helpers · check user roles in a trip
// ==========================================================================
import type { TripMember } from './database.types'

export type Role = 'owner' | 'editor' | 'viewer'

const ROLE_LEVEL: Record<Role, number> = {
  viewer: 1,
  editor: 2,
  owner:  3,
}

export function hasRole(member: TripMember | null | undefined, required: Role): boolean {
  if (!member) return false
  return ROLE_LEVEL[member.role as Role] >= ROLE_LEVEL[required]
}

export function canEdit(member: TripMember | null | undefined): boolean {
  return hasRole(member, 'editor')
}

export function canManage(member: TripMember | null | undefined): boolean {
  return hasRole(member, 'owner')
}
