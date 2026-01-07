import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import EmptyState from '@/components/common/EmptyState';
import LiveIndicator from '@/components/monitoring/LiveIndicator';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  UserCircle, Instagram, Youtube, Twitter, Globe,
  Users, Heart, Eye, Star, TrendingUp, Plus, DollarSign
} from 'lucide-react';
import { cn } from "@/lib/utils";

const platformConfig = {
  instagram: { icon: Instagram, color: "text-pink-500", bg: "bg-pink-50" },
  youtube: { icon: Youtube, color: "text-red-500", bg: "bg-red-50" },
  twitter: { icon: Twitter, color: "text-sky-500", bg: "bg-sky-50" },
  tiktok: { icon: Globe, color: "text-slate-900", bg: "bg-slate-50" },
  "multi-platform": { icon: Globe, color: "text-purple-500", bg: "bg-purple-50" },
};

const tierConfig = {
  nano: { label: "Nano (1K-10K)", color: "bg-slate-100 text-slate-700" },
  micro: { label: "Micro (10K-100K)", color: "bg-blue-100 text-blue-700" },
  macro: { label: "Macro (100K-1M)", color: "bg-purple-100 text-purple-700" },
  mega: { label: "Mega (1M+)", color: "bg-amber-100 text-amber-700" },
  celebrity: { label: "Celebrity", color: "bg-red-100 text-red-700" },
};

const formatFollowers = (num) => {
  if (!num) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
  return num.toString();
};

