import React, { useState, useEffect } from 'react';
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
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  ListTodo, Calendar, User, Clock, AlertCircle, 
  CheckCircle2, Circle, Plus, Tag
} from 'lucide-react';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import { cn } from "@/lib/utils";

const typeConfig = {
  response: { label: "Response", color: "bg-blue-100 text-blue-700" },
  content: { label: "Content", color: "bg-purple-100 text-purple-700" },
  outreach: { label: "Outreach", color: "bg-emerald-100 text-emerald-700" },
  report: { label: "Report", color: "bg-amber-100 text-amber-700" },
  meeting: { label: "Meeting", color: "bg-pink-100 text-pink-700" },
  review: { label: "Review", color: "bg-cyan-100 text-cyan-700" },
  other: { label: "Other", color: "bg-slate-100 text-slate-700" },
};

const priorityConfig = {
  low: { label: "Low", color: "text-slate-500", bg: "bg-slate-100" },
  medium: { label: "Medium", color: "text-amber-500", bg: "bg-amber-100" },
  high: { label: "High", color: "text-orange-500", bg: "bg-orange-100" },
  urgent: { label: "Urgent", color: "text-red-500", bg: "bg-red-100" },
};

export default function Tasks() {
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    type: 'other',
    status: 'todo',
    priority: 'medium',
    due_date: '',
    assigned_to: ''
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
    } catch (e) {
      console.log('Not logged in');
    }
  };

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date'),
  });

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      setShowNewTask(false);
      setNewTask({
        title: '',
        description: '',
        type: 'other',
        status: 'todo',
        priority: 'medium',
        due_date: '',
        assigned_to: ''
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['tasks']),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      setSelectedTask(null);
    },
  });

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    if (search && !task.title?.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter === 'my' && task.assigned_to !== user?.email) return false;
    if (statusFilter !== 'all' && statusFilter !== 'my' && task.status !== statusFilter) return false;
    return true;
  });

  const handleStatusToggle = (task) => {
    const newStatus = task.status === 'completed' ? 'todo' : 'completed';
    updateTaskMutation.mutate({
      id: task.id,
      data: { 
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : null
      }
    });
  };

  const handleStatusChange = (status) => {
    if (selectedTask) {
      updateTaskMutation.mutate({
        id: selectedTask.id,
        data: { 
          status,
          completed_at: status === 'completed' ? new Date().toISOString() : null
        }
      });
      setSelectedTask({ ...selectedTask, status });
    }
  };

  const getDueDateLabel = (dateStr) => {
    if (!dateStr) return null;
    const date = parseISO(dateStr);
    if (isToday(date)) return { label: 'Today', className: 'text-amber-600' };
    if (isTomorrow(date)) return { label: 'Tomorrow', className: 'text-blue-600' };
    if (isPast(date)) return { label: 'Overdue', className: 'text-red-600' };
    return { label: format(date, 'MMM d'), className: 'text-slate-500' };
  };

  // Stats
  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(t => t.due_date && isPast(parseISO(t.due_date)) && t.status !== 'completed').length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        subtitle="Manage team tasks and assignments"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search tasks..."
        actionLabel="New Task"
        actionIcon={Plus}
        onAction={() => setShowNewTask(true)}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4 bg-white border-0 shadow-sm">
          <p className="text-xs text-slate-500 uppercase">Total</p>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </Card>
        <Card className="p-4 bg-white border-0 shadow-sm">
          <p className="text-xs text-slate-500 uppercase">To Do</p>
          <p className="text-2xl font-bold text-slate-600">{stats.todo}</p>
        </Card>
        <Card className="p-4 bg-white border-0 shadow-sm">
          <p className="text-xs text-slate-500 uppercase">In Progress</p>
          <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
        </Card>
        <Card className="p-4 bg-white border-0 shadow-sm">
          <p className="text-xs text-slate-500 uppercase">Completed</p>
          <p className="text-2xl font-bold text-emerald-600">{stats.completed}</p>
        </Card>
        <Card className={cn("p-4 border-0 shadow-sm", stats.overdue > 0 ? "bg-red-50" : "bg-white")}>
          <p className="text-xs text-slate-500 uppercase">Overdue</p>
          <p className={cn("text-2xl font-bold", stats.overdue > 0 ? "text-red-600" : "text-slate-600")}>
            {stats.overdue}
          </p>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList className="bg-white border">
          <TabsTrigger value="all">All Tasks</TabsTrigger>
          <TabsTrigger value="my">My Tasks</TabsTrigger>
          <TabsTrigger value="todo">To Do</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="No tasks found"
          description="Create your first task to get started"
          actionLabel="New Task"
          onAction={() => setShowNewTask(true)}
        />
      ) : (
        <div className="space-y-2">
          {filteredTasks.map(task => {
            const type = typeConfig[task.type] || typeConfig.other;
            const priority = priorityConfig[task.priority] || priorityConfig.medium;
            const dueDate = getDueDateLabel(task.due_date);

            return (
              <Card 
                key={task.id}
                className={cn(
                  "p-4 bg-white border-0 shadow-sm hover:shadow-md transition-all cursor-pointer",
                  task.status === 'completed' && "opacity-60"
                )}
                onClick={() => setSelectedTask(task)}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={task.status === 'completed'}
                    onCheckedChange={() => handleStatusToggle(task)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={cn(
                        "font-medium text-slate-900",
                        task.status === 'completed' && "line-through text-slate-500"
                      )}>
                        {task.title}
                      </h3>
                      <Badge className={cn("text-xs", type.color)}>
                        {type.label}
                      </Badge>
                      {task.priority !== 'medium' && (
                        <Badge variant="outline" className={cn("text-xs", priority.color)}>
                          {priority.label}
                        </Badge>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-sm text-slate-500 mt-1 line-clamp-1">{task.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      {dueDate && (
                        <span className={cn("flex items-center gap-1", dueDate.className)}>
                          <Calendar className="w-3 h-3" />
                          {dueDate.label}
                        </span>
                      )}
                      {task.assigned_to && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {task.assigned_to}
                        </span>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={task.status} />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Task Detail Sheet */}
      <Sheet open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedTask && (
            <>
              <SheetHeader>
                <SheetTitle>Task Details</SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Title & Type */}
                <div>
                  <h3 className={cn(
                    "text-lg font-semibold text-slate-900",
                    selectedTask.status === 'completed' && "line-through"
                  )}>
                    {selectedTask.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={cn("text-xs", typeConfig[selectedTask.type]?.color)}>
                      {typeConfig[selectedTask.type]?.label}
                    </Badge>
                    <Badge variant="outline" className={cn("text-xs", priorityConfig[selectedTask.priority]?.color)}>
                      {priorityConfig[selectedTask.priority]?.label} Priority
                    </Badge>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <Label className="text-xs text-slate-500">Status</Label>
                  <Select value={selectedTask.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Description */}
                {selectedTask.description && (
                  <div>
                    <Label className="text-xs text-slate-500">Description</Label>
                    <p className="mt-1 text-sm text-slate-700 p-3 bg-slate-50 rounded-lg">
                      {selectedTask.description}
                    </p>
                  </div>
                )}

                {/* Due Date */}
                {selectedTask.due_date && (
                  <div>
                    <Label className="text-xs text-slate-500">Due Date</Label>
                    <p className="mt-1 text-sm text-slate-700">
                      {format(parseISO(selectedTask.due_date), 'EEEE, MMMM d, yyyy')}
                    </p>
                  </div>
                )}

                {/* Assigned To */}
                {selectedTask.assigned_to && (
                  <div>
                    <Label className="text-xs text-slate-500">Assigned To</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-blue-100 text-blue-600 text-sm">
                          {selectedTask.assigned_to[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-slate-700">{selectedTask.assigned_to}</span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <Button 
                    variant="destructive" 
                    className="flex-1"
                    onClick={() => deleteTaskMutation.mutate(selectedTask.id)}
                  >
                    Delete Task
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* New Task Dialog */}
      <Dialog open={showNewTask} onOpenChange={setShowNewTask}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="Task title"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="Task description"
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
                    {Object.entries(typeConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
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
                    {Object.entries(priorityConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
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
            <Button variant="outline" onClick={() => setShowNewTask(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => createTaskMutation.mutate(newTask)}
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