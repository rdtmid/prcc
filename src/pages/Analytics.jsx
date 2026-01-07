import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/common/PageHeader';
import StatsCard from '@/components/dashboard/StatsCard';
import TrendChart from '@/components/dashboard/TrendChart';
import PlatformDistribution from '@/components/dashboard/PlatformDistribution';
import SentimentGauge from '@/components/dashboard/SentimentGauge';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  BarChart3, Download, FileText, TrendingUp, Eye, 
  MessageCircle, Radio, DollarSign, Sparkles, Calendar,
  ExternalLink, Trash2, FileDown
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend 
} from 'recharts';
import { format, subDays, eachDayOfInterval, startOfWeek, endOfWeek, eachWeekOfInterval } from 'date-fns';
import { cn } from "@/lib/utils";

export default function Analytics() {
  const [timeRange, setTimeRange] = useState('7d');
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newReport, setNewReport] = useState({
    title: '',
    type: 'weekly',
    period_start: '',
    period_end: ''
  });

  const queryClient = useQueryClient();

  const { data: mentions = [] } = useQuery({
    queryKey: ['mentions'],
    queryFn: () => base44.entities.Mention.list('-created_date', 500),
  });

  const { data: reports = [] } = useQuery({
    queryKey: ['reports'],
    queryFn: () => base44.entities.Report.list('-created_date'),
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => base44.entities.Campaign.list(),
  });

  const createReportMutation = useMutation({
    mutationFn: (data) => base44.entities.Report.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['reports']);
      setShowReportDialog(false);
    },
  });

  const deleteReportMutation = useMutation({
    mutationFn: (id) => base44.entities.Report.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['reports']);
    },
  });

  // Get date range
  const getDateRange = () => {
    const end = new Date();
    let start;
    switch (timeRange) {
      case '24h': start = subDays(end, 1); break;
      case '7d': start = subDays(end, 7); break;
      case '30d': start = subDays(end, 30); break;
      case '90d': start = subDays(end, 90); break;
      default: start = subDays(end, 7);
    }
    return { start, end };
  };

  const { start, end } = getDateRange();

  // Filter mentions by date
  const filteredMentions = mentions.filter(m => {
    const date = new Date(m.mention_date || m.created_date);
    return date >= start && date <= end;
  });

  // Calculate metrics
  const totalMentions = filteredMentions.length;
  const totalReach = filteredMentions.reduce((sum, m) => sum + (m.reach || 0), 0);
  const totalEngagement = filteredMentions.reduce((sum, m) => sum + (m.engagement || 0), 0);
  const sentimentCounts = {
    positive: filteredMentions.filter(m => m.sentiment === 'positive').length,
    negative: filteredMentions.filter(m => m.sentiment === 'negative').length,
    neutral: filteredMentions.filter(m => m.sentiment === 'neutral').length,
  };

  // EMV calculation (simplified)
  const avgCPM = 5; // $5 per 1000 impressions
  const emv = (totalReach / 1000) * avgCPM;

  // Share of Voice (mock competitor data)
  const shareOfVoice = 65; // percentage

  // Platform distribution
  const platformCounts = filteredMentions.reduce((acc, m) => {
    acc[m.source] = (acc[m.source] || 0) + 1;
    return acc;
  }, {});

  // Trend data
  const days = eachDayOfInterval({ start, end });
  const trendData = days.map(day => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayMentions = filteredMentions.filter(m => {
      const mDate = m.mention_date || m.created_date;
      return mDate && format(new Date(mDate), 'yyyy-MM-dd') === dayStr;
    });
    
    return {
      name: format(day, 'MMM dd'),
      mentions: dayMentions.length,
      reach: Math.round(dayMentions.reduce((sum, m) => sum + (m.reach || 0), 0) / 1000),
      engagement: dayMentions.reduce((sum, m) => sum + (m.engagement || 0), 0),
    };
  });

  // Source comparison data
  const sourceData = Object.entries(platformCounts).map(([source, count]) => ({
    name: source.charAt(0).toUpperCase() + source.slice(1),
    mentions: count,
    reach: filteredMentions.filter(m => m.source === source).reduce((sum, m) => sum + (m.reach || 0), 0) / 1000,
  })).slice(0, 6);

  // Generate AI insights
  const generateInsights = async () => {
    setIsGenerating(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this PR data and provide 3-5 key insights and recommendations:

Total Mentions: ${totalMentions}
Total Reach: ${totalReach.toLocaleString()}
Total Engagement: ${totalEngagement.toLocaleString()}
Positive Sentiment: ${sentimentCounts.positive} (${Math.round((sentimentCounts.positive / totalMentions) * 100)}%)
Negative Sentiment: ${sentimentCounts.negative} (${Math.round((sentimentCounts.negative / totalMentions) * 100)}%)
Top Platforms: ${Object.entries(platformCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([p, c]) => `${p}: ${c}`).join(', ')}

Provide actionable PR insights and recommendations.`,
        response_json_schema: {
          type: "object",
          properties: {
            insights: { type: "array", items: { type: "string" } },
            recommendations: { type: "array", items: { type: "string" } }
          }
        }
      });

      // Create report with insights
      const report = {
        title: `Analytics Report - ${format(new Date(), 'MMM d, yyyy')}`,
        type: 'custom',
        period_start: format(start, 'yyyy-MM-dd'),
        period_end: format(end, 'yyyy-MM-dd'),
        status: 'ready',
        metrics: {
          total_mentions: totalMentions,
          total_reach: totalReach,
          total_engagement: totalEngagement,
          sentiment_positive: sentimentCounts.positive,
          sentiment_negative: sentimentCounts.negative,
          sentiment_neutral: sentimentCounts.neutral,
          emv: emv
        },
        insights: result.insights?.join('\n\n'),
        recommendations: result.recommendations
      };

      createReportMutation.mutate(report);
    } catch (e) {
      console.error('Failed to generate insights:', e);
    }
    setIsGenerating(false);
  };

  const handleDownloadPDF = (report) => {
    // Generate PDF content
    const reportContent = `
      ${report.title}
      
      Period: ${report.period_start ? format(new Date(report.period_start), 'MMM d, yyyy') : ''} - ${report.period_end ? format(new Date(report.period_end), 'MMM d, yyyy') : ''}
      
      METRICS:
      Total Mentions: ${report.metrics?.total_mentions || 0}
      Total Reach: ${report.metrics?.total_reach?.toLocaleString() || 0}
      Total Engagement: ${report.metrics?.total_engagement?.toLocaleString() || 0}
      Positive Sentiment: ${report.metrics?.sentiment_positive || 0}
      Negative Sentiment: ${report.metrics?.sentiment_negative || 0}
      Neutral Sentiment: ${report.metrics?.sentiment_neutral || 0}
      EMV: $${report.metrics?.emv?.toFixed(2) || 0}
      
      INSIGHTS:
      ${report.insights || 'No insights available'}
      
      RECOMMENDATIONS:
      ${report.recommendations?.map((r, i) => `${i + 1}. ${r}`).join('\n') || 'No recommendations available'}
    `;
    
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.title.replace(/[^a-z0-9]/gi, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadHTML = (report) => {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${report.title}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; color: #333; }
    h1 { color: #2563eb; border-bottom: 3px solid #2563eb; padding-bottom: 10px; }
    h2 { color: #475569; margin-top: 30px; }
    .metric { background: #f1f5f9; padding: 15px; margin: 10px 0; border-radius: 8px; }
    .metric-label { font-weight: bold; color: #64748b; }
    .metric-value { font-size: 24px; color: #2563eb; }
    .section { margin: 30px 0; }
    ul { list-style: none; padding: 0; }
    li { padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <h1>${report.title}</h1>
  <p><strong>Period:</strong> ${report.period_start ? format(new Date(report.period_start), 'MMM d, yyyy') : ''} - ${report.period_end ? format(new Date(report.period_end), 'MMM d, yyyy') : ''}</p>
  
  <div class="section">
    <h2>Key Metrics</h2>
    <div class="metric">
      <div class="metric-label">Total Mentions</div>
      <div class="metric-value">${report.metrics?.total_mentions?.toLocaleString() || 0}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Total Reach</div>
      <div class="metric-value">${report.metrics?.total_reach?.toLocaleString() || 0}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Total Engagement</div>
      <div class="metric-value">${report.metrics?.total_engagement?.toLocaleString() || 0}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Earned Media Value (EMV)</div>
      <div class="metric-value">$${report.metrics?.emv?.toFixed(2) || 0}</div>
    </div>
  </div>
  
  <div class="section">
    <h2>Sentiment Analysis</h2>
    <div class="metric">
      <div class="metric-label">Positive</div>
      <div class="metric-value">${report.metrics?.sentiment_positive || 0}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Negative</div>
      <div class="metric-value">${report.metrics?.sentiment_negative || 0}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Neutral</div>
      <div class="metric-value">${report.metrics?.sentiment_neutral || 0}</div>
    </div>
  </div>
  
  <div class="section">
    <h2>Insights</h2>
    <p>${report.insights || 'No insights available'}</p>
  </div>
  
  <div class="section">
    <h2>Recommendations</h2>
    <ul>
      ${report.recommendations?.map(r => `<li>${r}</li>`).join('') || '<li>No recommendations available</li>'}
    </ul>
  </div>
</body>
</html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.title.replace(/[^a-z0-9]/gi, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePreview = (report) => {
    setSelectedReport(report);
    setShowPreviewDialog(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        subtitle="Track PR performance and generate insights"
      >
        <Tabs value={timeRange} onValueChange={setTimeRange}>
          <TabsList className="bg-white border">
            <TabsTrigger value="24h" className="text-xs">24h</TabsTrigger>
            <TabsTrigger value="7d" className="text-xs">7 days</TabsTrigger>
            <TabsTrigger value="30d" className="text-xs">30 days</TabsTrigger>
            <TabsTrigger value="90d" className="text-xs">90 days</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button onClick={generateInsights} disabled={isGenerating}>
          <Sparkles className={cn("w-4 h-4 mr-2", isGenerating && "animate-spin")} />
          Generate Report
        </Button>
      </PageHeader>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatsCard
          title="Total Mentions"
          value={totalMentions.toLocaleString()}
          icon={Radio}
          iconBg="bg-blue-500/10"
          iconColor="text-blue-500"
        />
        <StatsCard
          title="Total Reach"
          value={`${(totalReach / 1000000).toFixed(1)}M`}
          icon={Eye}
          iconBg="bg-purple-500/10"
          iconColor="text-purple-500"
        />
        <StatsCard
          title="Engagement"
          value={totalEngagement.toLocaleString()}
          icon={MessageCircle}
          iconBg="bg-emerald-500/10"
          iconColor="text-emerald-500"
        />
        <StatsCard
          title="EMV"
          value={`$${emv.toFixed(0)}`}
          subtitle="Earned Media Value"
          icon={DollarSign}
          iconBg="bg-amber-500/10"
          iconColor="text-amber-500"
        />
        <StatsCard
          title="Share of Voice"
          value={`${shareOfVoice}%`}
          icon={TrendingUp}
          iconBg="bg-cyan-500/10"
          iconColor="text-cyan-500"
        />
        <StatsCard
          title="Avg. Sentiment"
          value={sentimentCounts.positive > sentimentCounts.negative ? '+' : '-'}
          subtitle={`${Math.round((sentimentCounts.positive / totalMentions) * 100)}% positive`}
          icon={BarChart3}
          iconBg="bg-pink-500/10"
          iconColor="text-pink-500"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TrendChart 
            data={trendData} 
            title="Mention Trends Over Time"
            dataKeys={['mentions', 'engagement']}
          />
        </div>
        <SentimentGauge 
          positive={sentimentCounts.positive}
          neutral={sentimentCounts.neutral}
          negative={sentimentCounts.negative}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PlatformDistribution data={platformCounts} />
        
        <Card className="p-5 bg-white border-0 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Source Comparison</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="mentions" name="Mentions" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                <Bar dataKey="reach" name="Reach (K)" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Recent Reports */}
      <Card className="p-5 bg-white border-0 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-900">Recent Reports</h3>
          <Button variant="outline" size="sm" onClick={() => setShowReportDialog(true)}>
            <FileText className="w-4 h-4 mr-2" />
            Create Report
          </Button>
        </div>
        
        {reports.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p>No reports generated yet</p>
            <p className="text-sm">Click "Generate Report" to create your first analytics report</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.slice(0, 10).map(report => (
              <div 
                key={report.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{report.title}</p>
                    <p className="text-xs text-slate-500">
                      {report.period_start && report.period_end 
                        ? `${format(new Date(report.period_start), 'MMM d')} - ${format(new Date(report.period_end), 'MMM d, yyyy')}`
                        : format(new Date(report.created_date), 'MMM d, yyyy')
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-xs px-2 py-1 rounded-full",
                    report.status === 'ready' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  )}>
                    {report.status}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handlePreview(report)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDownloadHTML(report)}
                  >
                    <FileDown className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => deleteReportMutation.mutate(report.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedReport?.title}</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-6 py-4">
              <div className="text-sm text-slate-500">
                <strong>Period:</strong> {selectedReport.period_start && selectedReport.period_end 
                  ? `${format(new Date(selectedReport.period_start), 'MMM d, yyyy')} - ${format(new Date(selectedReport.period_end), 'MMM d, yyyy')}`
                  : format(new Date(selectedReport.created_date), 'MMM d, yyyy')
                }
              </div>
              
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900">Key Metrics</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="text-xs text-slate-500">Total Mentions</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {selectedReport.metrics?.total_mentions?.toLocaleString() || 0}
                    </div>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="text-xs text-slate-500">Total Reach</div>
                    <div className="text-2xl font-bold text-purple-600">
                      {selectedReport.metrics?.total_reach?.toLocaleString() || 0}
                    </div>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-lg">
                    <div className="text-xs text-slate-500">Engagement</div>
                    <div className="text-2xl font-bold text-emerald-600">
                      {selectedReport.metrics?.total_engagement?.toLocaleString() || 0}
                    </div>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg">
                    <div className="text-xs text-slate-500">EMV</div>
                    <div className="text-2xl font-bold text-amber-600">
                      ${selectedReport.metrics?.emv?.toFixed(2) || 0}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900">Sentiment Analysis</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-emerald-50 rounded-lg text-center">
                    <div className="text-xs text-slate-500">Positive</div>
                    <div className="text-xl font-bold text-emerald-600">
                      {selectedReport.metrics?.sentiment_positive || 0}
                    </div>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg text-center">
                    <div className="text-xs text-slate-500">Negative</div>
                    <div className="text-xl font-bold text-red-600">
                      {selectedReport.metrics?.sentiment_negative || 0}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg text-center">
                    <div className="text-xs text-slate-500">Neutral</div>
                    <div className="text-xl font-bold text-slate-600">
                      {selectedReport.metrics?.sentiment_neutral || 0}
                    </div>
                  </div>
                </div>
              </div>
              
              {selectedReport.insights && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-slate-900">Insights</h3>
                  <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-700 whitespace-pre-wrap">
                    {selectedReport.insights}
                  </div>
                </div>
              )}
              
              {selectedReport.recommendations?.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-slate-900">Recommendations</h3>
                  <ul className="space-y-2">
                    {selectedReport.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex gap-2 text-sm text-slate-700">
                        <span className="text-blue-600 font-semibold">{idx + 1}.</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => handleDownloadHTML(selectedReport)}>
              <FileDown className="w-4 h-4 mr-2" />
              Download HTML
            </Button>
            <Button onClick={() => setShowPreviewDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Custom Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Report Title</Label>
              <Input
                value={newReport.title}
                onChange={(e) => setNewReport({ ...newReport, title: e.target.value })}
                placeholder="e.g., Q1 PR Performance Report"
              />
            </div>
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select 
                value={newReport.type} 
                onValueChange={(v) => setNewReport({ ...newReport, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="campaign">Campaign</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Period Start</Label>
                <Input
                  type="date"
                  value={newReport.period_start}
                  onChange={(e) => setNewReport({ ...newReport, period_start: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Period End</Label>
                <Input
                  type="date"
                  value={newReport.period_end}
                  onChange={(e) => setNewReport({ ...newReport, period_end: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => createReportMutation.mutate({ ...newReport, status: 'generating' })}
              disabled={!newReport.title}
            >
              Create Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}