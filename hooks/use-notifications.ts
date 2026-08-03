"use client"

import { useState, useEffect, useCallback } from "react"
import type { Notification } from "@/components/notifications-popover"

const STORAGE_KEY = "ghostbot_notifications"
const READ_KEY = "ghostbot_notifications_read"

// Default notifications for new users
function getDefaultNotifications(): Notification[] {
  return [
    {
      id: "welcome-1",
      title: "Bem-vindo ao GHOST BOT!",
      message: "Seu painel está pronto. Configure seu bot Telegram para começar a vender.",
      time: "agora",
      read: false,
      type: "info",
    },
    {
      id: "welcome-2",
      title: "Dica: Configure grupos e canais",
      message: "Adicione o bot a grupos ou canais do Telegram e eles aparecerão automaticamente.",
      time: "agora",
      read: false,
      type: "info",
    },
  ]
}

function loadNotifications(): Notification[] {
  if (typeof window === "undefined") return getDefaultNotifications()
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {}
  const defaults = getDefaultNotifications()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults))
  return defaults
}

function loadRead(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const stored = localStorage.getItem(READ_KEY)
    if (stored) return new Set(JSON.parse(stored))
  } catch {}
  return new Set()
}

function saveRead(read: Set<string>) {
  if (typeof window === "undefined") return
  localStorage.setItem(READ_KEY, JSON.stringify([...read]))
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [readIds, setReadIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    setNotifications(loadNotifications())
    setReadIds(loadRead())
  }, [])

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) =>
        n.id === id ? { ...n, read: true } : n
      )
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      return updated
    })
    setReadIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      saveRead(next)
      return next
    })
  }, [])

  const clearAll = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setNotifications([])
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]))
  }, [])

  const addNotification = useCallback((notif: Omit<Notification, "id" | "read" | "time">) => {
    const newNotif: Notification = {
      ...notif,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      read: false,
      time: "agora",
    }
    setNotifications((prev) => {
      const updated = [newNotif, ...prev].slice(0, 50)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  return { notifications, unreadCount, markAsRead, clearAll, addNotification }
}
