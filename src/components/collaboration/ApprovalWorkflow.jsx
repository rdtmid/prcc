import React from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  CheckCircle, XCircle, Clock, User, MessageCircle,
  ChevronRight, AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from "@/lib/utils";

const statusConfig = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-700", icon: Clock },
  pending_review: { label: "Pending Review", color: "bg-amber-100 text-amber-700", icon: Clock },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700", icon: XCircle },
  published: { label: "Published", color: "bg-blue-100 text-blue-700", icon: CheckCircle },
};

export default function ApprovalWorkflow({ 
  item, 
  itemType = "PressRelease", 
  onStatusChange,
  canApprove = false,
  user 
}) {
  const [comment, setComment] = React.useState('');
  const queryClient = useQueryClient();

  const createNotificationMutation = useMutation({
    mutationFn: (data) => base44.entities.Notification.create(data),
  });

  const createActivityMutation = useMutation({
    mutationFn: (data) => base44.entities.TeamActivity.create(data),
    onSuccess: () => queryClient.invalidateQueries(['teamActivities']),
  });

  const handleApprove = async () => {
    await onStatusChange('approved');
    
    // Log activity
    await createActivityMutation.mutateAsync({
      activity_type: 'approval',
      user_email: user?.email,
      user_name: user?.full_name || user?.email,
      content: `Approved ${itemType}: ${item.title || item.name}${comment ? ` - ${comment}` : ''}`,
      related_entity: itemType,
      related_id: item.id,
      related_title: item.title || item.name
    });

    // Notify author
    if (item.author && item.author !== user?.email) {
      await createNotificationMutation.mutateAsync({
        type: 'approval',
        title: `Your ${itemType} has been approved`,
        message: `"${item.title || item.name}" has been approved${comment ? ': ' + comment : ''}`,
        recipient: item.author,
        sender: user?.email,
        related_entity: itemType,
        related_id: item.id,
        priority: 'high'
      });
    }
    
    setComment('');
  };

  const handleReject = async () => {
    await onStatusChange('draft');
    
    // Log activity
    await createActivityMutation.mutateAsync({
      activity_type: 'update',
      user_email: user?.email,
      user_name: user?.full_name || user?.email,
      content: `Rejected ${itemType}: ${item.title || item.name}${comment ? ` - ${comment}` : ''}`,
      related_entity: itemType,
      related_id: item.id,
      related_title: item.title || item.name
    });

    // Notify author
    if (item.author && item.author !== user?.email) {
      await createNotificationMutation.mutateAsync({
        type: 'approval',
        title: `Your ${itemType} needs revision`,
        message: `"${item.title || item.name}" requires changes${comment ? ': ' + comment : ''}`,
        recipient: item.author,
        sender: user?.email,
        related_entity: itemType,
        related_id: item.id,
        priority: 'high',
        action_required: true
      });
    }
    
    setComment('');
  };

  const handleSubmitForReview = async () => {
    await onStatusChange('pending_review');
    
    // Log activity
    await createActivityMutation.mutateAsync({
      activity_type: 'update',
      user_email: user?.email,
      user_name: user?.full_name || user?.email,
      content: `Submitted ${itemType} for review: ${item.title || item.name}`,
      related_entity: itemType,
      related_id: item.id,
      related_title: item.title || item.name
    });

    // Notify approvers (in real app, fetch from user roles)
    // For now, create general notification
    await createNotificationMutation.mutateAsync({
      type: 'approval',
      title: `New ${itemType} pending review`,
      message: `"${item.title || item.name}" is awaiting approval`,
      recipient: 'admin@example.com', // Replace with actual approver
      sender: user?.email,
      related_entity: itemType,
      related_id: item.id,
      priority: 'high',
      action_required: true
    });
  };

  const config = statusConfig[item.status] || statusConfig.draft;
  const StatusIcon = config.icon;

  return (
    <Card className="p-5 bg-white border-0 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className={cn("p-2 rounded-lg", config.color)}>
          <StatusIcon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Approval Status</h3>
          <Badge className={cn("text-xs mt-1", config.color)}>{config.label}</Badge>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-3 text-sm">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-slate-900">Created</p>
            <p className="text-xs text-slate-500">
              {item.author && `by ${item.author} • `}
              {format(new Date(item.created_date), 'MMM d, yyyy h:mm a')}
            </p>
          </div>
        </div>

        {item.status !== 'draft' && (
          <>
            <ChevronRight className="w-4 h-4 text-slate-300 ml-3" />
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-900">Submitted for Review</p>
                <p className="text-xs text-slate-500">
                  {format(new Date(item.updated_date), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            </div>
          </>
        )}

        {item.approved_by && (
          <>
            <ChevronRight className="w-4 h-4 text-slate-300 ml-3" />
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-900">Approved</p>
                <p className="text-xs text-slate-500">by {item.approved_by}</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      {item.status === 'draft' && (
        <Button 
          onClick={handleSubmitForReview}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          Submit for Review
        </Button>
      )}

      {item.status === 'pending_review' && canApprove && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs text-slate-500">Review Comment (Optional)</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add feedback..."
              className="h-20"
            />
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleApprove}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve
            </Button>
            <Button 
              onClick={handleReject}
              variant="outline"
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Request Changes
            </Button>
          </div>
        </div>
      )}

      {item.status === 'approved' && (
        <div className="p-3 bg-emerald-50 rounded-lg flex items-center gap-2 text-emerald-700">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Ready for publishing</span>
        </div>
      )}
    </Card>
  );
}