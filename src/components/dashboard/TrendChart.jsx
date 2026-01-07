import React from 'react';
import { Card } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function TrendChart({ data, title, dataKeys = [], colors = {}, onDataClick }) {
  const defaultColors = {
    mentions: "#3b82f6",
    positive: "#10b981",
    negative: "#ef4444",
    neutral: "#f59e0b",
    reach: "#8b5cf6",
    engagement: "#ec4899"
  };

  const chartColors = { ...defaultColors, ...colors };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-slate-900 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {entry.value?.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="p-5 bg-white border-0 shadow-sm">
      {title && <h3 className="text-sm font-semibold text-slate-900 mb-4">{title}</h3>}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart 
            data={data} 
            margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
            onClick={(e) => {
              if (e && e.activeLabel) {
                onDataClick?.(e.activeLabel, e.activePayload?.[0]?.payload);
              }
            }}
            style={{ cursor: onDataClick ? 'pointer' : 'default' }}
          >
            <defs>
              {dataKeys.map(key => (
                <linearGradient key={key} id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColors[key]} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={chartColors[key]} stopOpacity={0}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 11, fill: '#94a3b8' }} 
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 11, fill: '#94a3b8' }} 
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
            <Legend 
              wrapperStyle={{ fontSize: '12px' }}
              iconType="circle"
              iconSize={8}
            />
            {dataKeys.map(key => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={chartColors[key]}
                strokeWidth={2}
                fillOpacity={1}
                fill={`url(#gradient-${key})`}
                name={key.charAt(0).toUpperCase() + key.slice(1)}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}