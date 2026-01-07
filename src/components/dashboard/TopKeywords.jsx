import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TopKeywords({ keywords }) {
  if (!keywords?.length) {
    return (
      <Card className="p-5 bg-white border-0 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Trending Keywords</h3>
        <p className="text-sm text-slate-400 text-center py-4">No keywords tracked yet</p>
      </Card>
    );
  }

  const maxCount = Math.max(...keywords.map(k => k.count || k.total_mentions || 0));

  return (
    <Card className="p-5 bg-white border-0 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">Trending Keywords</h3>
      <div className="space-y-3">
        {keywords.slice(0, 8).map((keyword, index) => {
          const count = keyword.count || keyword.total_mentions || 0;
          const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
          const change = keyword.change || 0;
          
          return (
            <div key={keyword.keyword || index} className="group">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-400 w-4">
                    {index + 1}
                  </span>
                  <Hash className="w-3 h-3 text-slate-400" />
                  <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors">
                    {keyword.keyword}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{count.toLocaleString()}</span>
                  {change !== 0 && (
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs px-1.5 py-0",
                        change > 0 ? "text-emerald-600 border-emerald-200" : "text-red-600 border-red-200"
                      )}
                    >
                      {change > 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                      {Math.abs(change)}%
                    </Badge>
                  )}
                </div>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden ml-6">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}