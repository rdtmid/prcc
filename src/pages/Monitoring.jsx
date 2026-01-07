import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/common/PageHeader';
import MentionsList from '@/components/dashboard/MentionsList';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import TeamActivityFeed from '@/components/collaboration/TeamActivityFeed';
import ResponseSuggestion from '@/components/ai/ResponseSuggestion';
import LiveIndicator from '@/components/monitoring/LiveIndicator';
import { 
  Filter, Plus, X, Twitter, Instagram, Facebook, Youtube,
  Globe, MessageCircle, ExternalLink, Flag, AlertTriangle,
  CheckCircle, Clock, Send, User, Calendar, Heart, Share2,
  Sparkles, RefreshCw, ListTodo, Search
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from "@/lib/utils";
import StatusBadge from '@/components/common/StatusBadge';

const platformOptions = [
  { value: 'all', label: 'All Platforms' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'news', label: 'News' },
  { value: 'blog', label: 'Blog' },
  { value: 'forum', label: 'Forum' },
];

const sentimentOptions = [
  { value: 'all', label: 'All Sentiments' },
  { value: 'positive', label: 'Positive' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'negative', label: 'Negative' },
];

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'new', label: 'New' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'responded', label: 'Responded' },
];

export default function Monitoring() {
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [sentimentFilter, setSentimentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedMention, setSelectedMention] = useState(null);
  const [showKeywordDialog, setShowKeywordDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showManualSearchDialog, setShowManualSearchDialog] = useState(false);
  const [newKeyword, setNewKeyword] = useState({ keyword: '', type: 'brand', priority: 'medium' });
  const [newTask, setNewTask] = useState({ title: '', description: '', type: 'response', priority: 'high', due_date: '' });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [user, setUser] = useState(null);
  const [manualSearch, setManualSearch] = useState({ query: '', platform: 'all', timeframe: '7d' });
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  React.useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
    } catch (e) {}
  };

  const queryClient = useQueryClient();

  const { data: mentions = [], isLoading } = useQuery({
    queryKey: ['mentions'],
    queryFn: () => base44.entities.Mention.list('-created_date', 200),
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  const { data: keywords = [] } = useQuery({
    queryKey: ['keywords'],
    queryFn: () => base44.entities.Keyword.list(),
  });

  const updateMentionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Mention.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['mentions']),
  });

  const createKeywordMutation = useMutation({
    mutationFn: async (data) => {
      // Split by comma and create multiple keywords
      const keywords = data.keyword.split(',').map(k => k.trim()).filter(k => k);
      
      if (keywords.length === 1) {
        return base44.entities.Keyword.create(data);
      } else {
        const keywordsData = keywords.map(kw => ({
          keyword: kw,
          type: data.type,
          priority: data.priority,
          is_active: true
        }));
        return base44.entities.Keyword.bulkCreate(keywordsData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['keywords']);
      setShowKeywordDialog(false);
      setNewKeyword({ keyword: '', type: 'brand', priority: 'medium' });
    },
  });

  const deleteKeywordMutation = useMutation({
    mutationFn: (id) => base44.entities.Keyword.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['keywords']),
  });

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      setShowTaskDialog(false);
    },
  });

  const createNotificationMutation = useMutation({
    mutationFn: (data) => base44.entities.Notification.create(data),
  });

  // Filter mentions
  const filteredMentions = mentions.filter(m => {
    if (search && !m.content?.toLowerCase().includes(search.toLowerCase()) && 
        !m.author?.toLowerCase().includes(search.toLowerCase())) return false;
    if (platformFilter !== 'all' && m.source !== platformFilter) return false;
    if (sentimentFilter !== 'all' && m.sentiment !== sentimentFilter) return false;
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    return true;
  });

  const handleFlag = (mention) => {
    updateMentionMutation.mutate({
      id: mention.id,
      data: { is_flagged: !mention.is_flagged }
    });
  };

  const handleStatusChange = (status) => {
    if (selectedMention) {
      updateMentionMutation.mutate({
        id: selectedMention.id,
        data: { status }
      });
      setSelectedMention({ ...selectedMention, status });
    }
  };

  const analyzeSentiment = async (mention) => {
    setIsAnalyzing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze the sentiment of this social media post and return a JSON object with sentiment (positive, negative, or neutral) and a score from -1 to 1:

"${mention.content}"`,
        response_json_schema: {
          type: "object",
          properties: {
            sentiment: { type: "string", enum: ["positive", "negative", "neutral"] },
            score: { type: "number" },
            keywords: { type: "array", items: { type: "string" } }
          }
        }
      });

      updateMentionMutation.mutate({
        id: mention.id,
        data: { 
          sentiment: result.sentiment, 
          sentiment_score: result.score,
          keywords: result.keywords 
        }
      });

      if (selectedMention?.id === mention.id) {
        setSelectedMention({ ...selectedMention, ...result });
      }
    } catch (e) {
      console.error('Sentiment analysis failed:', e);
    }
    setIsAnalyzing(false);
  };

  const handleCreateTask = async () => {
    if (!selectedMention || !user) return;
    
    const task = {
      ...newTask,
      related_mention_id: selectedMention.id,
      assigned_by: user.email
    };
    
    await createTaskMutation.mutateAsync(task);
    
    // Notify assigned person
    if (newTask.assigned_to && newTask.assigned_to !== user.email) {
      await createNotificationMutation.mutateAsync({
        type: 'assignment',
        title: 'New task assigned to you',
        message: `${newTask.title} - Related to: "${selectedMention.content.slice(0, 50)}..."`,
        recipient: newTask.assigned_to,
        sender: user.email,
        related_entity: 'Mention',
        related_id: selectedMention.id,
        priority: newTask.priority,
        action_required: true
      });
    }
    
    setNewTask({ title: '', description: '', type: 'response', priority: 'high', due_date: '' });
    setShowTaskDialog(false);
  };

  const handleManualSearch = async () => {
    if (!manualSearch.query) return;
    
    setIsSearching(true);
    try {
      // Use AI to search and analyze mentions
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Cari dan analisis informasi terkait: "${manualSearch.query}"
        
Platform yang dicari: ${manualSearch.platform === 'all' ? 'Semua platform' : manualSearch.platform}
Timeframe: ${manualSearch.timeframe}

Berikan analisis lengkap dalam format JSON yang mencakup:
- Summary: Ringkasan singkat tentang topik/isu ini
- Key findings: Temuan-temuan penting (minimal 3-5 poin)
- Sentiment overview: Sentimen umum (positive/negative/neutral) dengan penjelasan
- Trending topics: Topik atau hashtag yang sedang trending terkait
- Notable mentions: Mention atau diskusi penting yang menonjol (minimal 3-5), SERTAKAN source_url (link asli sumber) untuk setiap mention
- Recommendations: Rekomendasi langkah selanjutnya untuk monitoring atau respons
- Suggested keywords: Keyword yang disarankan untuk monitoring aktif (3-5 keyword paling relevan)

PENTING: Untuk notable_mentions, pisahkan konten text dengan URL. Jangan masukkan URL ke dalam content, tapi simpan di field source_url terpisah.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            key_findings: { 
              type: "array", 
              items: { type: "string" } 
            },
            sentiment_overview: {
              type: "object",
              properties: {
                overall: { type: "string", enum: ["positive", "negative", "neutral", "mixed"] },
                explanation: { type: "string" }
              }
            },
            trending_topics: {
              type: "array",
              items: { type: "string" }
            },
            notable_mentions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  source: { type: "string" },
                  content: { type: "string" },
                  impact: { type: "string" },
                  author: { type: "string" },
                  sentiment: { type: "string", enum: ["positive", "negative", "neutral"] },
                  source_url: { type: "string" }
                }
              }
            },
            recommendations: {
              type: "array",
              items: { type: "string" }
            },
            suggested_keywords: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  keyword: { type: "string" },
                  reason: { type: "string" },
                  priority: { type: "string", enum: ["low", "medium", "high"] }
                }
              }
            }
          }
        }
      });

      setSearchResults({ ...result, searchQuery: manualSearch.query });
    } catch (e) {
      console.error('Manual search failed:', e);
    }
    setIsSearching(false);
  };

  const saveMentionsFromSearch = async () => {
    if (!searchResults?.notable_mentions) return;
    
    const mentionsToSave = searchResults.notable_mentions.map(mention => ({
      source: mention.source?.toLowerCase() || 'news',
      source_url: mention.source_url || '',
      content: mention.content,
      author: mention.author || 'Unknown',
      sentiment: mention.sentiment || 'neutral',
      priority: mention.impact === 'high' || mention.impact === 'viral' ? 'high' : 'medium',
      status: 'new',
      keywords: [searchResults.searchQuery, ...searchResults.trending_topics?.slice(0, 3) || []],
      is_flagged: mention.impact === 'high' || mention.impact === 'viral',
      mention_date: new Date().toISOString()
    }));

    try {
      await base44.entities.Mention.bulkCreate(mentionsToSave);
      queryClient.invalidateQueries(['mentions']);
    } catch (e) {
      console.error('Failed to save mentions:', e);
    }
  };

  const addSuggestedKeyword = async (keyword) => {
    try {
      await createKeywordMutation.mutateAsync({
        keyword: keyword.keyword,
        type: 'topic',
        priority: keyword.priority,
        is_active: true
      });
    } catch (e) {
      console.error('Failed to add keyword:', e);
    }
  };

  // Stats
  const stats = {
    total: mentions.length,
    positive: mentions.filter(m => m.sentiment === 'positive').length,
    negative: mentions.filter(m => m.sentiment === 'negative').length,
    flagged: mentions.filter(m => m.is_flagged).length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            Media Monitoring
            <LiveIndicator />
          </div>
        }
        subtitle="Real-time tracking across all platforms (auto-updates every 30s)"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search mentions..."
        actionLabel="Add Keyword"
        onAction={() => setShowKeywordDialog(true)}
      >
        <Button 
          variant="outline"
          onClick={() => setShowManualSearchDialog(true)}
          className="border-blue-200 text-blue-600 hover:bg-blue-50"
        >
          <Search className="w-4 h-4 mr-2" />
          Manual Search
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border-0 shadow-sm">
          <p className="text-xs text-slate-500 uppercase">Total Mentions</p>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </Card>
        <Card className="p-4 bg-white border-0 shadow-sm">
          <p className="text-xs text-slate-500 uppercase">Positive</p>
          <p className="text-2xl font-bold text-emerald-600">{stats.positive}</p>
        </Card>
        <Card className="p-4 bg-white border-0 shadow-sm">
          <p className="text-xs text-slate-500 uppercase">Negative</p>
          <p className="text-2xl font-bold text-red-600">{stats.negative}</p>
        </Card>
        <Card className="p-4 bg-white border-0 shadow-sm">
          <p className="text-xs text-slate-500 uppercase">Flagged</p>
          <p className="text-2xl font-bold text-amber-600">{stats.flagged}</p>
        </Card>
      </div>

      {/* Keywords */}
      <Card className="p-4 bg-white border-0 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-900">Tracked Keywords</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {keywords.map(kw => (
            <Badge 
              key={kw.id} 
              variant="outline" 
              className="pl-3 pr-1.5 py-1.5 flex items-center gap-2"
            >
              <span>{kw.keyword}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-slate-200 rounded-full"
                onClick={() => deleteKeywordMutation.mutate(kw.id)}
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          ))}
          {keywords.length === 0 && (
            <p className="text-sm text-slate-400">No keywords tracked yet. Add your first keyword to start monitoring.</p>
          )}
        </div>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-40 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {platformOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
          <SelectTrigger className="w-40 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sentimentOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Mentions List */}
      <MentionsList 
        mentions={filteredMentions}
        onSelect={setSelectedMention}
        onFlag={handleFlag}
      />

      {/* Mention Detail Sheet */}
      <Sheet open={!!selectedMention} onOpenChange={() => setSelectedMention(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedMention && (
            <>
              <SheetHeader>
                <SheetTitle>Mention Details</SheetTitle>
              </SheetHeader>
              
              <div className="mt-6 space-y-6">
                {/* Author Info */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                    <User className="w-6 h-6 text-slate-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{selectedMention.author || 'Unknown'}</p>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <span className="capitalize">{selectedMention.source}</span>
                      {selectedMention.author_followers && (
                        <span>• {(selectedMention.author_followers / 1000).toFixed(0)}K followers</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-slate-700">{selectedMention.content}</p>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <Heart className="w-4 h-4 mx-auto text-red-500 mb-1" />
                    <p className="text-lg font-semibold">{selectedMention.likes || 0}</p>
                    <p className="text-xs text-slate-500">Likes</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <MessageCircle className="w-4 h-4 mx-auto text-blue-500 mb-1" />
                    <p className="text-lg font-semibold">{selectedMention.comments || 0}</p>
                    <p className="text-xs text-slate-500">Comments</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <Share2 className="w-4 h-4 mx-auto text-emerald-500 mb-1" />
                    <p className="text-lg font-semibold">{selectedMention.shares || 0}</p>
                    <p className="text-xs text-slate-500">Shares</p>
                  </div>
                </div>

                {/* Status & Sentiment */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Sentiment</span>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={selectedMention.sentiment} />
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => analyzeSentiment(selectedMention)}
                        disabled={isAnalyzing}
                      >
                        <Sparkles className={cn("w-4 h-4", isAnalyzing && "animate-spin")} />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Status</span>
                    <Select value={selectedMention.status || 'new'} onValueChange={handleStatusChange}>
                      <SelectTrigger className="w-32 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="reviewed">Reviewed</SelectItem>
                        <SelectItem value="responded">Responded</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Date</span>
                    <span className="text-sm text-slate-900">
                      {selectedMention.mention_date 
                        ? format(new Date(selectedMention.mention_date), 'PPp')
                        : format(new Date(selectedMention.created_date), 'PPp')
                      }
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  {selectedMention.source_url && (
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => window.open(selectedMention.source_url, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Original
                    </Button>
                  )}
                  <Button 
                    variant={selectedMention.is_flagged ? "destructive" : "outline"}
                    className="flex-1"
                    onClick={() => handleFlag(selectedMention)}
                  >
                    <Flag className="w-4 h-4 mr-2" />
                    {selectedMention.is_flagged ? 'Unflag' : 'Flag'}
                  </Button>
                </div>

                {/* Create Task */}
                <Button 
                  onClick={() => setShowTaskDialog(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <ListTodo className="w-4 h-4 mr-2" />
                  Create Task from Mention
                </Button>

                {/* AI Response Suggestions */}
                <ResponseSuggestion 
                  content={selectedMention.content}
                  sentiment={selectedMention.sentiment}
                  context={`Platform: ${selectedMention.source}, Author: ${selectedMention.author}`}
                  type="mention"
                />

                {/* Team Activity */}
                <TeamActivityFeed 
                  relatedEntity="Mention"
                  relatedId={selectedMention.id}
                  relatedTitle={selectedMention.content.slice(0, 50) + '...'}
                  compact
                />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Keyword Dialog */}
      <Dialog open={showKeywordDialog} onOpenChange={setShowKeywordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Tracking Keyword</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Keyword(s)</Label>
              <Input
                value={newKeyword.keyword}
                onChange={(e) => setNewKeyword({ ...newKeyword, keyword: e.target.value })}
                placeholder="Enter keywords separated by comma..."
              />
              <p className="text-xs text-slate-500">
                Tip: Use comma to add multiple keywords (e.g., "brand1, brand2, #hashtag")
              </p>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select 
                value={newKeyword.type} 
                onValueChange={(v) => setNewKeyword({ ...newKeyword, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="brand">Brand</SelectItem>
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="competitor">Competitor</SelectItem>
                  <SelectItem value="topic">Topic</SelectItem>
                  <SelectItem value="hashtag">Hashtag</SelectItem>
                  <SelectItem value="person">Person</SelectItem>
                  <SelectItem value="crisis">Crisis</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select 
                value={newKeyword.priority} 
                onValueChange={(v) => setNewKeyword({ ...newKeyword, priority: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowKeywordDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => createKeywordMutation.mutate(newKeyword)}
              disabled={!newKeyword.keyword}
            >
              Add Keyword
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Search Dialog */}
      <Dialog open={showManualSearchDialog} onOpenChange={(open) => {
        setShowManualSearchDialog(open);
        if (!open) {
          setSearchResults(null);
          setManualSearch({ query: '', platform: 'all', timeframe: '7d' });
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manual Search - Eksplorasi Topik Aktif</DialogTitle>
            <p className="text-sm text-slate-500">
              Cari informasi terkait kejadian, tokoh, atau isu tertentu secara real-time
            </p>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {!searchResults ? (
              <>
                <div className="space-y-2">
                  <Label>Apa yang ingin Anda cari?</Label>
                  <Textarea
                    value={manualSearch.query}
                    onChange={(e) => setManualSearch({ ...manualSearch, query: e.target.value })}
                    placeholder="Contoh: 'Pemilu 2024', 'Kebakaran hutan Kalimantan', 'Jokowi', 'ChatGPT di Indonesia', dll..."
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Platform</Label>
                    <Select 
                      value={manualSearch.platform} 
                      onValueChange={(v) => setManualSearch({ ...manualSearch, platform: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Platform</SelectItem>
                        <SelectItem value="twitter">Twitter/X</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="tiktok">TikTok</SelectItem>
                        <SelectItem value="news">Media Berita</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Timeframe</Label>
                    <Select 
                      value={manualSearch.timeframe} 
                      onValueChange={(v) => setManualSearch({ ...manualSearch, timeframe: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="24h">24 Jam Terakhir</SelectItem>
                        <SelectItem value="7d">7 Hari Terakhir</SelectItem>
                        <SelectItem value="30d">30 Hari Terakhir</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-6">
                {/* Summary */}
                <Card className="p-4 bg-blue-50 border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2">📊 Ringkasan</h4>
                  <p className="text-sm text-blue-800">{searchResults.summary}</p>
                </Card>

                {/* Sentiment */}
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">💭 Sentimen Umum</h4>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <StatusBadge status={searchResults.sentiment_overview?.overall || 'neutral'} />
                    <p className="text-sm text-slate-600">{searchResults.sentiment_overview?.explanation}</p>
                  </div>
                </div>

                {/* Key Findings */}
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">🔍 Temuan Penting</h4>
                  <ul className="space-y-2">
                    {searchResults.key_findings?.map((finding, idx) => (
                      <li key={idx} className="flex gap-2 text-sm text-slate-700">
                        <span className="text-blue-600 font-semibold">{idx + 1}.</span>
                        <span>{finding}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Trending Topics */}
                {searchResults.trending_topics?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">🔥 Trending Topics</h4>
                    <div className="flex flex-wrap gap-2">
                      {searchResults.trending_topics.map((topic, idx) => (
                        <Badge key={idx} variant="outline" className="bg-white">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notable Mentions */}
                {searchResults.notable_mentions?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">📢 Mention Penting</h4>
                    <div className="space-y-3">
                      {searchResults.notable_mentions.map((mention, idx) => (
                        <Card key={idx} className="p-3 bg-white border-slate-200">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-start gap-2">
                              <Badge variant="outline" className="text-xs">{mention.source}</Badge>
                              <Badge className="text-xs bg-blue-100 text-blue-700">{mention.impact}</Badge>
                            </div>
                            {mention.source_url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2"
                                onClick={() => window.open(mention.source_url, '_blank')}
                              >
                                <ExternalLink className="w-3 h-3 mr-1" />
                                <span className="text-xs">View</span>
                              </Button>
                            )}
                          </div>
                          <p className="text-sm text-slate-700">{mention.content}</p>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {searchResults.recommendations?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">💡 Rekomendasi</h4>
                    <ul className="space-y-2">
                      {searchResults.recommendations.map((rec, idx) => (
                        <li key={idx} className="flex gap-2 text-sm text-slate-700">
                          <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Suggested Keywords */}
                {searchResults.suggested_keywords?.length > 0 && (
                  <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-5 h-5 text-blue-600" />
                      <h4 className="font-semibold text-blue-900">Keyword Monitoring yang Disarankan</h4>
                    </div>
                    <p className="text-sm text-blue-700 mb-3">
                      Tambahkan keyword ini untuk monitoring aktif berkelanjutan
                    </p>
                    <div className="space-y-2">
                      {searchResults.suggested_keywords.map((kw, idx) => (
                        <div key={idx} className="flex items-start justify-between gap-3 p-3 bg-white rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-slate-900">{kw.keyword}</span>
                              <Badge variant="outline" className={cn(
                                "text-xs",
                                kw.priority === 'high' && "bg-red-100 text-red-700 border-red-200",
                                kw.priority === 'medium' && "bg-amber-100 text-amber-700 border-amber-200",
                                kw.priority === 'low' && "bg-slate-100 text-slate-700 border-slate-200"
                              )}>
                                {kw.priority} priority
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-600">{kw.reason}</p>
                          </div>
                          <Button 
                            size="sm"
                            onClick={() => addSuggestedKeyword(kw)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add
                          </Button>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={saveMentionsFromSearch}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Simpan {searchResults.notable_mentions?.length || 0} Mentions
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            {!searchResults ? (
              <>
                <Button variant="outline" onClick={() => setShowManualSearchDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleManualSearch}
                  disabled={!manualSearch.query || isSearching}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSearching ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Search
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setSearchResults(null);
                    setManualSearch({ query: '', platform: 'all', timeframe: '7d' });
                  }}
                >
                  New Search
                </Button>
                <Button onClick={() => setShowManualSearchDialog(false)}>
                  Close
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Task Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Task from Mention</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Task Title *</Label>
              <Input
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="Respond to mention..."
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="Task details..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select 
                  value={newTask.type} 
                  onValueChange={(v) => setNewTask({ ...newTask, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="response">Response</SelectItem>
                    <SelectItem value="content">Content</SelectItem>
                    <SelectItem value="outreach">Outreach</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select 
                  value={newTask.priority} 
                  onValueChange={(v) => setNewTask({ ...newTask, priority: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Assign To</Label>
                <Input
                  type="email"
                  value={newTask.assigned_to}
                  onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateTask}
              disabled={!newTask.title}
            >
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}