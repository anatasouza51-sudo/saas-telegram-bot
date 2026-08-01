"use client"

// Clerk client helpers — thin wrapper so existing imports keep working.
export const authClient = {
  signIn: {
    email: async (_params: { email: string; password: string }) => {
      // No longer used — the sign-in page calls Clerk directly.
      return { error: null }
    },
  },
  signUp: {
    email: async (_params: { email: string; password: string; name: string }) => {
      return { error: null }
    },
  },
  signOut: async () => {
    // Placeholder — use Clerk's useClerk().signOut() directly in components.
  },
  forgetPassword: async (_params: { email: string; redirectTo: string }) => {
    return { error: null }
  },
  useSession: () => {
    return { data: null, isLoaded: true }
  },
}

export const { signIn, signUp, signOut, useSession } = authClient
