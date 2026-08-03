"use client"

import React, { useState, useEffect, useCallback } from "react"
import { NotificationsPopover } from "@/components/notifications-popover"

function useConnectedNotifications() {
  const [state, setState] = useState(() => {
    if (typeof window === "undefined") return { notifications: [], unreadCount: 0 }
    try {
      const stored = localStorage.getItem("ghostbot_notifications")
      const notifications = stored ? JSON.parse(stored) : getDefaultNotifications()
      if (!stored) {
        localStorage.setItem("ghostbot_notifications", JSON.stringify(notifications))
      }
      return {
        notifications,
        unreadCount: notifications.filter((n: any) => !n.read).length,
      }
    } catch {
      const defaults = getDefaultNotifications()
      localStorage.setItem("ghostbot_notifications", JSON.stringify(defaults))
      return { notifications: defaults, unreadCount: defaults.filter((n) => !n.read).length }
    }
  })

  useEffect(() => {
    const handler = () => {
      try {
        const stored = localStorage.getItem("ghostbot_notifications")
        const notifications = stored ? JSON.parse(stored) : []
        setState({
          notifications,
          unreadCount: notifications.filter((n: any) => !n.read).length,
        })
      } catch {}
    }
    const interval = setInterval(handler, 2000)
    return () => clearInterval(interval)
  }, [])

  const markAsRead = useCallback((id: string) => {
    try {
      const stored = localStorage.getItem("ghostbot_notifications")
      const notifications = stored ? JSON.parse(stored) : []
      const updated = notifications.map((n: any) =>
        n.id === id ? { ...n, read: true } : n
      )
      localStorage.setItem("ghostbot_notifications", JSON.stringify(updated))
      setState({
        notifications: updated,
        unreadCount: updated.filter((n: any) => !n.read).length,
      })
    } catch {}
  }, [])

  const clearAll = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    localStorage.setItem("ghostbot_notifications", JSON.stringify([]))
    setState({ notifications: [], unreadCount: 0 })
  }, [])

  return { notifications: state.notifications, unreadCount: state.unreadCount, markAsRead, clearAll }
}

function getDefaultNotifications() {
  return [
    {
      id: "welcome-1",
      title: "Bem-vindo ao GHOST BOT!",
      message: "Seu painel está pronto. Configure seu bot Telegram para começar a vender.",
      time: "agora",
      read: false,
      type: "info" as const,
    },
    {
      id: "welcome-2",
      title: "Dica: Configure grupos e canais",
      message: "Adicione o bot a grupos ou canais do Telegram e eles aparecerão automaticamente.",
      time: "agora",
      read: false,
      type: "info" as const,
    },
  ]
}

export function NotificationsConnected() {
  const { notifications, unreadCount, markAsRead, clearAll } = useConnectedNotifications()

  return (
    <NotificationsPopover
      notifications={notifications}
      onMarkAsRead={markAsRead}
      onClearAll={clearAll}
    />
  )
}
