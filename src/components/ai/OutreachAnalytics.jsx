import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Mail, MailOpen, MessageCircle, CheckCircle, 
  TrendingUp, TrendingDown, Eye
} from 'lucide-react';
import { cn } from "@/lib/utils";

export default function OutreachAnalytics({ outreaches = [] }) {
  if (!outreaches?.length) {
    return (
      <Card className="p-5 bg-white border-0 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Outreach Performance</h3>
        <div className="text-center py-6 text-slate-400">
          <Mail className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <p className="text-sm">No outreach data yet</p>
        </div>
      </Card>
    );
  }

  const totalSent = outreaches.filter(o => o.status !== 'draft').length;
  const totalOpened = outreaches.filter(o => ['opened', 'responded', 'published'].includes(o.status)).length;
  const totalResponded = outreaches.filter(o => ['responded', 'published'].includes(o.status)).length;
  const totalPublished = outreaches.filter(o => o.status === 'published').length;

  const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
  const responseRate = totalSent > 0 ? (totalResponded / totalSent) * 100 : 0;
  const publishRate = totalSent > 0 ? (totalPublished / totalSent) * 100 : 0;

  // AI-generated vs manual comparison
  const aiGenerated = outreaches.filter(o => o.ai_generated);
  const aiResponseRate = aiGenerated.length > 0 
    ? (aiGenerated.filter(o => ['responded', 'published'].includes(o.status)).length / aiGenerated.length) * 100 
    : 0;

  return (
    <Card className="p-5 bg-white border-0 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">Outreach Performance</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Mail className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-slate-500">Total Sent</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalSent}</p>
        </div>
        <div className="p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <MailOpen className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-slate-500">Opened</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalOpened}</p>
        </div>
        <div className="p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <MessageCircle className="w-4 h-4 text-emerald-500" />
            <span className="text-xs text-slate-500">Responded</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalResponded}</p>
        </div>
        <div className="p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-slate-500">Published</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalPublished}</p>
        </div>
      </div>

      {/* Rates */}
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-600">Open Rate</span>
            <span className={cn("font-semibold", openRate >= 50 ? "text-emerald-600" : "text-slate-900")}>
              {openRate.toFixed(1)}%
            </span>
          </div>
          <Progress value={openRate} className="h-2" />
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-600">Response Rate</span>
            <span className={cn("font-semibold", responseRate >= 30 ? "text-emerald-600" : "text-slate-900")}>
              {responseRate.toFixed(1)}%
            </span>
          </div>
          <Progress value={responseRate} className="h-2" />
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-600">Publish Rate</span>
            <span className={cn("font-semibold", publishRate >= 20 ? "text-emerald-600" : "text-slate-900")}>
              {publishRate.toFixed(1)}%
            </span>
          </div>
          <Progress value={publishRate} className="h-2" />
        </div>
      </div>

      {/* AI Performance Comparison */}
      {aiGenerated.length > 0 && (
        <div className="mt-6 pt-6 border-t">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-500 uppercase">AI vs Manual</p>
            <Badge className="bg-purple-100 text-purple-700 text-xs">
              <Sparkles className="w-3 h-3 mr-1" />
              AI Performance
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-100 text-center">
              <p className="text-xs text-purple-600 mb-1">AI-Generated</p>
              <p className="text-xl font-bold text-purple-900">{aiGenerated.length}</p>
              <p className="text-xs text-purple-700 mt-1">{aiResponseRate.toFixed(0)}% response</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-center">
              <p className="text-xs text-slate-600 mb-1">Manual</p>
              <p className="text-xl font-bold text-slate-900">{totalSent - aiGenerated.length}</p>
              <p className="text-xs text-slate-700 mt-1">{responseRate.toFixed(0)}% response</p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}