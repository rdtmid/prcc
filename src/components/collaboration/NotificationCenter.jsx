import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Bell, Check, AlertTriangle, FileText, ListTodo, 
  MessageCircle, User, CheckCircle, X
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from "@/lib/utils";

const typeIcons = {
  mention: MessageCircle,
  crisis: AlertTriangle,
  task: ListTodo,
  approval: FileText,
  assignment: User,
  comment: MessageCircle,
  system: Bell,
};

const priorityColors = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  normal: "bg-blue-500",
  low: "bg-slate-500",
};

export default function NotificationCenter({ userEmail }) {
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', userEmail],
    queryFn: () => base44.entities.Notification.filter({ recipient: userEmail }),
    refetchInterval: 30000, // Poll every 30 seconds
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { is_read: true }),
    onSuccess: () => queryClient.invalidateQueries(['notifications']),
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['notifications']),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.is_read);
      await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { is_read: true })));
    },
    onSuccess: () => queryClient.invalidateQueries(['notifications']),
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const sortedNotifications = [...notifications].sort((a, b) => 
    new Date(b.created_date) - new Date(a.created_date)
  ).slice(0, 20);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-5 h-5 text-slate-600" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-slate-900">Notifications</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => markAllReadMutation.mutate()}
              className="text-xs"
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-96">
          {sortedNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {sortedNotifications.map(notification => {
                const Icon = typeIcons[notification.type] || Bell;
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 hover:bg-slate-50 transition-colors cursor-pointer group relative",
                      !notification.is_read && "bg-blue-50"
                    )}
                    onClick={() => {
                      markReadMutation.mutate(notification.id);
                      if (notification.link) {
                        // Handle navigation
                        window.location.href = notification.link;
                      }
                    }}
                  >
                    <div className="flex gap-3">
                      {!notification.is_read && (
                        <div className={cn("w-2 h-2 rounded-full mt-2 shrink-0", priorityColors[notification.priority])} />
                      )}
                      <div className={cn("p-2 rounded-lg shrink-0", 
                        notification.priority === 'urgent' ? "bg-red-100" : "bg-slate-100"
                      )}>
                        <Icon className={cn("w-4 h-4", 
                          notification.priority === 'urgent' ? "text-red-600" : "text-slate-600"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-medium text-slate-900", 
                          !notification.is_read && "font-semibold"
                        )}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {formatDistanceToNow(new Date(notification.created_date), { addSuffix: true })}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotificationMutation.mutate(notification.id);
                        }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}