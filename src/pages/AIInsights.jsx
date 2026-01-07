import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/common/PageHeader';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Sparkles, Brain, TrendingUp, Calendar, Download, 
  Mail, Clock, CheckCircle, AlertTriangle, Zap,
  BarChart3, MessageCircle
} from 'lucide-react';
import { format, subDays, startOfWeek, startOfMonth } from 'date-fns';
import { cn } from "@/lib/utils";

export default function AIInsights() {
  const [period, setPeriod] = useState('daily');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedInsight, setGeneratedInsight] = useState(null);

  const queryClient = useQueryClient();

  const { data: mentions = [] } = useQuery({
    queryKey: ['mentions'],
    queryFn: () => base44.entities.Mention.list('-created_date', 500),
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => base44.entities.Campaign.filter({ status: 'active' }),
  });

  const { data: crisisAlerts = [] } = useQuery({
    queryKey: ['crisisAlerts'],
    queryFn: () => base44.entities.CrisisAlert.list('-created_date', 50),
  });

  const { data: savedInsights = [] } = useQuery({
    queryKey: ['reports', 'insights'],
    queryFn: () => base44.entities.Report.filter({ type: 'custom' }),
  });

  const createReportMutation = useMutation({
    mutationFn: (data) => base44.entities.Report.create(data),
    onSuccess: () => queryClient.invalidateQueries(['reports']),
  });

  const getPeriodData = () => {
    const now = new Date();
    let startDate;
    let label;

    switch(period) {
      case 'daily':
        startDate = subDays(now, 1);
        label = 'Daily';
        break;
      case 'weekly':
        startDate = startOfWeek(now);
        label = 'Weekly';
        break;
      case 'monthly':
        startDate = startOfMonth(now);
        label = 'Monthly';
        break;
      default:
        startDate = subDays(now, 1);
        label = 'Daily';
    }

    const periodMentions = mentions.filter(m => {
      const date = new Date(m.mention_date || m.created_date);
      return date >= startDate;
    });

    return { startDate, periodMentions, label };
  };

  const generateInsights = async () => {
    setIsGenerating(true);
    try {
      const { startDate, periodMentions, label } = getPeriodData();

      // Calculate metrics
      const totalMentions = periodMentions.length;
      const sentiments = {
        positive: periodMentions.filter(m => m.sentiment === 'positive').length,
        negative: periodMentions.filter(m => m.sentiment === 'negative').length,
        neutral: periodMentions.filter(m => m.sentiment === 'neutral').length
      };
      
      const totalReach = periodMentions.reduce((sum, m) => sum + (m.reach || 0), 0);
      const totalEngagement = periodMentions.reduce((sum, m) => sum + (m.engagement || 0), 0);
      
      const platforms = {};
      periodMentions.forEach(m => {
        platforms[m.source] = (platforms[m.source] || 0) + 1;
      });

      const topPlatforms = Object.entries(platforms)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([p, c]) => `${p}: ${c} mentions`);

      const allKeywords = periodMentions.flatMap(m => m.keywords || []);
      const keywordCounts = {};
      allKeywords.forEach(kw => {
        keywordCounts[kw] = (keywordCounts[kw] || 0) + 1;
      });
      const topKeywords = Object.entries(keywordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([k, v]) => `${k} (${v})`);

      const activeCampaigns = campaigns.map(c => c.name).join(', ');
      const activeCrises = crisisAlerts.filter(c => ['active', 'monitoring'].includes(c.status)).length;

      // Generate AI insights
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Sebagai AI analyst untuk tim PR, buatlah ringkasan insights ${label.toLowerCase()} yang komprehensif dan actionable berdasarkan data berikut:

PERIODE: ${format(startDate, 'dd MMM yyyy')} - ${format(new Date(), 'dd MMM yyyy')}

METRICS:
- Total Mentions: ${totalMentions}
- Reach: ${(totalReach / 1000000).toFixed(1)}M
- Engagement: ${totalEngagement.toLocaleString()}
- Sentimen: Positif ${sentiments.positive} (${Math.round((sentiments.positive/totalMentions)*100)}%), Negatif ${sentiments.negative} (${Math.round((sentiments.negative/totalMentions)*100)}%), Netral ${sentiments.neutral}

TOP PLATFORMS:
${topPlatforms.join('\n')}

TOP KEYWORDS:
${topKeywords.join(', ')}

CAMPAIGN AKTIF: ${activeCampaigns || 'Tidak ada'}
CRISIS ALERTS AKTIF: ${activeCrises}

Berikan analisis dalam format JSON dengan:
1. summary: Ringkasan eksekutif (2-3 kalimat)
2. key_highlights: Array 5-7 highlight penting
3. sentiment_analysis: Analisis sentimen mendalam
4. top_stories: 3-5 story/topik yang paling menonjol
5. performance_indicators: Indikator performa (positive/negative/neutral)
6. action_items: 5-7 action items yang harus dilakukan
7. recommendations: Rekomendasi strategis untuk periode berikutnya

Gunakan bahasa Indonesia yang profesional, data-driven, dan actionable.`,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            key_highlights: { type: "array", items: { type: "string" } },
            sentiment_analysis: { type: "string" },
            top_stories: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  impact: { type: "string", enum: ["positive", "negative", "neutral"] }
                }
              }
            },
            performance_indicators: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  metric: { type: "string" },
                  status: { type: "string", enum: ["up", "down", "stable"] },
                  change: { type: "string" }
                }
              }
            },
            action_items: { type: "array", items: { type: "string" } },
            recommendations: { type: "array", items: { type: "string" } }
          }
        }
      });

      const insightData = {
        ...result,
        metrics: {
          total_mentions: totalMentions,
          total_reach: totalReach,
          total_engagement: totalEngagement,
          sentiment_positive: sentiments.positive,
          sentiment_negative: sentiments.negative,
          sentiment_neutral: sentiments.neutral
        },
        period_label: label,
        generated_at: new Date().toISOString()
      };

      setGeneratedInsight(insightData);

      // Save to database
      await createReportMutation.mutateAsync({
        title: `AI Insights ${label} - ${format(new Date(), 'dd MMM yyyy')}`,
        type: 'custom',
        period_start: format(startDate, 'yyyy-MM-dd'),
        period_end: format(new Date(), 'yyyy-MM-dd'),
        status: 'ready',
        metrics: insightData.metrics,
        insights: JSON.stringify(result)
      });

    } catch (e) {
      console.error('Insight generation failed:', e);
    }
    setIsGenerating(false);
  };

  const impactColors = {
    positive: "bg-emerald-100 text-emerald-700 border-emerald-200",
    negative: "bg-red-100 text-red-700 border-red-200",
    neutral: "bg-slate-100 text-slate-700 border-slate-200"
  };

  const statusIcons = {
    up: { icon: TrendingUp, color: "text-emerald-500" },
    down: { icon: TrendingUp, color: "text-red-500 rotate-180" },
    stable: { icon: TrendingUp, color: "text-slate-500 rotate-90" }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Insights Dashboard"
        subtitle="Ringkasan dan analisis AI untuk data PR Anda"
      >
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-32 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={generateInsights} disabled={isGenerating}>
          <Sparkles className={cn("w-4 h-4 mr-2", isGenerating && "animate-spin")} />
          {isGenerating ? 'Generating...' : 'Generate Insights'}
        </Button>
      </PageHeader>

      {!generatedInsight ? (
        <Card className="p-12 bg-gradient-to-br from-purple-50 to-blue-50 border-0 shadow-sm text-center">
          <div className="max-w-md mx-auto">
            <Brain className="w-16 h-16 text-purple-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Generate AI-Powered Insights
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Dapatkan analisis mendalam dan rekomendasi strategis berdasarkan data monitoring Anda
            </p>
            <Button onClick={generateInsights} disabled={isGenerating} size="lg">
              <Sparkles className="w-5 h-5 mr-2" />
              Generate {period === 'daily' ? 'Daily' : period === 'weekly' ? 'Weekly' : 'Monthly'} Insights
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Executive Summary */}
          <Card className="p-6 bg-gradient-to-br from-blue-600 to-purple-600 border-0 shadow-lg text-white">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <Brain className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-bold">Executive Summary</h3>
                  <Badge className="bg-white/20 text-white border-0">
                    {generatedInsight.period_label}
                  </Badge>
                </div>
                <p className="text-white/90 leading-relaxed">{generatedInsight.summary}</p>
                <p className="text-xs text-white/70 mt-2">
                  Generated {format(new Date(generatedInsight.generated_at), 'dd MMM yyyy, HH:mm')}
                </p>
              </div>
            </div>
          </Card>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-white border-0 shadow-sm">
              <p className="text-xs text-slate-500 uppercase">Total Mentions</p>
              <p className="text-2xl font-bold text-slate-900">
                {generatedInsight.metrics.total_mentions.toLocaleString()}
              </p>
            </Card>
            <Card className="p-4 bg-white border-0 shadow-sm">
              <p className="text-xs text-slate-500 uppercase">Total Reach</p>
              <p className="text-2xl font-bold text-purple-600">
                {(generatedInsight.metrics.total_reach / 1000000).toFixed(1)}M
              </p>
            </Card>
            <Card className="p-4 bg-white border-0 shadow-sm">
              <p className="text-xs text-slate-500 uppercase">Engagement</p>
              <p className="text-2xl font-bold text-blue-600">
                {generatedInsight.metrics.total_engagement.toLocaleString()}
              </p>
            </Card>
            <Card className="p-4 bg-white border-0 shadow-sm">
              <p className="text-xs text-slate-500 uppercase">Sentiment</p>
              <p className="text-2xl font-bold text-emerald-600">
                {Math.round((generatedInsight.metrics.sentiment_positive / generatedInsight.metrics.total_mentions) * 100)}%
              </p>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Key Highlights */}
            <Card className="p-5 bg-white border-0 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Key Highlights
              </h3>
              <ul className="space-y-2">
                {generatedInsight.key_highlights?.map((highlight, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Performance Indicators */}
            <Card className="p-5 bg-white border-0 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-500" />
                Performance Indicators
              </h3>
              <div className="space-y-3">
                {generatedInsight.performance_indicators?.map((indicator, idx) => {
                  const statusConfig = statusIcons[indicator.status];
                  const Icon = statusConfig?.icon;
                  return (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-sm text-slate-700">{indicator.metric}</span>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-sm font-medium", statusConfig?.color)}>
                          {indicator.change}
                        </span>
                        {Icon && <Icon className={cn("w-4 h-4", statusConfig.color)} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Top Stories */}
          {generatedInsight.top_stories?.length > 0 && (
            <Card className="p-5 bg-white border-0 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-purple-500" />
                Top Stories
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {generatedInsight.top_stories.map((story, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-slate-900">{story.title}</span>
                      <Badge variant="outline" className={cn("text-xs", impactColors[story.impact])}>
                        {story.impact}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600">{story.description}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Sentiment Analysis */}
          <Card className="p-5 bg-white border-0 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Sentiment Analysis</h3>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {generatedInsight.sentiment_analysis}
            </p>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Action Items */}
            <Card className="p-5 bg-white border-0 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                Action Items
              </h3>
              <ul className="space-y-2">
                {generatedInsight.action_items?.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-emerald-600">{idx + 1}</span>
                    </div>
                    <span className="text-sm text-slate-700">{item}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Recommendations */}
            <Card className="p-5 bg-white border-0 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-500" />
                Strategic Recommendations
              </h3>
              <ul className="space-y-2">
                {generatedInsight.recommendations?.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="text-purple-500 mt-1">→</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </>
      )}

      {/* Saved Insights History */}
      {savedInsights.length > 0 && (
        <Card className="p-5 bg-white border-0 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            Previous Insights
          </h3>
          <div className="space-y-2">
            {savedInsights.slice(0, 5).map(insight => (
              <div 
                key={insight.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{insight.title}</p>
                    <p className="text-xs text-slate-500">
                      {format(new Date(insight.created_date), 'dd MMM yyyy, HH:mm')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}