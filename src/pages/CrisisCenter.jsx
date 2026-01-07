import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import TeamActivityFeed from '@/components/collaboration/TeamActivityFeed';
import ResponseSuggestion from '@/components/ai/ResponseSuggestion';
import MentionsList from '@/components/dashboard/MentionsList';
import {
  AlertTriangle, Shield, Clock, CheckCircle, Users,
  MessageCircle, TrendingUp, TrendingDown, Plus, Activity,
  FileText, Send, Sparkles, Radio, ListTodo, ExternalLink
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from "@/lib/utils";

const severityConfig = {
  critical: { color: "bg-red-500", text: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
  high: { color: "bg-orange-500", text: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
  medium: { color: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  low: { color: "bg-blue-500", text: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
};

const typeLabels = {
  negative_sentiment_spike: "Sentiment Spike",
  viral_content: "Viral Content",
  media_attack: "Media Attack",
  misinformation: "Misinformation",
  data_breach: "Data Breach",
  scandal: "Scandal",
  accident: "Accident",
  other: "Other",
};

export default function CrisisCenter() {
  const [selectedCrisis, setSelectedCrisis] = useState(null);
  const [showNewCrisis, setShowNewCrisis] = useState(false);
  const [newCrisis, setNewCrisis] = useState({
    title: '',
    description: '',
    severity: 'medium',
    type: 'other',
    status: 'active'
  });
  const [newAction, setNewAction] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [tab, setTab] = useState('active');
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', type: 'response', priority: 'urgent', due_date: '' });
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

  const queryClient = useQueryClient();

  const { data: crisisAlerts = [], isLoading } = useQuery({
    queryKey: ['crisisAlerts'],
    queryFn: () => base44.entities.CrisisAlert.list('-created_date'),
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  const { data: allMentions = [] } = useQuery({
    queryKey: ['mentions'],
    queryFn: () => base44.entities.Mention.list('-created_date', 500),
  });

  const createCrisisMutation = useMutation({
    mutationFn: (data) => base44.entities.CrisisAlert.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['crisisAlerts']);
      setShowNewCrisis(false);
      setNewCrisis({ title: '', description: '', severity: 'medium', type: 'other', status: 'active' });
    },
  });

  const updateCrisisMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CrisisAlert.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['crisisAlerts']),
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

  const filteredAlerts = crisisAlerts.filter(alert => {
    if (tab === 'active') return ['active', 'monitoring'].includes(alert.status);
    if (tab === 'resolved') return ['contained', 'resolved'].includes(alert.status);
    return true;
  });

  const handleStatusChange = (status) => {
    if (selectedCrisis) {
      const updateData = { status };
      if (status === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
      }
      updateCrisisMutation.mutate({ id: selectedCrisis.id, data: updateData });
      setSelectedCrisis({ ...selectedCrisis, ...updateData });
    }
  };

  const handleAddAction = () => {
    if (selectedCrisis && newAction) {
      const actions = selectedCrisis.actions_taken || [];
      actions.push({
        timestamp: new Date().toISOString(),
        action: newAction,
        by: 'Current User'
      });
      updateCrisisMutation.mutate({
        id: selectedCrisis.id,
        data: { actions_taken: actions }
      });
      setSelectedCrisis({ ...selectedCrisis, actions_taken: actions });
      setNewAction('');
    }
  };

  const generateResponse = async () => {
    if (!selectedCrisis) return;
    setIsGenerating(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a PR crisis communication expert. Generate a professional official statement/response for the following crisis situation:

Crisis Title: ${selectedCrisis.title}
Description: ${selectedCrisis.description}
Type: ${typeLabels[selectedCrisis.type]}
Severity: ${selectedCrisis.severity}

Generate a calm, professional, and empathetic response that:
1. Acknowledges the situation
2. Shows concern and empathy
3. Explains what actions are being taken
4. Maintains trust and credibility

Return a JSON object with the statement.`,
        response_json_schema: {
          type: "object",
          properties: {
            statement: { type: "string" }
          }
        }
      });

      updateCrisisMutation.mutate({
        id: selectedCrisis.id,
        data: { official_statement: result.statement }
      });
      setSelectedCrisis({ ...selectedCrisis, official_statement: result.statement });
    } catch (e) {
      console.error('Failed to generate response:', e);
    }
    setIsGenerating(false);
  };

  const handleCreateTask = async () => {
    if (!selectedCrisis || !user) return;
    
    const task = {
      ...newTask,
      related_crisis_id: selectedCrisis.id,
      assigned_by: user.email
    };
    
    await createTaskMutation.mutateAsync(task);
    
    // Notify assigned person
    if (newTask.assigned_to && newTask.assigned_to !== user.email) {
      await createNotificationMutation.mutateAsync({
        type: 'assignment',
        title: 'Urgent: Crisis task assigned',
        message: `${newTask.title} - Crisis: "${selectedCrisis.title}"`,
        recipient: newTask.assigned_to,
        sender: user.email,
        related_entity: 'CrisisAlert',
        related_id: selectedCrisis.id,
        priority: 'urgent',
        action_required: true
      });
    }
    
    setNewTask({ title: '', description: '', type: 'response', priority: 'urgent', due_date: '' });
    setShowTaskDialog(false);
  };

  const activeCount = crisisAlerts.filter(a => ['active', 'monitoring'].includes(a.status)).length;
  const criticalCount = crisisAlerts.filter(a => a.severity === 'critical' && a.status === 'active').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Crisis Center"
        subtitle="Monitor and manage crisis situations"
        actionLabel="Report Crisis"
        actionIcon={AlertTriangle}
        onAction={() => setShowNewCrisis(true)}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={cn("p-4 border-0 shadow-sm", criticalCount > 0 ? "bg-red-50" : "bg-white")}>
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", criticalCount > 0 ? "bg-red-100" : "bg-slate-100")}>
              <AlertTriangle className={cn("w-5 h-5", criticalCount > 0 ? "text-red-600" : "text-slate-600")} />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase">Critical</p>
              <p className="text-2xl font-bold text-slate-900">{criticalCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-white border-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100">
              <Activity className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase">Active</p>
              <p className="text-2xl font-bold text-slate-900">{activeCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-white border-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase">Resolved</p>
              <p className="text-2xl font-bold text-slate-900">
                {crisisAlerts.filter(a => a.status === 'resolved').length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-white border-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase">Total</p>
              <p className="text-2xl font-bold text-slate-900">{crisisAlerts.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-white border">
          <TabsTrigger value="active">Active ({activeCount})</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Crisis List */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <Card className="p-12 bg-white border-0 shadow-sm text-center">
            <Shield className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-1">All Clear</h3>
            <p className="text-sm text-slate-500">No active crisis situations at the moment</p>
          </Card>
        ) : (
          filteredAlerts.map(crisis => {
            const config = severityConfig[crisis.severity] || severityConfig.medium;
            return (
              <Card 
                key={crisis.id}
                className={cn(
                  "p-5 border-l-4 shadow-sm cursor-pointer hover:shadow-md transition-all",
                  config.border,
                  config.bg
                )}
                onClick={() => setSelectedCrisis(crisis)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={cn("p-2 rounded-lg", config.color + "/20")}>
                      <AlertTriangle className={cn("w-5 h-5", config.text)} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900">{crisis.title}</h3>
                        <Badge variant="outline" className={cn("text-xs", config.text)}>
                          {crisis.severity.toUpperCase()}
                        </Badge>
                        <StatusBadge status={crisis.status} />
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-2">{crisis.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(crisis.created_date), { addSuffix: true })}
                        </span>
                        <span>{typeLabels[crisis.type]}</span>
                        {crisis.peak_mentions && (
                          <span className="flex items-center gap-1">
                            <Radio className="w-3 h-3" />
                            {crisis.peak_mentions} peak mentions
                          </span>
                        )}
                        {crisis.source_mentions?.length > 0 && (
                          <span className="flex items-center gap-1 text-blue-600">
                            <ExternalLink className="w-3 h-3" />
                            {crisis.source_mentions.length} linked mentions
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Crisis Detail Sheet */}
      <Sheet open={!!selectedCrisis} onOpenChange={() => setSelectedCrisis(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedCrisis && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <AlertTriangle className={cn("w-5 h-5", severityConfig[selectedCrisis.severity]?.text)} />
                  {selectedCrisis.title}
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Status & Severity */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Label className="text-xs text-slate-500">Status</Label>
                    <Select value={selectedCrisis.status} onValueChange={handleStatusChange}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="monitoring">Monitoring</SelectItem>
                        <SelectItem value="contained">Contained</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-slate-500">Severity</Label>
                    <div className={cn("mt-1 px-3 py-2 rounded-md text-sm font-medium", 
                      severityConfig[selectedCrisis.severity]?.bg,
                      severityConfig[selectedCrisis.severity]?.text
                    )}>
                      {selectedCrisis.severity.toUpperCase()}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <Label className="text-xs text-slate-500">Description</Label>
                  <p className="mt-1 text-sm text-slate-700 p-3 bg-slate-50 rounded-lg">
                    {selectedCrisis.description}
                  </p>
                </div>

                {/* Official Statement */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs text-slate-500">Official Statement</Label>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={generateResponse}
                      disabled={isGenerating}
                    >
                      <Sparkles className={cn("w-4 h-4 mr-1", isGenerating && "animate-spin")} />
                      AI Generate
                    </Button>
                  </div>
                  <Textarea
                    value={selectedCrisis.official_statement || ''}
                    onChange={(e) => {
                      setSelectedCrisis({ ...selectedCrisis, official_statement: e.target.value });
                    }}
                    onBlur={() => {
                      updateCrisisMutation.mutate({
                        id: selectedCrisis.id,
                        data: { official_statement: selectedCrisis.official_statement }
                      });
                    }}
                    placeholder="Enter official statement..."
                    className="min-h-[120px]"
                  />
                </div>

                {/* Actions Timeline */}
                <div>
                  <Label className="text-xs text-slate-500 mb-3 block">Actions Timeline</Label>
                  <div className="space-y-3">
                    {selectedCrisis.actions_taken?.map((action, idx) => (
                      <div key={idx} className="flex gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                        <div className="flex-1">
                          <p className="text-sm text-slate-700">{action.action}</p>
                          <p className="text-xs text-slate-500">
                            {action.by} • {format(new Date(action.timestamp), 'PPp')}
                          </p>
                        </div>
                      </div>
                    ))}
                    {(!selectedCrisis.actions_taken || selectedCrisis.actions_taken.length === 0) && (
                      <p className="text-sm text-slate-400">No actions logged yet</p>
                    )}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Input
                      value={newAction}
                      onChange={(e) => setNewAction(e.target.value)}
                      placeholder="Log new action..."
                      onKeyDown={(e) => e.key === 'Enter' && handleAddAction()}
                    />
                    <Button onClick={handleAddAction} disabled={!newAction}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Related Mentions */}
                {selectedCrisis.source_mentions?.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-xs text-slate-500">
                        Related Mentions ({selectedCrisis.source_mentions.length})
                      </Label>
                    </div>
                    <div className="space-y-3">
                      {allMentions.filter(m => selectedCrisis.source_mentions.includes(m.id)).map(mention => (
                        <Card key={mention.id} className="p-3 bg-slate-50 border-slate-200">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-slate-900">{mention.author}</span>
                                <Badge variant="outline" className="text-xs">{mention.source}</Badge>
                                <StatusBadge status={mention.sentiment} />
                              </div>
                              <p className="text-sm text-slate-600 line-clamp-2">{mention.content}</p>
                              <p className="text-xs text-slate-400 mt-1">
                                {formatDistanceToNow(new Date(mention.mention_date || mention.created_date), { addSuffix: true })}
                              </p>
                            </div>
                            {mention.source_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-shrink-0"
                                onClick={() => window.open(mention.source_url, '_blank')}
                              >
                                <ExternalLink className="w-3 h-3 mr-1" />
                                View Original
                              </Button>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Response Suggestions */}
                <ResponseSuggestion 
                  content={selectedCrisis.title + ': ' + selectedCrisis.description}
                  sentiment="negative"
                  context={`Crisis Type: ${typeLabels[selectedCrisis.type]}, Severity: ${selectedCrisis.severity}`}
                  type="crisis"
                />

                {/* Create Task */}
                <Button 
                  onClick={() => setShowTaskDialog(true)}
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  <ListTodo className="w-4 h-4 mr-2" />
                  Create Crisis Task
                </Button>

                {/* Team Activity */}
                <TeamActivityFeed 
                  relatedEntity="CrisisAlert"
                  relatedId={selectedCrisis.id}
                  relatedTitle={selectedCrisis.title}
                  compact
                />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* New Crisis Dialog */}
      <Dialog open={showNewCrisis} onOpenChange={setShowNewCrisis}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report New Crisis</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={newCrisis.title}
                onChange={(e) => setNewCrisis({ ...newCrisis, title: e.target.value })}
                placeholder="Brief crisis title..."
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newCrisis.description}
                onChange={(e) => setNewCrisis({ ...newCrisis, description: e.target.value })}
                placeholder="Describe the crisis situation..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Severity</Label>
                <Select 
                  value={newCrisis.severity} 
                  onValueChange={(v) => setNewCrisis({ ...newCrisis, severity: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select 
                  value={newCrisis.type} 
                  onValueChange={(v) => setNewCrisis({ ...newCrisis, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCrisis(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => createCrisisMutation.mutate(newCrisis)}
              disabled={!newCrisis.title}
              className="bg-red-600 hover:bg-red-700"
            >
              Report Crisis
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Task Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Crisis Response Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Task Title *</Label>
              <Input
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="Urgent crisis response..."
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
                <Label>Due Date *</Label>
                <Input
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Assign To *</Label>
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
              disabled={!newTask.title || !newTask.assigned_to}
              className="bg-red-600 hover:bg-red-700"
            >
              Create Urgent Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}