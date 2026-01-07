import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Twitter, Instagram, Facebook, Youtube, Globe, 
  MessageCircle, Heart, Share2, ExternalLink, Flag,
  AlertTriangle, CheckCircle, Clock
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const platformIcons = {
  twitter: { icon: Twitter, color: "text-sky-500", bg: "bg-sky-500/10" },
  instagram: { icon: Instagram, color: "text-pink-500", bg: "bg-pink-500/10" },
  facebook: { icon: Facebook, color: "text-blue-600", bg: "bg-blue-600/10" },
  youtube: { icon: Youtube, color: "text-red-500", bg: "bg-red-500/10" },
  tiktok: { icon: Globe, color: "text-slate-900", bg: "bg-slate-900/10" },
  news: { icon: Globe, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  blog: { icon: Globe, color: "text-purple-500", bg: "bg-purple-500/10" },
  forum: { icon: MessageCircle, color: "text-orange-500", bg: "bg-orange-500/10" },
};

const sentimentConfig = {
  positive: { color: "bg-emerald-500/10 text-emerald-700 border-emerald-200" },
  negative: { color: "bg-red-500/10 text-red-700 border-red-200" },
  neutral: { color: "bg-slate-500/10 text-slate-700 border-slate-200" },
};

const statusConfig = {
  new: { icon: Clock, color: "text-blue-500" },
  reviewed: { icon: CheckCircle, color: "text-amber-500" },
  responded: { icon: CheckCircle, color: "text-emerald-500" },
};

export default function MentionsList({ mentions, onSelect, onFlag, compact = false }) {
  if (!mentions?.length) {
    return (
      <Card className="p-8 bg-white border-0 shadow-sm text-center">
        <Globe className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">No mentions found</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {mentions.map((mention) => {
        const platform = platformIcons[mention.source] || platformIcons.news;
        const PlatformIcon = platform.icon;
        const sentiment = sentimentConfig[mention.sentiment];
        const status = statusConfig[mention.status] || statusConfig.new;
        const StatusIcon = status.icon;

        return (
          <Card 
            key={mention.id} 
            className={cn(
              "p-4 bg-white border-0 shadow-sm hover:shadow-md transition-all cursor-pointer",
              mention.is_crisis && "ring-2 ring-red-500/50",
              mention.is_flagged && "ring-2 ring-amber-500/50"
            )}
            onClick={() => onSelect?.(mention)}
          >
            <div className="flex gap-3">
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarImage src={mention.author_avatar} />
                <AvatarFallback className={cn(platform.bg, platform.color)}>
                  <PlatformIcon className="w-5 h-5" />
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900 text-sm">
                      {mention.author || 'Unknown'}
                    </span>
                    <div className={cn("p-1 rounded", platform.bg)}>
                      <PlatformIcon className={cn("w-3 h-3", platform.color)} />
                    </div>
                    {mention.author_followers > 10000 && (
                      <Badge variant="outline" className="text-xs">
                        {(mention.author_followers / 1000).toFixed(0)}K followers
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {mention.is_crisis && (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    )}
                    <StatusIcon className={cn("w-4 h-4", status.color)} />
                  </div>
                </div>

                <p className={cn(
                  "text-slate-600 mt-1",
                  compact ? "text-sm line-clamp-2" : "text-sm"
                )}>
                  {mention.content}
                </p>

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      {mention.likes || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      {mention.comments || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Share2 className="w-3 h-3" />
                      {mention.shares || 0}
                    </span>
                    <span>
                      {mention.mention_date 
                        ? formatDistanceToNow(new Date(mention.mention_date), { addSuffix: true })
                        : formatDistanceToNow(new Date(mention.created_date), { addSuffix: true })
                      }
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn("text-xs", sentiment.color)}>
                      {mention.sentiment}
                    </Badge>
                    {mention.source_url && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(mention.source_url, '_blank');
                        }}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={cn("h-7 w-7 p-0", mention.is_flagged && "text-amber-500")}
                      onClick={(e) => {
                        e.stopPropagation();
                        onFlag?.(mention);
                      }}
                    >
                      <Flag className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}