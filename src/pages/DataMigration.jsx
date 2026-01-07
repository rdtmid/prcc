import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/common/PageHeader';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Database, AlertTriangle, CheckCircle, RefreshCw, 
  ExternalLink, Info
} from 'lucide-react';
import { cn } from "@/lib/utils";

export default function DataMigration() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const runMigration = async () => {
    setIsRunning(true);
    setResult(null);
    setError(null);

    try {
      const response = await base44.functions.invoke('migrateMentionUrls');
      setResult(response.data);
    } catch (e) {
      setError(e.message || 'Migration failed');
    }
    
    setIsRunning(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Migration"
        subtitle="Update mention URLs to use source_url field"
      />

      <Alert className="border-amber-200 bg-amber-50">
        <AlertTriangle className="w-4 h-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <strong>Admin Only:</strong> This migration will update all mentions to extract URLs from content 
          and store them in the source_url field. Run this once to fix old data.
        </AlertDescription>
      </Alert>

      <Card className="p-6 bg-white border-0 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Database className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Migrate Mention URLs
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              This will process all mentions in the database and:
            </p>
            <ul className="text-sm text-slate-600 space-y-2 mb-4">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Extract URLs from mention content
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Store them in the source_url field
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Clean the content by removing URLs
              </li>
              <li className="flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600" />
                Skip mentions that already have source_url
              </li>
            </ul>
            
            <Button
              onClick={runMigration}
              disabled={isRunning}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Running Migration...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" />
                  Run Migration
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {result && (
        <Card className="p-6 bg-emerald-50 border-emerald-200">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-emerald-900 mb-3">
                Migration Complete
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-emerald-700 uppercase mb-1">Total</p>
                  <p className="text-2xl font-bold text-emerald-900">{result.total}</p>
                </div>
                <div>
                  <p className="text-xs text-emerald-700 uppercase mb-1">Updated</p>
                  <p className="text-2xl font-bold text-emerald-900">{result.updated}</p>
                </div>
                <div>
                  <p className="text-xs text-emerald-700 uppercase mb-1">Skipped</p>
                  <p className="text-2xl font-bold text-slate-600">{result.skipped}</p>
                </div>
                <div>
                  <p className="text-xs text-emerald-700 uppercase mb-1">Errors</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    result.errors > 0 ? "text-red-600" : "text-slate-400"
                  )}>
                    {result.errors}
                  </p>
                </div>
              </div>
              <p className="text-sm text-emerald-700 mt-4">{result.message}</p>
            </div>
          </div>
        </Card>
      )}

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      <Card className="p-6 bg-slate-50 border-slate-200">
        <h4 className="text-sm font-semibold text-slate-900 mb-3">
          ⚠️ Important Notes
        </h4>
        <ul className="text-sm text-slate-600 space-y-2">
          <li>• This migration only needs to be run once</li>
          <li>• It will skip mentions that already have source_url</li>
          <li>• New mentions from manual search already have correct format</li>
          <li>• This operation may take a few minutes for large datasets</li>
          <li>• Only admin users can run this migration</li>
        </ul>
      </Card>
    </div>
  );
}