import React from 'react';
import { Button } from "@/components/ui/button";
import { AlertTriangle, X, ArrowRight, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const severityConfig = {
  critical: {
    bg: "bg-gradient-to-r from-red-600 to-red-500",
    pulse: "animate-pulse"
  },
  high: {
    bg: "bg-gradient-to-r from-orange-500 to-amber-500",
    pulse: ""
  },
  medium: {
    bg: "bg-gradient-to-r from-amber-500 to-yellow-500",
    pulse: ""
  },
  low: {
    bg: "bg-gradient-to-r from-blue-500 to-cyan-500",
    pulse: ""
  }
};

export default function CrisisAlertBanner({ alerts, onDismiss }) {
  const activeAlerts = alerts?.filter(a => a.status === 'active') || [];
  
  if (activeAlerts.length === 0) return null;

  const criticalAlert = activeAlerts.find(a => a.severity === 'critical') || activeAlerts[0];
  const config = severityConfig[criticalAlert.severity] || severityConfig.medium;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={cn(
          "rounded-xl p-4 text-white shadow-lg",
          config.bg,
          config.pulse
        )}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm uppercase tracking-wider">
                  {criticalAlert.severity} Alert
                </span>
                {activeAlerts.length > 1 && (
                  <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">
                    +{activeAlerts.length - 1} more
                  </span>
                )}
              </div>
              <p className="text-sm text-white/90 mt-0.5">{criticalAlert.title}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Link to={createPageUrl("CrisisCenter")}>
              <Button 
                variant="secondary" 
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white border-0"
              >
                <Shield className="w-4 h-4 mr-1.5" />
                Crisis Center
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              size="sm"
              className="text-white/80 hover:text-white hover:bg-white/10 h-8 w-8 p-0"
              onClick={() => onDismiss?.(criticalAlert.id)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}