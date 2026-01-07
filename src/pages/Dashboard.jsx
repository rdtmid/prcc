import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import StatsCard from '@/components/dashboard/StatsCard';
import SentimentGauge from '@/components/dashboard/SentimentGauge';
import MentionsList from '@/components/dashboard/MentionsList';
import TrendChart from '@/components/dashboard/TrendChart';
import PlatformDistribution from '@/components/dashboard/PlatformDistribution';
import CrisisAlertBanner from '@/components/dashboard/CrisisAlertBanner';
import TopKeywords from '@/components/dashboard/TopKeywords';
import QuickActions from '@/components/dashboard/QuickActions';
import TrendPrediction from '@/components/ai/TrendPrediction';
import DailyBriefing from '@/components/ai/DailyBriefing';
import LiveIndicator from '@/components/monitoring/LiveIndicator';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Radio, TrendingUp, Users, Eye, MessageCircle, 
  RefreshCw, Calendar, ArrowRight, Zap
} from 'lucide-react';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState('7d');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sentimentFilter, setSentimentFilter] = useState(null);
  const [dateFilter, setDateFilter] = useState(null);
  
  const queryClient = useQueryClient();

  const { data: mentions = [], refetch: refetchMentions } = useQuery({
    queryKey: ['mentions'],
    queryFn: () => base44.entities.Mention.list('-created_date', 100),
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  const updateMentionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Mention.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['mentions']),
  });

  const { data: crisisAlerts = [] } = useQuery({
    queryKey: ['crisisAlerts'],
    queryFn: () => base44.entities.CrisisAlert.filter({ status: 'active' }),
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  const { data: keywords = [] } = useQuery({
    queryKey: ['keywords'],
    queryFn: () => base44.entities.Keyword.filter({ is_active: true }),
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => base44.entities.Campaign.filter({ status: 'active' }),
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchMentions();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Calculate stats
  const totalMentions = mentions.length;
  const totalReach = mentions.reduce((sum, m) => sum + (m.reach || 0), 0);
  const totalEngagement = mentions.reduce((sum, m) => sum + (m.engagement || 0), 0);
  const sentimentCounts = {
    positive: mentions.filter(m => m.sentiment === 'positive').length,
    negative: mentions.filter(m => m.sentiment === 'negative').length,
    neutral: mentions.filter(m => m.sentiment === 'neutral').length,
  };

  // Platform distribution
  const platformCounts = mentions.reduce((acc, m) => {
    acc[m.source] = (acc[m.source] || 0) + 1;
    return acc;
  }, {});

  // Trend data
  const days = eachDayOfInterval({
    start: subDays(new Date(), 6),
    end: new Date()
  });

  const trendData = days.map(day => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayMentions = mentions.filter(m => {
      const mDate = m.mention_date || m.created_date;
      return mDate && format(new Date(mDate), 'yyyy-MM-dd') === dayStr;
    });
    
    return {
      name: format(day, 'MMM dd'),
      mentions: dayMentions.length,
      positive: dayMentions.filter(m => m.sentiment === 'positive').length,
      negative: dayMentions.filter(m => m.sentiment === 'negative').length,
      reach: dayMentions.reduce((sum, m) => sum + (m.reach || 0), 0) / 1000,
    };
  });

  // Recent mentions with filters
  const filteredMentions = mentions.filter(m => {
    if (sentimentFilter && m.sentiment !== sentimentFilter) return false;
    if (dateFilter) {
      const mDate = m.mention_date || m.created_date;
      const mentionDate = format(new Date(mDate), 'MMM dd');
      if (mentionDate !== dateFilter) return false;
    }
    return true;
  });
  const recentMentions = (sentimentFilter || dateFilter ? filteredMentions : mentions).slice(0, 5);

  const handleSentimentClick = (sentiment) => {
    setSentimentFilter(sentimentFilter === sentiment ? null : sentiment);
    setDateFilter(null);
  };

  const handleChartClick = (date) => {
    setDateFilter(dateFilter === date ? null : date);
    setSentimentFilter(null);
  };

  const handleFlag = (mention) => {
    updateMentionMutation.mutate({
      id: mention.id,
      data: { is_flagged: !mention.is_flagged }
    });
  };

  return (
    <div className="space-y-6">
      {/* Crisis Alert Banner */}
      <CrisisAlertBanner alerts={crisisAlerts} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <LiveIndicator />
          </div>
          <p className="text-sm text-slate-500">
            Real-time media monitoring overview (auto-updates every 30s)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={timeRange} onValueChange={setTimeRange}>
            <TabsList className="bg-white border">
              <TabsTrigger value="24h" className="text-xs">24h</TabsTrigger>
              <TabsTrigger value="7d" className="text-xs">7 days</TabsTrigger>
              <TabsTrigger value="30d" className="text-xs">30 days</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Mentions"
          value={totalMentions.toLocaleString()}
          change={12}
          changeType="positive"
          icon={Radio}
          iconBg="bg-blue-500/10"
          iconColor="text-blue-500"
        />
        <StatsCard
          title="Total Reach"
          value={`${(totalReach / 1000000).toFixed(1)}M`}
          change={8}
          changeType="positive"
          icon={Eye}
          iconBg="bg-purple-500/10"
          iconColor="text-purple-500"
        />
        <StatsCard
          title="Engagement"
          value={totalEngagement.toLocaleString()}
          change={-3}
          changeType="negative"
          icon={MessageCircle}
          iconBg="bg-emerald-500/10"
          iconColor="text-emerald-500"
        />
        <StatsCard
          title="Active Campaigns"
          value={campaigns.length}
          icon={Zap}
          iconBg="bg-amber-500/10"
          iconColor="text-amber-500"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Charts */}
        <div className="lg:col-span-2 space-y-6">
          <TrendChart 
            data={trendData} 
            title="Mention Trends (Click to filter)"
            dataKeys={['mentions', 'positive', 'negative']}
            onDataClick={handleChartClick}
          />

          <Card className="p-5 bg-white border-0 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {sentimentFilter || dateFilter ? 'Filtered' : 'Recent'} Mentions
                </h3>
                {(sentimentFilter || dateFilter) && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {sentimentFilter && `Sentiment: ${sentimentFilter}`}
                    {dateFilter && `Date: ${dateFilter}`}
                    {' '}
                    <button 
                      onClick={() => { setSentimentFilter(null); setDateFilter(null); }}
                      className="text-blue-600 hover:underline"
                    >
                      Clear
                    </button>
                  </p>
                )}
              </div>
              <Link to={createPageUrl("Monitoring")}>
                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                  View All
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            <MentionsList 
              mentions={recentMentions} 
              onSelect={(mention) => {
                if (mention.source_url) {
                  window.open(mention.source_url, '_blank');
                }
              }}
              onFlag={handleFlag} 
              compact 
            />
          </Card>
        </div>

        {/* Right Column - Widgets */}
        <div className="space-y-6">
          <SentimentGauge 
            positive={sentimentCounts.positive}
            neutral={sentimentCounts.neutral}
            negative={sentimentCounts.negative}
            onSentimentClick={handleSentimentClick}
          />
          
          <PlatformDistribution data={platformCounts} />
          
          <TopKeywords keywords={keywords} />
          
          <QuickActions />
        </div>
      </div>

      {/* AI Features */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DailyBriefing />
        <TrendPrediction mentions={mentions} timeRange={timeRange} />
      </div>
    </div>
  );
}