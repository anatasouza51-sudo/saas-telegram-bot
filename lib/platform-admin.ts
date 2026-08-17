import "server-only"

import { requireCapability, type SessionUser } from "@/lib/session"

/**
 * Platform control-plane guard. Tenant membership and client-side visibility
 * are never sufficient for changing global payment settings.
 */
export async function requirePlatformAdmin(): Promise<SessionUser> {
  const user = await requireCapability("settings.manage")
  if (user.role !== "admin" || user.ownerId !== null) {
    throw new Error("Apenas o administrador principal pode acessar as configurações da plataforma.")
  }
  return user
}
