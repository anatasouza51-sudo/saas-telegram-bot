import "server-only"

import { requireCapability, type SessionUser } from "@/lib/session"

export const PLATFORM_ADMIN_EMAIL = "anatasouza51@gmail.com"

export function isPlatformAdmin(user: Pick<SessionUser, "role" | "ownerId" | "email">) {
  return (
    user.role === "admin" &&
    user.ownerId === null &&
    user.email.trim().toLowerCase() === PLATFORM_ADMIN_EMAIL
  )
}

/**
 * Platform control-plane guard. Tenant membership, role-only checks and
 * client-side visibility are never sufficient for entering the control plane.
 */
export async function requirePlatformAdmin(): Promise<SessionUser> {
  const user = await requireCapability("settings.manage")
  if (!isPlatformAdmin(user)) {
    throw new Error("Apenas o administrador autorizado pode acessar o Control Plane.")
  }
  return user
}
