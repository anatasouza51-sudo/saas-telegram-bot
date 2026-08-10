/**
 * Módulo isolado que reexporta getSessionUser MEMOIZADA com cache() do React
 * sem chave de sessão — reproduzindo exatamente a implementação antiga e
 * vulnerável de lib/session.ts. Usado apenas pelo teste de prova do bug.
 */
import "server-only"
import { cache } from "react"
import { getSessionUser as originalGetSessionUser } from "@/lib/session"

export const getSessionUser = cache(async () => originalGetSessionUser())
