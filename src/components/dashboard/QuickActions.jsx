import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileText, Users, Search, BarChart3, 
  Bell, Send, Download, Plus 
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const actions = [
  { icon: FileText, label: "New Press Release", href: "PressRelease", color: "text-blue-500", bg: "bg-blue-500/10" },
  { icon: Search, label: "Monitor Keywords", href: "Monitoring", color: "text-purple-500", bg: "bg-purple-500/10" },
  { icon: Users, label: "Add Contact", href: "MediaRelations", color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { icon: BarChart3, label: "Generate Report", href: "Analytics", color: "text-amber-500", bg: "bg-amber-500/10" },
];

export default function QuickActions() {
  return (
    <Card className="p-5 bg-white border-0 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <Link key={action.label} to={createPageUrl(action.href)}>
            <Button 
              variant="ghost" 
              className="w-full h-auto py-4 flex flex-col items-center gap-2 hover:bg-slate-50"
            >
              <div className={`p-2.5 rounded-xl ${action.bg}`}>
                <action.icon className={`w-5 h-5 ${action.color}`} />
              </div>
              <span className="text-xs font-medium text-slate-600">{action.label}</span>
            </Button>
          </Link>
        ))}
      </div>
    </Card>
  );
}