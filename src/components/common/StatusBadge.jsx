import React from 'react';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusStyles = {
  // General
  active: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  inactive: "bg-slate-500/10 text-slate-700 border-slate-200",
  pending: "bg-amber-500/10 text-amber-700 border-amber-200",
  completed: "bg-blue-500/10 text-blue-700 border-blue-200",
  
  // Sentiment
  positive: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  negative: "bg-red-500/10 text-red-700 border-red-200",
  neutral: "bg-slate-500/10 text-slate-700 border-slate-200",
  
  // Priority
  low: "bg-slate-500/10 text-slate-700 border-slate-200",
  medium: "bg-amber-500/10 text-amber-700 border-amber-200",
  high: "bg-orange-500/10 text-orange-700 border-orange-200",
  critical: "bg-red-500/10 text-red-700 border-red-200",
  urgent: "bg-red-500/10 text-red-700 border-red-200",
  
  // Press Release
  draft: "bg-slate-500/10 text-slate-700 border-slate-200",
  pending_review: "bg-amber-500/10 text-amber-700 border-amber-200",
  approved: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  published: "bg-blue-500/10 text-blue-700 border-blue-200",
  archived: "bg-slate-500/10 text-slate-700 border-slate-200",
  
  // Task
  todo: "bg-slate-500/10 text-slate-700 border-slate-200",
  in_progress: "bg-blue-500/10 text-blue-700 border-blue-200",
  review: "bg-purple-500/10 text-purple-700 border-purple-200",
  cancelled: "bg-red-500/10 text-red-700 border-red-200",
  
  // Crisis
  monitoring: "bg-amber-500/10 text-amber-700 border-amber-200",
  contained: "bg-blue-500/10 text-blue-700 border-blue-200",
  resolved: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  
  // Mention
  new: "bg-blue-500/10 text-blue-700 border-blue-200",
  reviewed: "bg-amber-500/10 text-amber-700 border-amber-200",
  responded: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  
  // Relationship
  contacted: "bg-blue-500/10 text-blue-700 border-blue-200",
  warm: "bg-amber-500/10 text-amber-700 border-amber-200",
  close: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  vip: "bg-purple-500/10 text-purple-700 border-purple-200",
  
  // Campaign
  planning: "bg-slate-500/10 text-slate-700 border-slate-200",
  paused: "bg-amber-500/10 text-amber-700 border-amber-200",
  
  // Influencer
  potential: "bg-slate-500/10 text-slate-700 border-slate-200",
  negotiating: "bg-amber-500/10 text-amber-700 border-amber-200",
  blacklisted: "bg-red-500/10 text-red-700 border-red-200",
};

export default function StatusBadge({ status, className }) {
  const style = statusStyles[status] || statusStyles.inactive;
  const label = status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  return (
    <Badge variant="outline" className={cn("text-xs font-medium", style, className)}>
      {label}
    </Badge>
  );
}