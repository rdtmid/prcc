import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, AlertTriangle, Zap, RefreshCw } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function TrendPrediction({ mentions, timeRange = '7d' }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [trends, setTrends] = useState(null);

  const analyzeTrends = async () => {
    setIsAnalyzing(true);
    try {
      // Prepare data summary
      const recentMentions = mentions.slice(0, 100);
      const keywords = {};
      const platforms = {};
      const sentiments = { positive: 0, negative: 0, neutral: 0 };

      recentMentions.forEach(m => {
        // Count keywords
        m.keywords?.forEach(kw => {
          keywords[kw] = (keywords[kw] || 0) + 1;
        });
        // Count platforms
        platforms[m.source] = (platforms[m.source] || 0) + 1;
        // Count sentiments
        sentiments[m.sentiment]++;
      });

      const topKeywords = Object.entries(keywords)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([k, v]) => `${k} (${v})`);

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Sebagai AI analyst untuk tim PR, analisis data media monitoring berikut dan berikan prediksi tren:

DATA PERIODE ${timeRange}:
- Total Mentions: ${mentions.length}
- Top Keywords: ${topKeywords.join(', ')}
- Sentimen: Positif ${sentiments.positive}, Negatif ${sentiments.negative}, Netral ${sentiments.neutral}
- Platform Aktif: ${Object.keys(platforms).join(', ')}

Berikan analisis dalam format JSON dengan:
1. emerging_trends: Array 3-5 tren yang sedang berkembang (judul dan deskripsi singkat)
2. risk_areas: Area yang perlu diwaspadai (potensi krisis)
3. opportunities: Peluang untuk leverage momentum positif
4. predictions: Prediksi untuk 7 hari ke depan

Gunakan bahasa Indonesia yang profesional dan actionable.`,
        response_json_schema: {
          type: "object",
          properties: {
            emerging_trends: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  confidence: { type: "string", enum: ["high", "medium", "low"] }
                }
              }
            },
            risk_areas: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  area: { type: "string" },
                  severity: { type: "string", enum: ["low", "medium", "high"] },
                  recommendation: { type: "string" }
                }
              }
            },
            opportunities: {
              type: "array",
              items: { type: "string" }
            },
            predictions: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      setTrends(result);
    } catch (e) {
      console.error('Trend analysis failed:', e);
    }
    setIsAnalyzing(false);
  };

  const confidenceColors = {
    high: "bg-emerald-100 text-emerald-700",
    medium: "bg-amber-100 text-amber-700",
    low: "bg-slate-100 text-slate-700"
  };

  const severityColors = {
    high: "bg-red-100 text-red-700",
    medium: "bg-orange-100 text-orange-700",
    low: "bg-blue-100 text-blue-700"
  };

  return (
    <Card className="p-5 bg-white border-0 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-500" />
          AI Trend Prediction
        </h3>
        <Button 
          onClick={analyzeTrends} 
          disabled={isAnalyzing}
          size="sm"
          variant="outline"
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", isAnalyzing && "animate-spin")} />
          {isAnalyzing ? 'Analyzing...' : 'Analyze'}
        </Button>
      </div>

      {!trends ? (
        <div className="text-center py-8">
          <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Click "Analyze" to get AI-powered trend predictions</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Emerging Trends */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3 flex items-center gap-2">
              <TrendingUp className="w-3 h-3" />
              Emerging Trends
            </h4>
            <div className="space-y-3">
              {trends.emerging_trends?.map((trend, idx) => (
                <div key={idx} className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-slate-900">{trend.title}</span>
                    <Badge className={cn("text-xs", confidenceColors[trend.confidence])}>
                      {trend.confidence}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600">{trend.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Risk Areas */}
          {trends.risk_areas?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3 flex items-center gap-2">
                <AlertTriangle className="w-3 h-3" />
                Risk Areas
              </h4>
              <div className="space-y-2">
                {trends.risk_areas.map((risk, idx) => (
                  <div key={idx} className="p-3 bg-red-50 rounded-lg border border-red-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-slate-900">{risk.area}</span>
                      <Badge className={cn("text-xs", severityColors[risk.severity])}>
                        {risk.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600">{risk.recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Opportunities */}
          {trends.opportunities?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3 flex items-center gap-2">
                <Zap className="w-3 h-3" />
                Opportunities
              </h4>
              <ul className="space-y-2">
                {trends.opportunities.map((opp, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="text-emerald-500 mt-0.5">✓</span>
                    {opp}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Predictions */}
          {trends.predictions?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3">
                7-Day Predictions
              </h4>
              <ul className="space-y-2">
                {trends.predictions.map((pred, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="text-blue-500 mt-0.5">→</span>
                    {pred}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}