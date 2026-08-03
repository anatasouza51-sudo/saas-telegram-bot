"use client"

import React, { createContext, useContext, useCallback, useMemo } from "react"
import { useNotifications } from "@/hooks/use-notifications"
import { NotificationsPopover, type Notification } from "@/components/notifications-popover"

interface NotificationsContextType {
  addNotification: (notif: Omit<Notification, "id" | "read" | "time">) => void
  unreadCount: number
}

const NotificationsContext = createContext<NotificationsContextType>({
  addNotification: () => {},
  unreadCount: 0,
})

export function useNotificationsContext() {
  return useContext(NotificationsContext)
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { notifications, unreadCount, markAsRead, clearAll, addNotification } = useNotifications()

  const contextValue = useMemo(() => ({
    addNotification,
    unreadCount,
  }), [addNotification, unreadCount])

  return (
    <NotificationsContext.Provider value={contextValue}>
      {children}
    </NotificationsContext.Provider>
  )
}
