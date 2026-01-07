import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import EmptyState from '@/components/common/EmptyState';
import PitchSuggestion from '@/components/ai/PitchSuggestion';
import OutreachAnalytics from '@/components/ai/OutreachAnalytics';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users, Mail, Phone, MapPin, Twitter, Linkedin, Instagram,
  Star, StarOff, MoreVertical, Trash2, Edit, Send, Plus,
  Building, Tag, Calendar, MessageCircle, ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from "@/lib/utils";

const relationshipColors = {
  new: "bg-slate-100 text-slate-700",
  contacted: "bg-blue-100 text-blue-700",
  warm: "bg-amber-100 text-amber-700",
  close: "bg-emerald-100 text-emerald-700",
  vip: "bg-purple-100 text-purple-700",
};

export default function MediaRelations() {
  const [search, setSearch] = useState('');
  const [beatFilter, setBeatFilter] = useState('all');
  const [relationshipFilter, setRelationshipFilter] = useState('all');
  const [selectedJournalist, setSelectedJournalist] = useState(null);
  const [showNewContact, setShowNewContact] = useState(false);
  const [showPitchDialog, setShowPitchDialog] = useState(false);
  const [selectedPressRelease, setSelectedPressRelease] = useState(null);
  const [newContact, setNewContact] = useState({
    name: '',
    email: '',
    phone: '',
    media_outlet: '',
    beat: [],
    location: '',
    relationship_status: 'new',
    notes: ''
  });
  const [newBeat, setNewBeat] = useState('');

  const queryClient = useQueryClient();

  const { data: journalists = [], isLoading } = useQuery({
    queryKey: ['journalists'],
    queryFn: () => base44.entities.Journalist.list('-created_date'),
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  const { data: pressReleases = [] } = useQuery({
    queryKey: ['pressReleases'],
    queryFn: () => base44.entities.PressRelease.filter({ status: 'approved' }),
  });

  const { data: outreaches = [] } = useQuery({
    queryKey: ['outreaches'],
    queryFn: () => base44.entities.Outreach.list('-created_date', 100),
  });

  const createJournalistMutation = useMutation({
    mutationFn: (data) => base44.entities.Journalist.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['journalists']);
      setShowNewContact(false);
      setNewContact({
        name: '',
        email: '',
        phone: '',
        media_outlet: '',
        beat: [],
        location: '',
        relationship_status: 'new',
        notes: ''
      });
    },
  });

  const updateJournalistMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Journalist.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['journalists']),
  });

  const deleteJournalistMutation = useMutation({
    mutationFn: (id) => base44.entities.Journalist.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['journalists']);
      setSelectedJournalist(null);
    },
  });

  const createOutreachMutation = useMutation({
    mutationFn: (data) => base44.entities.Outreach.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['outreaches']);
      setShowPitchDialog(false);
    },
  });

  // Get unique beats
  const allBeats = [...new Set(journalists.flatMap(j => j.beat || []))];

  // Filter journalists
  const filteredJournalists = journalists.filter(j => {
    if (search && !j.name?.toLowerCase().includes(search.toLowerCase()) && 
        !j.media_outlet?.toLowerCase().includes(search.toLowerCase())) return false;
    if (beatFilter !== 'all' && !j.beat?.includes(beatFilter)) return false;
    if (relationshipFilter !== 'all' && j.relationship_status !== relationshipFilter) return false;
    return true;
  });

  const handleToggleFavorite = (journalist) => {
    updateJournalistMutation.mutate({
      id: journalist.id,
      data: { is_favorite: !journalist.is_favorite }
    });
  };

  const addBeatToNew = () => {
    if (newBeat && !newContact.beat.includes(newBeat)) {
      setNewContact({ ...newContact, beat: [...newContact.beat, newBeat] });
      setNewBeat('');
    }
  };

  const removeBeatFromNew = (beat) => {
    setNewContact({ ...newContact, beat: newContact.beat.filter(b => b !== beat) });
  };

  const handleUsePitch = (pitch) => {
    if (!selectedJournalist || !selectedPressRelease) return;
    
    createOutreachMutation.mutate({
      journalist_id: selectedJournalist.id,
      journalist_name: selectedJournalist.name,
      journalist_email: selectedJournalist.email,
      press_release_id: selectedPressRelease.id,
      press_release_title: selectedPressRelease.title,
      subject: pitch.subject,
      message: pitch.body,
      pitch_angle: pitch.key_angle,
      ai_generated: true,
      status: 'draft'
    });
  };

  // Get outreach history for selected journalist
  const journalistOutreaches = selectedJournalist 
    ? outreaches.filter(o => o.journalist_id === selectedJournalist.id)
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            Media Relations
            <LiveIndicator />
          </div>
        }
        subtitle="Real-time journalist database (auto-updates every 30s)"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search contacts..."
        actionLabel="Add Contact"
        onAction={() => setShowNewContact(true)}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border-0 shadow-sm">
          <p className="text-xs text-slate-500 uppercase">Total Contacts</p>
          <p className="text-2xl font-bold text-slate-900">{journalists.length}</p>
        </Card>
        <Card className="p-4 bg-white border-0 shadow-sm">
          <p className="text-xs text-slate-500 uppercase">VIP Contacts</p>
          <p className="text-2xl font-bold text-purple-600">
            {journalists.filter(j => j.relationship_status === 'vip').length}
          </p>
        </Card>
        <Card className="p-4 bg-white border-0 shadow-sm">
          <p className="text-xs text-slate-500 uppercase">Favorites</p>
          <p className="text-2xl font-bold text-amber-600">
            {journalists.filter(j => j.is_favorite).length}
          </p>
        </Card>
        <Card className="p-4 bg-white border-0 shadow-sm">
          <p className="text-xs text-slate-500 uppercase">Media Outlets</p>
          <p className="text-2xl font-bold text-blue-600">
            {new Set(journalists.map(j => j.media_outlet)).size}
          </p>
        </Card>
      </div>

      {/* Outreach Analytics */}
      <OutreachAnalytics outreaches={outreaches} />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={beatFilter} onValueChange={setBeatFilter}>
          <SelectTrigger className="w-40 bg-white">
            <SelectValue placeholder="All Beats" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Beats</SelectItem>
            {allBeats.map(beat => (
              <SelectItem key={beat} value={beat}>{beat}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={relationshipFilter} onValueChange={setRelationshipFilter}>
          <SelectTrigger className="w-40 bg-white">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="warm">Warm</SelectItem>
            <SelectItem value="close">Close</SelectItem>
            <SelectItem value="vip">VIP</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Contacts Grid */}
      {filteredJournalists.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No contacts found"
          description="Add your first media contact to start building relationships"
          actionLabel="Add Contact"
          onAction={() => setShowNewContact(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredJournalists.map(journalist => (
            <Card 
              key={journalist.id}
              className="p-4 bg-white border-0 shadow-sm hover:shadow-md transition-all cursor-pointer"
              onClick={() => setSelectedJournalist(journalist)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={journalist.photo_url} />
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      {journalist.name?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{journalist.name}</h3>
                      {journalist.is_favorite && (
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      )}
                    </div>
                    <p className="text-sm text-slate-500">{journalist.media_outlet}</p>
                  </div>
                </div>
                <Badge className={cn("text-xs", relationshipColors[journalist.relationship_status])}>
                  {journalist.relationship_status?.toUpperCase()}
                </Badge>
              </div>

              {journalist.beat?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {journalist.beat.slice(0, 3).map(beat => (
                    <Badge key={beat} variant="outline" className="text-xs">
                      {beat}
                    </Badge>
                  ))}
                  {journalist.beat.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{journalist.beat.length - 3}
                    </Badge>
                  )}
                </div>
              )}

              <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                {journalist.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    Email
                  </span>
                )}
                {journalist.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    Phone
                  </span>
                )}
                {journalist.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {journalist.location}
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Contact Detail Sheet */}
      <Sheet open={!!selectedJournalist} onOpenChange={() => setSelectedJournalist(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedJournalist && (
            <>
              <SheetHeader className="flex flex-row items-start justify-between">
                <SheetTitle>Contact Details</SheetTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleToggleFavorite(selectedJournalist)}>
                      {selectedJournalist.is_favorite ? (
                        <><StarOff className="w-4 h-4 mr-2" /> Remove Favorite</>
                      ) : (
                        <><Star className="w-4 h-4 mr-2" /> Add to Favorites</>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-red-600"
                      onClick={() => deleteJournalistMutation.mutate(selectedJournalist.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Profile */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedJournalist.photo_url} />
                    <AvatarFallback className="bg-blue-100 text-blue-600 text-xl">
                      {selectedJournalist.name?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{selectedJournalist.name}</h3>
                    <p className="text-sm text-slate-500">{selectedJournalist.media_outlet}</p>
                    <Badge className={cn("mt-1 text-xs", relationshipColors[selectedJournalist.relationship_status])}>
                      {selectedJournalist.relationship_status?.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-3">
                  {selectedJournalist.email && (
                    <a 
                      href={`mailto:${selectedJournalist.email}`}
                      className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-700">{selectedJournalist.email}</span>
                    </a>
                  )}
                  {selectedJournalist.phone && (
                    <a 
                      href={`tel:${selectedJournalist.phone}`}
                      className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-700">{selectedJournalist.phone}</span>
                    </a>
                  )}
                  {selectedJournalist.location && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-700">{selectedJournalist.location}</span>
                    </div>
                  )}
                </div>

                {/* Social Links */}
                <div className="flex gap-2">
                  {selectedJournalist.social_twitter && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={selectedJournalist.social_twitter} target="_blank" rel="noopener noreferrer">
                        <Twitter className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                  {selectedJournalist.social_linkedin && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={selectedJournalist.social_linkedin} target="_blank" rel="noopener noreferrer">
                        <Linkedin className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                  {selectedJournalist.social_instagram && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={selectedJournalist.social_instagram} target="_blank" rel="noopener noreferrer">
                        <Instagram className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                </div>

                {/* Beats */}
                {selectedJournalist.beat?.length > 0 && (
                  <div>
                    <Label className="text-xs text-slate-500">Coverage Areas</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedJournalist.beat.map(beat => (
                        <Badge key={beat} variant="outline">{beat}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedJournalist.notes && (
                  <div>
                    <Label className="text-xs text-slate-500">Notes</Label>
                    <p className="mt-1 text-sm text-slate-700 p-3 bg-slate-50 rounded-lg">
                      {selectedJournalist.notes}
                    </p>
                  </div>
                )}

                {/* Outreach History */}
                {journalistOutreaches.length > 0 && (
                  <div>
                    <Label className="text-xs text-slate-500">Recent Outreach</Label>
                    <div className="mt-2 space-y-2">
                      {journalistOutreaches.slice(0, 3).map(outreach => (
                        <div key={outreach.id} className="p-2 bg-slate-50 rounded text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-slate-900">{outreach.subject}</span>
                            <StatusBadge status={outreach.status} />
                          </div>
                          {outreach.response_date && (
                            <p className="text-emerald-600">✓ Responded</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <Button className="flex-1" asChild>
                    <a href={`mailto:${selectedJournalist.email}`}>
                      <Send className="w-4 h-4 mr-2" />
                      Send Email
                    </a>
                  </Button>
                  {pressReleases.length > 0 && (
                    <Button 
                      className="flex-1 bg-purple-600 hover:bg-purple-700"
                      onClick={() => setShowPitchDialog(true)}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      AI Pitch
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Contact Dialog */}
      <Dialog open={showNewContact} onOpenChange={setShowNewContact}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-2">
                <Label>Media Outlet *</Label>
                <Input
                  value={newContact.media_outlet}
                  onChange={(e) => setNewContact({ ...newContact, media_outlet: e.target.value })}
                  placeholder="Company/Publication"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  placeholder="+62..."
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={newContact.location}
                  onChange={(e) => setNewContact({ ...newContact, location: e.target.value })}
                  placeholder="City, Country"
                />
              </div>
              <div className="space-y-2">
                <Label>Relationship</Label>
                <Select 
                  value={newContact.relationship_status} 
                  onValueChange={(v) => setNewContact({ ...newContact, relationship_status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="warm">Warm</SelectItem>
                    <SelectItem value="close">Close</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Coverage Areas (Beats)</Label>
              <div className="flex gap-2">
                <Input
                  value={newBeat}
                  onChange={(e) => setNewBeat(e.target.value)}
                  placeholder="e.g., Politics, Tech"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addBeatToNew())}
                />
                <Button type="button" variant="outline" onClick={addBeatToNew}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {newContact.beat.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {newContact.beat.map(beat => (
                    <Badge key={beat} variant="outline" className="pr-1">
                      {beat}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-1"
                        onClick={() => removeBeatFromNew(beat)}
                      >
                        <span className="sr-only">Remove</span>×
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={newContact.notes}
                onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewContact(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => createJournalistMutation.mutate(newContact)}
              disabled={!newContact.name || !newContact.media_outlet}
            >
              Add Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Pitch Dialog */}
      <Dialog open={showPitchDialog} onOpenChange={setShowPitchDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generate AI Pitch for {selectedJournalist?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Press Release</Label>
              <Select 
                value={selectedPressRelease?.id || ''} 
                onValueChange={(id) => {
                  const pr = pressReleases.find(p => p.id === id);
                  setSelectedPressRelease(pr);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a press release..." />
                </SelectTrigger>
                <SelectContent>
                  {pressReleases.map(pr => (
                    <SelectItem key={pr.id} value={pr.id}>{pr.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPressRelease && (
              <PitchSuggestion
                journalist={selectedJournalist}
                pressRelease={selectedPressRelease}
                onUse={handleUsePitch}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}