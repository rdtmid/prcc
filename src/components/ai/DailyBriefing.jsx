import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Coffee, TrendingUp, AlertTriangle, Mail, Download } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { cn } from "@/lib/utils";

export default function DailyBriefing({ onGenerate }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [briefing, setBriefing] = useState(null);

  const generateBriefing = async () => {
    setIsGenerating(true);
    try {
      const yesterday = subDays(new Date(), 1);
      const mentions = await base44.entities.Mention.filter({});
      
      // Filter last 24 hours
      const recentMentions = mentions.filter(m => {
        const date = new Date(m.mention_date || m.created_date);
        return date >= yesterday;
      });

      const crisisAlerts = await base44.entities.CrisisAlert.filter({ status: 'active' });
      const tasks = await base44.entities.Task.filter({ status: 'todo' });

      const totalMentions = recentMentions.length;
      const sentiments = {
        positive: recentMentions.filter(m => m.sentiment === 'positive').length,
        negative: recentMentions.filter(m => m.sentiment === 'negative').length,
      };

      const topMentions = recentMentions
        .sort((a, b) => (b.reach || 0) - (a.reach || 0))
        .slice(0, 5)
        .map(m => `"${m.content.slice(0, 100)}" - ${m.author} (${m.source})`);

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Sebagai AI assistant untuk tim PR, buatlah daily briefing untuk pagi ini:

PERIODE: 24 jam terakhir (${format(yesterday, 'dd MMM yyyy')} - ${format(new Date(), 'dd MMM yyyy')})

DATA:
- Total Mentions: ${totalMentions}
- Sentimen Positif: ${sentiments.positive} (${Math.round((sentiments.positive/totalMentions)*100)}%)
- Sentimen Negatif: ${sentiments.negative} (${Math.round((sentiments.negative/totalMentions)*100)}%)
- Crisis Alerts Aktif: ${crisisAlerts.length}
- Tasks yang Perlu Dikerjakan: ${tasks.length}

TOP MENTIONS:
${topMentions.join('\n')}

Buatlah briefing yang:
1. Ringkas dan mudah dibaca (executive summary style)
2. Highlight hal-hal penting yang perlu attention
3. Identifikasi urgent actions
4. Berikan sentiment overview
5. Rekomendasi prioritas untuk hari ini

Format JSON dengan sections yang jelas.`,
        response_json_schema: {
          type: "object",
          properties: {
            headline: { type: "string" },
            sentiment_summary: { type: "string" },
            top_stories: { type: "array", items: { type: "string" } },
            urgent_items: { type: "array", items: { type: "string" } },
            priority_actions: { type: "array", items: { type: "string" } },
            key_metrics: {
              type: "object",
              properties: {
                mentions_trend: { type: "string" },
                sentiment_trend: { type: "string" }
              }
            }
          }
        }
      });

      const briefingData = {
        ...result,
        generated_at: new Date().toISOString(),
        metrics: {
          total_mentions: totalMentions,
          positive: sentiments.positive,
          negative: sentiments.negative,
          crisis_count: crisisAlerts.length,
          tasks_count: tasks.length
        }
      };

      setBriefing(briefingData);
      onGenerate?.(briefingData);
    } catch (e) {
      console.error('Briefing generation failed:', e);
    }
    setIsGenerating(false);
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 border-0 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Coffee className="w-5 h-5 text-amber-600" />
          Daily Briefing
        </h3>
        <Button 
          onClick={generateBriefing} 
          disabled={isGenerating}
          className="bg-amber-600 hover:bg-amber-700"
        >
          <Sparkles className={cn("w-4 h-4 mr-2", isGenerating && "animate-spin")} />
          {isGenerating ? 'Generating...' : 'Generate Briefing'}
        </Button>
      </div>

      {!briefing ? (
        <div className="text-center py-8">
          <Coffee className="w-16 h-16 text-amber-300 mx-auto mb-3" />
          <p className="text-slate-700 font-medium mb-1">Good morning! ☀️</p>
          <p className="text-sm text-slate-600">
            Generate your daily briefing to start the day with key insights
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Headline */}
          <div className="p-4 bg-white rounded-lg border-l-4 border-amber-500">
            <p className="text-lg font-bold text-slate-900">{briefing.headline}</p>
            <p className="text-xs text-slate-500 mt-1">
              Generated at {format(new Date(briefing.generated_at), 'HH:mm')}
            </p>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-white rounded-lg text-center">
              <p className="text-2xl font-bold text-slate-900">{briefing.metrics.total_mentions}</p>
              <p className="text-xs text-slate-500">Mentions (24h)</p>
            </div>
            <div className="p-3 bg-white rounded-lg text-center">
              <p className="text-2xl font-bold text-emerald-600">{briefing.metrics.positive}</p>
              <p className="text-xs text-slate-500">Positive</p>
            </div>
            {briefing.metrics.crisis_count > 0 && (
              <div className="p-3 bg-red-100 rounded-lg text-center border border-red-200">
                <p className="text-2xl font-bold text-red-700">{briefing.metrics.crisis_count}</p>
                <p className="text-xs text-red-600">Crisis Alerts</p>
              </div>
            )}
          </div>

          {/* Sentiment Summary */}
          <div className="p-4 bg-white rounded-lg">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Sentiment Overview</p>
            <p className="text-sm text-slate-700">{briefing.sentiment_summary}</p>
          </div>

          {/* Urgent Items */}
          {briefing.urgent_items?.length > 0 && (
            <div className="p-4 bg-red-50 rounded-lg border border-red-100">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <p className="text-xs font-semibold text-red-900 uppercase">Urgent Attention</p>
              </div>
              <ul className="space-y-1">
                {briefing.urgent_items.map((item, idx) => (
                  <li key={idx} className="text-sm text-red-800 flex items-start gap-2">
                    <span className="text-red-500 shrink-0">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Top Stories */}
          {briefing.top_stories?.length > 0 && (
            <div className="p-4 bg-white rounded-lg">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Top Stories</p>
              <ul className="space-y-2">
                {briefing.top_stories.map((story, idx) => (
                  <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                    <span className="text-blue-500 font-bold shrink-0">{idx + 1}.</span>
                    {story}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Priority Actions */}
          {briefing.priority_actions?.length > 0 && (
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
              <p className="text-xs font-semibold text-emerald-900 uppercase mb-2">Today's Priorities</p>
              <ul className="space-y-1">
                {briefing.priority_actions.map((action, idx) => (
                  <li key={idx} className="text-sm text-emerald-800 flex items-start gap-2">
                    <span className="text-emerald-600 shrink-0">✓</span>
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1">
              <Mail className="w-4 h-4 mr-2" />
              Email Briefing
            </Button>
            <Button variant="outline" className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}