export default function Influencers() {
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [selectedInfluencer, setSelectedInfluencer] = useState(null);
  const [showNewInfluencer, setShowNewInfluencer] = useState(false);
  const [newInfluencer, setNewInfluencer] = useState({
    name: '',
    username: '',
    email: '',
    platform: 'instagram',
    category: [],
    followers: 0,
    engagement_rate: 0,
    location: '',
    tier: 'micro',
    estimated_cost: 0,
    status: 'potential',
    notes: ''
  });
  const [newCategory, setNewCategory] = useState('');

  const queryClient = useQueryClient();

  const { data: influencers = [], isLoading } = useQuery({
    queryKey: ['influencers'],
    queryFn: () => base44.entities.Influencer.list('-followers'),
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  const createInfluencerMutation = useMutation({
    mutationFn: (data) => base44.entities.Influencer.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['influencers']);
      setShowNewInfluencer(false);
      setNewInfluencer({
        name: '',
        username: '',
        email: '',
        platform: 'instagram',
        category: [],
        followers: 0,
        engagement_rate: 0,
        location: '',
        tier: 'micro',
        estimated_cost: 0,
        status: 'potential',
        notes: ''
      });
    },
  });

  const updateInfluencerMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Influencer.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['influencers']),
  });

  const deleteInfluencerMutation = useMutation({
    mutationFn: (id) => base44.entities.Influencer.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['influencers']);
      setSelectedInfluencer(null);
    },
  });

  // Filter influencers
  const filteredInfluencers = influencers.filter(inf => {
    if (search && !inf.name?.toLowerCase().includes(search.toLowerCase()) && 
        !inf.username?.toLowerCase().includes(search.toLowerCase())) return false;
    if (platformFilter !== 'all' && inf.platform !== platformFilter) return false;
    if (tierFilter !== 'all' && inf.tier !== tierFilter) return false;
    return true;
  });

  const addCategory = () => {
    if (newCategory && !newInfluencer.category.includes(newCategory)) {
      setNewInfluencer({ ...newInfluencer, category: [...newInfluencer.category, newCategory] });
      setNewCategory('');
    }
  };

  const handleStatusChange = (status) => {
    if (selectedInfluencer) {
      updateInfluencerMutation.mutate({
        id: selectedInfluencer.id,
        data: { status }
      });
      setSelectedInfluencer({ ...selectedInfluencer, status });
    }
  };

  // Stats
  const totalFollowers = influencers.reduce((sum, inf) => sum + (inf.followers || 0), 0);
  const avgEngagement = influencers.length > 0 
    ? influencers.reduce((sum, inf) => sum + (inf.engagement_rate || 0), 0) / influencers.length 
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            Influencer Management
            <LiveIndicator />
          </div>
        }
        subtitle="Real-time influencer database (auto-updates every 30s)"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search influencers..."
        actionLabel="Add Influencer"
        onAction={() => setShowNewInfluencer(true)}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <UserCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase">Total Influencers</p>
              <p className="text-2xl font-bold text-slate-900">{influencers.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-white border-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase">Total Reach</p>
              <p className="text-2xl font-bold text-slate-900">{formatFollowers(totalFollowers)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-white border-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100">
              <Heart className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase">Avg Engagement</p>
              <p className="text-2xl font-bold text-slate-900">{avgEngagement.toFixed(1)}%</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-white border-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase">Active Collabs</p>
              <p className="text-2xl font-bold text-slate-900">
                {influencers.filter(inf => inf.status === 'active').length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-40 bg-white">
            <SelectValue placeholder="All Platforms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="youtube">YouTube</SelectItem>
            <SelectItem value="twitter">Twitter</SelectItem>
            <SelectItem value="tiktok">TikTok</SelectItem>
            <SelectItem value="multi-platform">Multi-Platform</SelectItem>
          </SelectContent>
        </Select>

        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger className="w-40 bg-white">
            <SelectValue placeholder="All Tiers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            {Object.entries(tierConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Influencer Grid */}
      {filteredInfluencers.length === 0 ? (
        <EmptyState
          icon={UserCircle}
          title="No influencers found"
          description="Add influencers to start managing partnerships"
          actionLabel="Add Influencer"
          onAction={() => setShowNewInfluencer(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInfluencers.map(influencer => {
            const platform = platformConfig[influencer.platform] || platformConfig['multi-platform'];
            const PlatformIcon = platform.icon;
            const tier = tierConfig[influencer.tier] || tierConfig.micro;

            return (
              <Card 
                key={influencer.id}
                className="p-4 bg-white border-0 shadow-sm hover:shadow-md transition-all cursor-pointer"
                onClick={() => setSelectedInfluencer(influencer)}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={influencer.photo_url} />
                    <AvatarFallback className={cn(platform.bg, platform.color)}>
                      <PlatformIcon className="w-6 h-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-slate-900 truncate">{influencer.name}</h3>
                      <Badge className={cn("text-xs shrink-0", tier.color)}>
                        {influencer.tier?.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500">@{influencer.username}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <PlatformIcon className={cn("w-3.5 h-3.5", platform.color)} />
                      <span className="text-xs text-slate-500 capitalize">{influencer.platform}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t">
                  <div className="text-center">
                    <p className="text-lg font-bold text-slate-900">{formatFollowers(influencer.followers)}</p>
                    <p className="text-xs text-slate-500">Followers</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-slate-900">{influencer.engagement_rate || 0}%</p>
                    <p className="text-xs text-slate-500">Engagement</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-slate-900">
                      {influencer.rating ? '★' + influencer.rating : '-'}
                    </p>
                    <p className="text-xs text-slate-500">Rating</p>
                  </div>
                </div>

                {influencer.category?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {influencer.category.slice(0, 3).map(cat => (
                      <Badge key={cat} variant="outline" className="text-xs">
                        {cat}
                      </Badge>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Influencer Detail Sheet */}
      <Sheet open={!!selectedInfluencer} onOpenChange={() => setSelectedInfluencer(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedInfluencer && (
            <>
              <SheetHeader>
                <SheetTitle>Influencer Profile</SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Profile Header */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={selectedInfluencer.photo_url} />
                    <AvatarFallback className="bg-purple-100 text-purple-600 text-2xl">
                      {selectedInfluencer.name?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{selectedInfluencer.name}</h3>
                    <p className="text-slate-500">@{selectedInfluencer.username}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <StatusBadge status={selectedInfluencer.status} />
                      <Badge className={cn("text-xs", tierConfig[selectedInfluencer.tier]?.color)}>
                        {selectedInfluencer.tier?.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-lg text-center">
                    <Users className="w-5 h-5 mx-auto text-purple-500 mb-1" />
                    <p className="text-2xl font-bold text-slate-900">
                      {formatFollowers(selectedInfluencer.followers)}
                    </p>
                    <p className="text-xs text-slate-500">Followers</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg text-center">
                    <Heart className="w-5 h-5 mx-auto text-red-500 mb-1" />
                    <p className="text-2xl font-bold text-slate-900">
                      {selectedInfluencer.engagement_rate || 0}%
                    </p>
                    <p className="text-xs text-slate-500">Engagement Rate</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg text-center">
                    <Eye className="w-5 h-5 mx-auto text-blue-500 mb-1" />
                    <p className="text-2xl font-bold text-slate-900">
                      {formatFollowers(selectedInfluencer.avg_views || 0)}
                    </p>
                    <p className="text-xs text-slate-500">Avg Views</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg text-center">
                    <DollarSign className="w-5 h-5 mx-auto text-emerald-500 mb-1" />
                    <p className="text-2xl font-bold text-slate-900">
                      {selectedInfluencer.estimated_cost 
                        ? `$${selectedInfluencer.estimated_cost.toLocaleString()}`
                        : '-'
                      }
                    </p>
                    <p className="text-xs text-slate-500">Est. Cost/Post</p>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <Label className="text-xs text-slate-500">Collaboration Status</Label>
                  <Select value={selectedInfluencer.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="potential">Potential</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="negotiating">Negotiating</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="blacklisted">Blacklisted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Categories */}
                {selectedInfluencer.category?.length > 0 && (
                  <div>
                    <Label className="text-xs text-slate-500">Content Categories</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedInfluencer.category.map(cat => (
                        <Badge key={cat} variant="outline">{cat}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contact */}
                <div className="space-y-3">
                  {selectedInfluencer.email && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <span className="text-sm text-slate-700">{selectedInfluencer.email}</span>
                    </div>
                  )}
                  {selectedInfluencer.location && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <span className="text-sm text-slate-700">📍 {selectedInfluencer.location}</span>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {selectedInfluencer.notes && (
                  <div>
                    <Label className="text-xs text-slate-500">Notes</Label>
                    <p className="mt-1 text-sm text-slate-700 p-3 bg-slate-50 rounded-lg">
                      {selectedInfluencer.notes}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <Button 
                    variant="destructive" 
                    className="flex-1"
                    onClick={() => deleteInfluencerMutation.mutate(selectedInfluencer.id)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Influencer Dialog */}
      <Dialog open={showNewInfluencer} onOpenChange={setShowNewInfluencer}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Influencer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={newInfluencer.name}
                  onChange={(e) => setNewInfluencer({ ...newInfluencer, name: e.target.value })}
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-2">
                <Label>Username *</Label>
                <Input
                  value={newInfluencer.username}
                  onChange={(e) => setNewInfluencer({ ...newInfluencer, username: e.target.value })}
                  placeholder="@username"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select 
                  value={newInfluencer.platform} 
                  onValueChange={(v) => setNewInfluencer({ ...newInfluencer, platform: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="twitter">Twitter</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="multi-platform">Multi-Platform</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tier</Label>
                <Select 
                  value={newInfluencer.tier} 
                  onValueChange={(v) => setNewInfluencer({ ...newInfluencer, tier: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(tierConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Followers</Label>
                <Input
                  type="number"
                  value={newInfluencer.followers}
                  onChange={(e) => setNewInfluencer({ ...newInfluencer, followers: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Engagement Rate (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={newInfluencer.engagement_rate}
                  onChange={(e) => setNewInfluencer({ ...newInfluencer, engagement_rate: parseFloat(e.target.value) || 0 })}
                  placeholder="0.0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newInfluencer.email}
                  onChange={(e) => setNewInfluencer({ ...newInfluencer, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Est. Cost per Post ($)</Label>
                <Input
                  type="number"
                  value={newInfluencer.estimated_cost}
                  onChange={(e) => setNewInfluencer({ ...newInfluencer, estimated_cost: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                value={newInfluencer.location}
                onChange={(e) => setNewInfluencer({ ...newInfluencer, location: e.target.value })}
                placeholder="City, Country"
              />
            </div>
            <div className="space-y-2">
              <Label>Categories</Label>
              <div className="flex gap-2">
                <Input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="e.g., Fashion, Tech"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())}
                />
                <Button type="button" variant="outline" onClick={addCategory}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {newInfluencer.category.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {newInfluencer.category.map(cat => (
                    <Badge key={cat} variant="outline" className="pr-1">
                      {cat}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-1"
                        onClick={() => setNewInfluencer({ 
                          ...newInfluencer, 
                          category: newInfluencer.category.filter(c => c !== cat) 
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
              <Label>Notes</Label>
              <Textarea
                value={newInfluencer.notes}
                onChange={(e) => setNewInfluencer({ ...newInfluencer, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewInfluencer(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => createInfluencerMutation.mutate(newInfluencer)}
              disabled={!newInfluencer.name || !newInfluencer.username}
            >
              Add Influencer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}