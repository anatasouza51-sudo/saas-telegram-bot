'use client';

import * as React from "react";
import { Bell, Check, Trash2, Info, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type?: "info" | "warning" | "success";
}

interface NotificationsPopoverProps {
  notifications?: Notification[];
  onMarkAsRead?: (id: string) => void;
  onClearAll?: (e: React.MouseEvent) => void;
}

export function NotificationsPopover({
  notifications = [],
  onMarkAsRead,
  onClearAll,
}: NotificationsPopoverProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label="Notificações"
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground shadow-sm animate-in zoom-in-50">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="z-50 w-80 sm:w-96 p-0 shadow-xl border bg-card text-card-foreground rounded-xl overflow-hidden focus:outline-none"
      >
        <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/30">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm">Notificações</h4>
            {unreadCount > 0 && (
              <span className="bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full">
                {unreadCount} novas
              </span>
            )}
          </div>
          {notifications.length > 0 && onClearAll && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="h-auto p-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Limpar
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[380px] overflow-y-auto divide-y divide-border">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 stroke-[1.5] opacity-50" />
              <p className="text-sm font-medium">Nenhuma notificação</p>
              <p className="text-xs text-muted-foreground mt-1">
                Você está em dia com todas as novidades!
              </p>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-start gap-3 p-4 transition-colors hover:bg-muted/50 cursor-pointer relative",
                  !item.read && "bg-primary/5"
                )}
                onClick={() => onMarkAsRead && onMarkAsRead(item.id)}
              >
                <div className="mt-0.5 shrink-0">
                  {item.type === "warning" ? (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  ) : item.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Info className="h-4 w-4 text-blue-500" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={cn(
                        "text-xs font-medium leading-none",
                        !item.read ? "text-foreground font-semibold" : "text-muted-foreground"
                      )}
                    >
                      {item.title}
                    </p>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {item.time}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {item.message}
                  </p>
                </div>
                {!item.read && (
                  <span className="h-2 w-2 rounded-full bg-primary shrink-0 self-center ml-1" />
                )}
              </div>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
