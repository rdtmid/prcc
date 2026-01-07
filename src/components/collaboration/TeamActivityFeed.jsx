import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageCircle, AlertTriangle, CheckCircle, User, 
  FileText, Send, AtSign
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from "@/lib/utils";

const activityIcons = {
  comment: MessageCircle,
  mention: MessageCircle,
  update: CheckCircle,
  approval: FileText,
  assignment: User,
  completion: CheckCircle,
  crisis: AlertTriangle,
};

const activityColors = {
  comment: "text-blue-500 bg-blue-100",
  mention: "text-purple-500 bg-purple-100",
  update: "text-emerald-500 bg-emerald-100",
  approval: "text-amber-500 bg-amber-100",
  assignment: "text-cyan-500 bg-cyan-100",
  completion: "text-green-500 bg-green-100",
  crisis: "text-red-500 bg-red-100",
};

export default function TeamActivityFeed({ relatedEntity, relatedId, relatedTitle, compact = false }) {
  const [newComment, setNewComment] = useState('');
  const [user, setUser] = useState(null);
  
  const queryClient = useQueryClient();

  React.useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
    } catch (e) {}
  };

  const queryFilter = relatedEntity && relatedId 
    ? { related_entity: relatedEntity, related_id: relatedId }
    : {};

  const { data: activities = [] } = useQuery({
    queryKey: ['teamActivities', relatedEntity, relatedId],
    queryFn: () => base44.entities.TeamActivity.filter(queryFilter, '-created_date', 50),
    refetchInterval: 15000,
  });

  const createActivityMutation = useMutation({
    mutationFn: (data) => base44.entities.TeamActivity.create(data),
    onSuccess: () => queryClient.invalidateQueries(['teamActivities']),
  });

  const createNotificationMutation = useMutation({
    mutationFn: (data) => base44.entities.Notification.create(data),
  });

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return;

    // Extract mentions (@email)
    const mentionRegex = /@(\S+@\S+\.\S+)/g;
    const mentions = [...newComment.matchAll(mentionRegex)].map(m => m[1]);

    const activity = {
      activity_type: 'comment',
      user_email: user.email,
      user_name: user.full_name || user.email,
      content: newComment,
      related_entity: relatedEntity,
      related_id: relatedId,
      related_title: relatedTitle,
      mentions: mentions
    };

    await createActivityMutation.mutateAsync(activity);

    // Send notifications to mentioned users
    for (const mentionedEmail of mentions) {
      await createNotificationMutation.mutateAsync({
        type: 'comment',
        title: `${user.full_name || user.email} mentioned you`,
        message: newComment.slice(0, 100),
        recipient: mentionedEmail,
        sender: user.email,
        related_entity: relatedEntity,
        related_id: relatedId,
        priority: 'normal'
      });
    }

    setNewComment('');
  };

  return (
    <Card className={cn("bg-white border-0 shadow-sm", compact ? "p-3" : "p-5")}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <MessageCircle className="w-4 h-4" />
          Team Activity
        </h3>
      </div>

      <ScrollArea className={compact ? "h-64" : "h-96"}>
        <div className="space-y-3">
          {activities.map(activity => {
            const Icon = activityIcons[activity.activity_type] || MessageCircle;
            const colorClass = activityColors[activity.activity_type] || "text-slate-500 bg-slate-100";
            
            return (
              <div key={activity.id} className="flex gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                    {activity.user_name?.[0]?.toUpperCase() || activity.user_email?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900">
                      {activity.user_name || activity.user_email}
                    </span>
                    <div className={cn("p-1 rounded", colorClass)}>
                      <Icon className="w-3 h-3" />
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{activity.content}</p>
                  {activity.related_title && (
                    <p className="text-xs text-slate-400 mt-1">on: {activity.related_title}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-1">
                    {formatDistanceToNow(new Date(activity.created_date), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })}
          {activities.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              <MessageCircle className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No activity yet</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {user && (
        <div className="mt-4 pt-4 border-t">
          <div className="flex gap-2">
            <Input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add comment... (use @email to mention)"
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
              className="flex-1"
            />
            <Button 
              onClick={handleAddComment}
              disabled={!newComment.trim()}
              size="sm"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Tip: Use @email to mention team members
          </p>
        </div>
      )}
    </Card>
  );
}