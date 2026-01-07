import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Radio } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function LiveIndicator({ className }) {
  return (
    <Badge 
      variant="outline" 
      className={cn(
        "bg-red-50 text-red-700 border-red-200 animate-pulse",
        className
      )}
    >
      <Radio className="w-3 h-3 mr-1 fill-red-500" />
      LIVE
    </Badge>
  );
}