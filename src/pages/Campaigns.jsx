import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import EmptyState from '@/components/common/EmptyState';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
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
import {
  Megaphone, Calendar, Target, DollarSign, Users,
  TrendingUp, Eye, MessageCircle, Plus, Hash
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { cn } from "@/lib/utils";

const typeLabels = {
  awareness: "Brand Awareness",
  reputation: "Reputation Building",
  crisis_management: "Crisis Management",
  product_launch: "Product Launch",
  event: "Event Promotion",
  ongoing: "Ongoing",
  other: "Other",
};

const statusColors = {
  planning: "bg-slate-100 text-slate-700",
  active: "bg-emerald-100 text-emerald-700",
  paused: "bg-amber-100 text-amber-700",
  completed: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function Campaigns() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [newHashtag, setNewHashtag] = useState('');
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: '',
    objective: '',
    type: 'awareness',
    status: 'planning',
    start_date: '',
    end_date: '',
    budget: 0,
    target_audience: '',
    key_messages: [],
    keywords_to_track: [],
    hashtags: [],
    kpis: {
      target_reach: 0,
      target_engagement: 0,
      target_mentions: 0
    }
  });

  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => base44.entities.Campaign.list('-created_date'),
  });

  const createCampaignMutation = useMutation({
    mutationFn: (data) => base44.entities.Campaign.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['campaigns']);
      setShowNewCampaign(false);
      resetForm();
    },
  });

  const updateCampaignMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Campaign.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['campaigns']),
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: (id) => base44.entities.Campaign.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['campaigns']);
      setSelectedCampaign(null);
    },
  });

  const resetForm = () => {
    setNewCampaign({
      name: '',
      description: '',
      objective: '',
      type: 'awareness',
      status: 'planning',
      start_date: '',
      end_date: '',
      budget: 0,
      target_audience: '',
      key_messages: [],
      keywords_to_track: [],
      hashtags: [],
      kpis: {
        target_reach: 0,
        target_engagement: 0,
        target_mentions: 0
      }
    });
  };

  // Filter campaigns
  const filteredCampaigns = campaigns.filter(c => {
    if (search && !c.name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    return true;
  });

  const handleStatusChange = (status) => {
    if (selectedCampaign) {
      updateCampaignMutation.mutate({
        id: selectedCampaign.id,
        data: { status }
      });
      setSelectedCampaign({ ...selectedCampaign, status });
    }
  };

  const addKeyword = () => {
    if (newKeyword && !newCampaign.keywords_to_track.includes(newKeyword)) {
      setNewCampaign({ 
        ...newCampaign, 
        keywords_to_track: [...newCampaign.keywords_to_track, newKeyword] 
      });
      setNewKeyword('');
    }
  };

  const addHashtag = () => {
    const tag = newHashtag.startsWith('#') ? newHashtag : `#${newHashtag}`;
    if (tag && !newCampaign.hashtags.includes(tag)) {
      setNewCampaign({ 
        ...newCampaign, 
        hashtags: [...newCampaign.hashtags, tag] 
      });
      setNewHashtag('');
    }
  };

  // Stats
  const activeCampaigns = campaigns.filter(c => c.status === 'active');
  const totalBudget = campaigns.reduce((sum, c) => sum + (c.budget || 0), 0);
  const totalSpent = campaigns.reduce((sum, c) => sum + (c.spent || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaigns"
        subtitle="Manage PR campaigns and track performance"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search campaigns..."
        actionLabel="New Campaign"
        actionIcon={Megaphone}
        onAction={() => setShowNewCampaign(true)}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase">Active</p>
              <p className="text-2xl font-bold text-slate-900">{activeCampaigns.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-white border-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Megaphone className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase">Total</p>
              <p className="text-2xl font-bold text-slate-900">{campaigns.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-white border-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100">
              <DollarSign className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase">Total Budget</p>
              <p className="text-2xl font-bold text-slate-900">${totalBudget.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-white border-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100">
              <Target className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase">Spent</p>
              <p className="text-2xl font-bold text-slate-900">${totalSpent.toLocaleString()}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-white">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="planning">Planning</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Campaigns Grid */}
      {filteredCampaigns.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No campaigns found"
          description="Create your first PR campaign"
          actionLabel="New Campaign"
          onAction={() => setShowNewCampaign(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCampaigns.map(campaign => {
            const daysLeft = campaign.end_date 
              ? differenceInDays(new Date(campaign.end_date), new Date())
              : null;
            const budgetProgress = campaign.budget > 0 
              ? ((campaign.spent || 0) / campaign.budget) * 100 
              : 0;

            return (
              <Card 
                key={campaign.id}
                className="p-5 bg-white border-0 shadow-sm hover:shadow-md transition-all cursor-pointer"
                onClick={() => setSelectedCampaign(campaign)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">{campaign.name}</h3>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {typeLabels[campaign.type]}
                    </Badge>
                  </div>
                  <Badge className={cn("text-xs", statusColors[campaign.status])}>
                    {campaign.status?.toUpperCase()}
                  </Badge>
                </div>

                {campaign.description && (
                  <p className="text-sm text-slate-600 line-clamp-2 mb-4">{campaign.description}</p>
                )}

                {campaign.budget > 0 && (
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Budget Used</span>
                      <span>${campaign.spent?.toLocaleString() || 0} / ${campaign.budget.toLocaleString()}</span>
                    </div>
                    <Progress value={budgetProgress} className="h-1.5" />
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {campaign.start_date 
                      ? format(new Date(campaign.start_date), 'MMM d') 
                      : 'Not set'
                    }
                    {campaign.end_date && ` - ${format(new Date(campaign.end_date), 'MMM d')}`}
                  </div>
                  {daysLeft !== null && daysLeft >= 0 && campaign.status === 'active' && (
                    <span className={cn(
                      "font-medium",
                      daysLeft <= 7 ? "text-red-500" : "text-slate-500"
                    )}>
                      {daysLeft} days left
                    </span>
                  )}
                </div>

                {campaign.hashtags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t">
                    {campaign.hashtags.slice(0, 3).map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs text-blue-600">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Campaign Detail Sheet */}
      <Sheet open={!!selectedCampaign} onOpenChange={() => setSelectedCampaign(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedCampaign && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedCampaign.name}</SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Status */}
                <div className="flex items-center justify-between">
                  <Badge className={cn("text-xs", statusColors[selectedCampaign.status])}>
                    {selectedCampaign.status?.toUpperCase()}
                  </Badge>
                  <Select value={selectedCampaign.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-32 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Overview */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500">Type</p>
                    <p className="font-medium text-slate-900">{typeLabels[selectedCampaign.type]}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500">Duration</p>
                    <p className="font-medium text-slate-900">
                      {selectedCampaign.start_date && selectedCampaign.end_date
                        ? `${differenceInDays(new Date(selectedCampaign.end_date), new Date(selectedCampaign.start_date))} days`
                        : 'Not set'
                      }
                    </p>
                  </div>
                </div>

                {/* Budget */}
                {selectedCampaign.budget > 0 && (
                  <div>
                    <Label className="text-xs text-slate-500">Budget</Label>
                    <div className="mt-2 p-4 bg-slate-50 rounded-lg">
                      <div className="flex justify-between mb-2">
                        <span className="font-medium">${selectedCampaign.spent?.toLocaleString() || 0}</span>
                        <span className="text-slate-500">of ${selectedCampaign.budget.toLocaleString()}</span>
                      </div>
                      <Progress 
                        value={((selectedCampaign.spent || 0) / selectedCampaign.budget) * 100} 
                        className="h-2" 
                      />
                    </div>
                  </div>
                )}

                {/* Description */}
                {selectedCampaign.description && (
                  <div>
                    <Label className="text-xs text-slate-500">Description</Label>
                    <p className="mt-1 text-sm text-slate-700">{selectedCampaign.description}</p>
                  </div>
                )}

                {/* Objective */}
                {selectedCampaign.objective && (
                  <div>
                    <Label className="text-xs text-slate-500">Objective</Label>
                    <p className="mt-1 text-sm text-slate-700">{selectedCampaign.objective}</p>
                  </div>
                )}

                {/* Keywords */}
                {selectedCampaign.keywords_to_track?.length > 0 && (
                  <div>
                    <Label className="text-xs text-slate-500">Tracking Keywords</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedCampaign.keywords_to_track.map(kw => (
                        <Badge key={kw} variant="outline">{kw}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hashtags */}
                {selectedCampaign.hashtags?.length > 0 && (
                  <div>
                    <Label className="text-xs text-slate-500">Hashtags</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedCampaign.hashtags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-blue-600">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* KPIs */}
                {selectedCampaign.kpis && (
                  <div>
                    <Label className="text-xs text-slate-500">Target KPIs</Label>
                    <div className="grid grid-cols-3 gap-3 mt-2">
                      <div className="p-3 bg-slate-50 rounded-lg text-center">
                        <Eye className="w-4 h-4 mx-auto text-purple-500 mb-1" />
                        <p className="text-lg font-bold">{(selectedCampaign.kpis.target_reach / 1000000).toFixed(1)}M</p>
                        <p className="text-xs text-slate-500">Target Reach</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg text-center">
                        <MessageCircle className="w-4 h-4 mx-auto text-blue-500 mb-1" />
                        <p className="text-lg font-bold">{selectedCampaign.kpis.target_mentions?.toLocaleString()}</p>
                        <p className="text-xs text-slate-500">Target Mentions</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg text-center">
                        <TrendingUp className="w-4 h-4 mx-auto text-emerald-500 mb-1" />
                        <p className="text-lg font-bold">{selectedCampaign.kpis.target_engagement?.toLocaleString()}</p>
                        <p className="text-xs text-slate-500">Target Engagement</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <Button 
                    variant="destructive" 
                    className="flex-1"
                    onClick={() => deleteCampaignMutation.mutate(selectedCampaign.id)}
                  >
                    Delete Campaign
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* New Campaign Dialog */}
      <Dialog open={showNewCampaign} onOpenChange={setShowNewCampaign}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Create New Campaign</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Campaign Name *</Label>
                <Input
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  placeholder="Campaign name"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select 
                  value={newCampaign.type} 
                  onValueChange={(v) => setNewCampaign({ ...newCampaign, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newCampaign.description}
                onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                placeholder="Campaign description"
              />
            </div>

            <div className="space-y-2">
              <Label>Objective</Label>
              <Textarea
                value={newCampaign.objective}
                onChange={(e) => setNewCampaign({ ...newCampaign, objective: e.target.value })}
                placeholder="What do you want to achieve?"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={newCampaign.start_date}
                  onChange={(e) => setNewCampaign({ ...newCampaign, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={newCampaign.end_date}
                  onChange={(e) => setNewCampaign({ ...newCampaign, end_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Budget ($)</Label>
                <Input
                  type="number"
                  value={newCampaign.budget}
                  onChange={(e) => setNewCampaign({ ...newCampaign, budget: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Target Audience</Label>
              <Input
                value={newCampaign.target_audience}
                onChange={(e) => setNewCampaign({ ...newCampaign, target_audience: e.target.value })}
                placeholder="Who is this campaign targeting?"
              />
            </div>

            <div className="space-y-2">
              <Label>Keywords to Track</Label>
              <div className="flex gap-2">
                <Input
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="Add keyword"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                />
                <Button type="button" variant="outline" onClick={addKeyword}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {newCampaign.keywords_to_track.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {newCampaign.keywords_to_track.map(kw => (
                    <Badge key={kw} variant="outline" className="pr-1">
                      {kw}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-1"
                        onClick={() => setNewCampaign({
                          ...newCampaign,
                          keywords_to_track: newCampaign.keywords_to_track.filter(k => k !== kw)
                        })}
                      >
                        ×
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Hashtags</Label>
              <div className="flex gap-2">
                <Input
                  value={newHashtag}
                  onChange={(e) => setNewHashtag(e.target.value)}
                  placeholder="#hashtag"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addHashtag())}
                />
                <Button type="button" variant="outline" onClick={addHashtag}>
                  <Hash className="w-4 h-4" />
                </Button>
              </div>
              {newCampaign.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {newCampaign.hashtags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-blue-600 pr-1">
                      {tag}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-1"
                        onClick={() => setNewCampaign({
                          ...newCampaign,
                          hashtags: newCampaign.hashtags.filter(t => t !== tag)
                        })}
                      >
                        ×
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCampaign(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => createCampaignMutation.mutate(newCampaign)}
              disabled={!newCampaign.name}
            >
              Create Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}