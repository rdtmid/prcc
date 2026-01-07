import React from 'react';
import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Twitter, Instagram, Facebook, Youtube, Globe, MessageCircle, Headphones, Rss } from "lucide-react";

const platformConfig = {
  twitter: { label: "Twitter/X", color: "#1DA1F2", icon: Twitter },
  instagram: { label: "Instagram", color: "#E4405F", icon: Instagram },
  facebook: { label: "Facebook", color: "#1877F2", icon: Facebook },
  youtube: { label: "YouTube", color: "#FF0000", icon: Youtube },
  tiktok: { label: "TikTok", color: "#000000", icon: Globe },
  news: { label: "News", color: "#10b981", icon: Globe },
  blog: { label: "Blog", color: "#8b5cf6", icon: Rss },
  forum: { label: "Forum", color: "#f59e0b", icon: MessageCircle },
  podcast: { label: "Podcast", color: "#ec4899", icon: Headphones },
  other: { label: "Other", color: "#64748b", icon: Globe },
};

export default function PlatformDistribution({ data }) {
  const chartData = Object.entries(data || {}).map(([key, value]) => ({
    name: platformConfig[key]?.label || key,
    value: value,
    color: platformConfig[key]?.color || "#64748b",
    platform: key
  })).filter(d => d.value > 0);

  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.value / total) * 100).toFixed(1);
      return (
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-slate-900">{data.name}</p>
          <p className="text-xs text-slate-600">{data.value.toLocaleString()} mentions ({percentage}%)</p>
        </div>
      );
    }
    return null;
  };

  const renderCustomizedLabel = ({ cx, cy }) => {
    return (
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
        <tspan x={cx} dy="-0.5em" className="text-2xl font-bold fill-slate-900">
          {total.toLocaleString()}
        </tspan>
        <tspan x={cx} dy="1.5em" className="text-xs fill-slate-500">
          Total Mentions
        </tspan>
      </text>
    );
  };

  return (
    <Card className="p-5 bg-white border-0 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">Platform Distribution</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              labelLine={false}
              label={renderCustomizedLabel}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-4">
        {chartData.slice(0, 6).map((item) => {
          const Icon = platformConfig[item.platform]?.icon || Globe;
          return (
            <div key={item.platform} className="flex items-center gap-2">
              <div 
                className="w-2.5 h-2.5 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <Icon className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-600 truncate">{item.name}</span>
              <span className="text-xs font-medium text-slate-900 ml-auto">
                {((item.value / total) * 100).toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}