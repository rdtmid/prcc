import React from 'react';
import { Card } from "@/components/ui/card";
import { Smile, Meh, Frown } from "lucide-react";

export default function SentimentGauge({ positive, neutral, negative, onSentimentClick }) {
  const total = positive + neutral + negative || 1;
  const positivePercent = Math.round((positive / total) * 100);
  const neutralPercent = Math.round((neutral / total) * 100);
  const negativePercent = Math.round((negative / total) * 100);

  const overallScore = Math.round(((positive - negative) / total) * 100);
  
  const getOverallSentiment = () => {
    if (overallScore > 20) return { label: "Positive", color: "text-emerald-500", bg: "bg-emerald-500" };
    if (overallScore < -20) return { label: "Negative", color: "text-red-500", bg: "bg-red-500" };
    return { label: "Neutral", color: "text-amber-500", bg: "bg-amber-500" };
  };

  const sentiment = getOverallSentiment();

  return (
    <Card className="p-5 bg-white border-0 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">Sentiment Overview</h3>
      
      <div className="flex items-center justify-center mb-4">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#f1f5f9"
              strokeWidth="3"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#10b981"
              strokeWidth="3"
              strokeDasharray={`${positivePercent}, 100`}
              className="transition-all duration-500"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="3"
              strokeDasharray={`${neutralPercent}, 100`}
              strokeDashoffset={`-${positivePercent}`}
              className="transition-all duration-500"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#ef4444"
              strokeWidth="3"
              strokeDasharray={`${negativePercent}, 100`}
              strokeDashoffset={`-${positivePercent + neutralPercent}`}
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-bold ${sentiment.color}`}>
              {overallScore > 0 ? '+' : ''}{overallScore}
            </span>
            <span className="text-xs text-slate-500">{sentiment.label}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <button
          onClick={() => onSentimentClick?.('positive')}
          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Smile className="w-4 h-4 text-emerald-500" />
            <span className="text-sm text-slate-600">Positive</span>
          </div>
          <span className="text-sm font-semibold text-slate-900">{positivePercent}%</span>
        </button>
        <button
          onClick={() => onSentimentClick?.('neutral')}
          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-amber-50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Meh className="w-4 h-4 text-amber-500" />
            <span className="text-sm text-slate-600">Neutral</span>
          </div>
          <span className="text-sm font-semibold text-slate-900">{neutralPercent}%</span>
        </button>
        <button
          onClick={() => onSentimentClick?.('negative')}
          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Frown className="w-4 h-4 text-red-500" />
            <span className="text-sm text-slate-600">Negative</span>
          </div>
          <span className="text-sm font-semibold text-slate-900">{negativePercent}%</span>
        </button>
      </div>
    </Card>
  );
}