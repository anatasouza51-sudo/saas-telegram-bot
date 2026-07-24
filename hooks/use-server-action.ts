"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/errors"

type RunOptions = {
  /** Toast shown when the action resolves without throwing. */
  success?: string
  /** Fallback message when the thrown value carries none. */
  error?: string
  onSuccess?: () => void
}

/**
 * Runs a server action inside a transition with the panel's standard feedback:
 * a success toast on completion and an error toast built from the thrown value.
 */
export function useServerAction() {
  const [pending, startTransition] = useTransition()

  function run(action: () => Promise<unknown>, options: RunOptions = {}) {
    startTransition(async () => {
      try {
        await action()
        if (options.success) toast.success(options.success)
        options.onSuccess?.()
      } catch (err) {
        toast.error(getErrorMessage(err, options.error))
      }
    })
  }

  return { pending, run }
}
