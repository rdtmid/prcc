import React from 'react';
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StatsCard({ 
  title, 
  value, 
  change, 
  changeType = "neutral", 
  icon: Icon, 
  iconBg = "bg-blue-500/10",
  iconColor = "text-blue-500",
  subtitle
}) {
  const getTrendIcon = () => {
    if (changeType === "positive") return <TrendingUp className="w-3 h-3" />;
    if (changeType === "negative") return <TrendingDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  const getTrendColor = () => {
    if (changeType === "positive") return "text-emerald-500 bg-emerald-500/10";
    if (changeType === "negative") return "text-red-500 bg-red-500/10";
    return "text-slate-500 bg-slate-500/10";
  };

  return (
    <Card className="p-5 bg-white border-0 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={cn("p-2.5 rounded-xl", iconBg)}>
            <Icon className={cn("w-5 h-5", iconColor)} />
          </div>
        )}
      </div>
      {change !== undefined && (
        <div className="mt-3 flex items-center gap-1.5">
          <span className={cn("flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full", getTrendColor())}>
            {getTrendIcon()}
            {change}%
          </span>
          <span className="text-xs text-slate-400">vs last period</span>
        </div>
      )}
    </Card>
  );
}