import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import EmptyState from '@/components/common/EmptyState';
import ApprovalWorkflow from '@/components/collaboration/ApprovalWorkflow';
import TeamActivityFeed from '@/components/collaboration/TeamActivityFeed';
import JournalistMatcher from '@/components/ai/JournalistMatcher';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  FileText, Calendar, User, Send, Eye, Edit, Trash2,
  MoreVertical, Clock, CheckCircle, Sparkles, Copy, Download
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import ReactQuill from 'react-quill';

const categoryLabels = {
  announcement: "Announcement",
  event: "Event",
  crisis: "Crisis Response",
  product: "Product",
  partnership: "Partnership",
  achievement: "Achievement",
  statement: "Statement",
  other: "Other",
};

export default function PressRelease() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRelease, setSelectedRelease] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
    } catch (e) {}
  };
  const [editingRelease, setEditingRelease] = useState({
    title: '',
    subtitle: '',
    content: '',
    summary: '',
    category: 'announcement',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    status: 'draft'
  });

  const queryClient = useQueryClient();

  const { data: releases = [], isLoading } = useQuery({
    queryKey: ['pressReleases'],
    queryFn: () => base44.entities.PressRelease.list('-created_date'),
  });

  const { data: journalists = [] } = useQuery({
    queryKey: ['journalists'],
    queryFn: () => base44.entities.Journalist.list(),
  });

  const createOutreachMutation = useMutation({
    mutationFn: (data) => base44.entities.Outreach.bulkCreate(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['outreaches']);
    },
  });

  const createReleaseMutation = useMutation({
    mutationFn: (data) => base44.entities.PressRelease.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['pressReleases']);
      setShowEditor(false);
      resetEditor();
    },
  });

  const updateReleaseMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PressRelease.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['pressReleases']);
      setShowEditor(false);
      resetEditor();
    },
  });

  const deleteReleaseMutation = useMutation({
    mutationFn: (id) => base44.entities.PressRelease.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['pressReleases']);
      setSelectedRelease(null);
    },
  });

  const resetEditor = () => {
    setEditingRelease({
      title: '',
      subtitle: '',
      content: '',
      summary: '',
      category: 'announcement',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      status: 'draft'
    });
  };

  const handleEdit = (release) => {
    setEditingRelease(release);
    setShowEditor(true);
    setSelectedRelease(null);
  };

  const handleSave = () => {
    const releaseData = { ...editingRelease };
    if (!editingRelease.id && user) {
      releaseData.author = user.email;
    }
    if (editingRelease.id) {
      updateReleaseMutation.mutate({ id: editingRelease.id, data: releaseData });
    } else {
      createReleaseMutation.mutate(releaseData);
    }
  };

  const handleStatusChange = (id, status) => {
    updateReleaseMutation.mutate({ id, data: { status } });
  };

  const generateContent = async () => {
    if (!editingRelease.title) return;
    setIsGenerating(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a professional PR writer. Generate a press release based on:

Title: ${editingRelease.title}
Subtitle: ${editingRelease.subtitle || 'N/A'}
Category: ${categoryLabels[editingRelease.category]}

Write a professional press release in HTML format with proper paragraphs. Include:
- Strong opening statement
- Key information and quotes
- Background information
- Call to action or next steps

Return JSON with the content.`,
        response_json_schema: {
          type: "object",
          properties: {
            content: { type: "string" },
            summary: { type: "string" }
          }
        }
      });

      setEditingRelease({ 
        ...editingRelease, 
        content: result.content, 
        summary: result.summary 
      });
    } catch (e) {
      console.error('Failed to generate content:', e);
    }
    setIsGenerating(false);
  };

  const handleJournalistSelection = async (selectedMatches) => {
    if (!selectedRelease) return;
    
    // Create outreach records for selected journalists
    const outreaches = selectedMatches.map(match => ({
      journalist_id: match.journalist.id,
      journalist_name: match.journalist.name,
      journalist_email: match.journalist.email,
      press_release_id: selectedRelease.id,
      press_release_title: selectedRelease.title,
      subject: `Press Release: ${selectedRelease.title}`,
      pitch_angle: match.pitch_angle,
      ai_match_score: match.score,
      ai_generated: true,
      status: 'draft'
    }));

    await createOutreachMutation.mutateAsync(outreaches);
    
    // Update press release distribution list
    const emailList = selectedMatches.map(m => m.journalist.email);
    await updateReleaseMutation.mutateAsync({
      id: selectedRelease.id,
      data: { 
        distribution_list: [...(selectedRelease.distribution_list || []), ...emailList]
      }
    });
  };

  // Filter releases
  const filteredReleases = releases.filter(r => {
    if (search && !r.title?.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    return true;
  });

  // Stats
  const stats = {
    total: releases.length,
    draft: releases.filter(r => r.status === 'draft').length,
    published: releases.filter(r => r.status === 'published').length,
    pending: releases.filter(r => r.status === 'pending_review').length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Press Releases"
        subtitle="Create and manage press releases"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search releases..."
        actionLabel="New Release"
        actionIcon={FileText}
        onAction={() => {
          resetEditor();
          setShowEditor(true);
        }}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border-0 shadow-sm">
          <p className="text-xs text-slate-500 uppercase">Total</p>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </Card>
        <Card className="p-4 bg-white border-0 shadow-sm">
          <p className="text-xs text-slate-500 uppercase">Drafts</p>
          <p className="text-2xl font-bold text-slate-600">{stats.draft}</p>
        </Card>
        <Card className="p-4 bg-white border-0 shadow-sm">
          <p className="text-xs text-slate-500 uppercase">Pending Review</p>
          <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
        </Card>
        <Card className="p-4 bg-white border-0 shadow-sm">
          <p className="text-xs text-slate-500 uppercase">Published</p>
          <p className="text-2xl font-bold text-emerald-600">{stats.published}</p>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList className="bg-white border">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="draft">Drafts</TabsTrigger>
          <TabsTrigger value="pending_review">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="published">Published</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Releases List */}
      {filteredReleases.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No press releases found"
          description="Create your first press release to get started"
          actionLabel="Create Release"
          onAction={() => {
            resetEditor();
            setShowEditor(true);
          }}
        />
      ) : (
        <div className="space-y-3">
          {filteredReleases.map(release => (
            <Card 
              key={release.id}
              className="p-4 bg-white border-0 shadow-sm hover:shadow-md transition-all cursor-pointer"
              onClick={() => setSelectedRelease(release)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900 truncate">{release.title}</h3>
                    <StatusBadge status={release.status} />
                    <Badge variant="outline" className="text-xs">
                      {categoryLabels[release.category]}
                    </Badge>
                  </div>
                  {release.subtitle && (
                    <p className="text-sm text-slate-600 truncate">{release.subtitle}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(release.created_date), 'MMM d, yyyy')}
                    </span>
                    {release.author && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {release.author}
                      </span>
                    )}
                    {release.sent_count > 0 && (
                      <span className="flex items-center gap-1">
                        <Send className="w-3 h-3" />
                        Sent to {release.sent_count}
                      </span>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(release);
                    }}>
                      <Edit className="w-4 h-4 mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(release.content?.replace(/<[^>]*>/g, '') || '');
                    }}>
                      <Copy className="w-4 h-4 mr-2" /> Copy Text
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {release.status === 'draft' && (
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange(release.id, 'pending_review');
                      }}>
                        <Clock className="w-4 h-4 mr-2" /> Submit for Review
                      </DropdownMenuItem>
                    )}
                    {release.status === 'pending_review' && (
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange(release.id, 'approved');
                      }}>
                        <CheckCircle className="w-4 h-4 mr-2" /> Approve
                      </DropdownMenuItem>
                    )}
                    {release.status === 'approved' && (
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange(release.id, 'published');
                      }}>
                        <Send className="w-4 h-4 mr-2" /> Publish
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-red-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteReleaseMutation.mutate(release.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Release Detail Sheet */}
      <Sheet open={!!selectedRelease} onOpenChange={() => setSelectedRelease(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedRelease && (
            <>
              <SheetHeader>
                <div className="flex items-center justify-between">
                  <SheetTitle>Press Release</SheetTitle>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={selectedRelease.status} />
                    <Button variant="outline" size="sm" onClick={() => handleEdit(selectedRelease)}>
                      <Edit className="w-4 h-4 mr-1" /> Edit
                    </Button>
                  </div>
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{selectedRelease.title}</h2>
                  {selectedRelease.subtitle && (
                    <p className="text-slate-600 mt-1">{selectedRelease.subtitle}</p>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <Badge variant="outline">{categoryLabels[selectedRelease.category]}</Badge>
                  <span>{format(new Date(selectedRelease.created_date), 'MMMM d, yyyy')}</span>
                </div>

                {selectedRelease.summary && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-900">Summary</p>
                    <p className="text-sm text-blue-800 mt-1">{selectedRelease.summary}</p>
                  </div>
                )}

                <div 
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedRelease.content }}
                />

                {(selectedRelease.contact_name || selectedRelease.contact_email) && (
                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium text-slate-900">Media Contact</p>
                    <p className="text-sm text-slate-600">
                      {selectedRelease.contact_name}
                      {selectedRelease.contact_email && ` - ${selectedRelease.contact_email}`}
                      {selectedRelease.contact_phone && ` - ${selectedRelease.contact_phone}`}
                    </p>
                  </div>
                )}

                {/* Approval Workflow */}
                <ApprovalWorkflow
                  item={selectedRelease}
                  itemType="PressRelease"
                  onStatusChange={(status) => {
                    updateReleaseMutation.mutate({ id: selectedRelease.id, data: { status, approved_by: user?.email } });
                    setSelectedRelease({ ...selectedRelease, status, approved_by: user?.email });
                  }}
                  canApprove={user?.role === 'admin'}
                  user={user}
                />

                {/* AI Journalist Matcher */}
                {selectedRelease.status === 'approved' && (
                  <JournalistMatcher
                    pressRelease={selectedRelease}
                    journalists={journalists}
                    onSelect={handleJournalistSelection}
                  />
                )}

                {/* Team Activity */}
                <TeamActivityFeed 
                  relatedEntity="PressRelease"
                  relatedId={selectedRelease.id}
                  relatedTitle={selectedRelease.title}
                  compact
                />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingRelease.id ? 'Edit Press Release' : 'New Press Release'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={editingRelease.title}
                  onChange={(e) => setEditingRelease({ ...editingRelease, title: e.target.value })}
                  placeholder="Press release title"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select 
                  value={editingRelease.category} 
                  onValueChange={(v) => setEditingRelease({ ...editingRelease, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Subtitle</Label>
              <Input
                value={editingRelease.subtitle}
                onChange={(e) => setEditingRelease({ ...editingRelease, subtitle: e.target.value })}
                placeholder="Optional subtitle"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Content *</Label>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={generateContent}
                  disabled={isGenerating || !editingRelease.title}
                >
                  <Sparkles className={cn("w-4 h-4 mr-1", isGenerating && "animate-spin")} />
                  AI Generate
                </Button>
              </div>
              <ReactQuill
                value={editingRelease.content}
                onChange={(content) => setEditingRelease({ ...editingRelease, content })}
                className="h-64"
              />
            </div>

            <div className="pt-12 space-y-2">
              <Label>Summary</Label>
              <Textarea
                value={editingRelease.summary}
                onChange={(e) => setEditingRelease({ ...editingRelease, summary: e.target.value })}
                placeholder="Brief summary for distribution"
                className="h-20"
              />
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <Label>Contact Name</Label>
                <Input
                  value={editingRelease.contact_name}
                  onChange={(e) => setEditingRelease({ ...editingRelease, contact_name: e.target.value })}
                  placeholder="Media contact"
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Email</Label>
                <Input
                  type="email"
                  value={editingRelease.contact_email}
                  onChange={(e) => setEditingRelease({ ...editingRelease, contact_email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Phone</Label>
                <Input
                  value={editingRelease.contact_phone}
                  onChange={(e) => setEditingRelease({ ...editingRelease, contact_phone: e.target.value })}
                  placeholder="+62..."
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditor(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!editingRelease.title || !editingRelease.content}
            >
              {editingRelease.id ? 'Update' : 'Create'} Release
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}