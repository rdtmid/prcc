import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Target, Mail, TrendingUp, Users } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function JournalistMatcher({ pressRelease, journalists, onSelect }) {
  const [isMatching, setIsMatching] = useState(false);
  const [matches, setMatches] = useState([]);
  const [selectedJournalists, setSelectedJournalists] = useState([]);

  const findMatches = async () => {
    if (!pressRelease || !journalists?.length) return;
    
    setIsMatching(true);
    try {
      // Prepare journalist data
      const journalistData = journalists.map(j => ({
        id: j.id,
        name: j.name,
        outlet: j.media_outlet,
        beats: j.beat?.join(', ') || '',
        relationship: j.relationship_status,
        coverage_count: j.coverage_count || 0
      }));

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Sebagai AI untuk media relations, analisis press release berikut dan rekomendasikan jurnalis yang paling relevan:

PRESS RELEASE:
Judul: ${pressRelease.title}
Kategori: ${pressRelease.category}
Summary: ${pressRelease.summary || pressRelease.subtitle || ''}

DAFTAR JURNALIS:
${journalistData.map((j, i) => `${i+1}. ${j.name} (${j.outlet}) - Beats: ${j.beats} - Coverage: ${j.coverage_count} - Relationship: ${j.relationship}`).join('\n')}

Analisis dan berikan:
1. Top 10 jurnalis yang paling relevan dengan press release ini
2. Match score 0-100 untuk setiap jurnalis
3. Alasan kenapa cocok
4. Saran pitch angle yang dipersonalisasi untuk masing-masing

Return JSON array dengan journalist_id, score, rationale, pitch_angle`,
        response_json_schema: {
          type: "object",
          properties: {
            matches: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  journalist_id: { type: "string" },
                  score: { type: "number" },
                  rationale: { type: "string" },
                  pitch_angle: { type: "string" }
                }
              }
            }
          }
        }
      });

      // Merge with journalist data
      const enrichedMatches = result.matches?.map(match => {
        const journalist = journalists.find(j => j.id === match.journalist_id);
        return { ...match, journalist };
      }).filter(m => m.journalist) || [];

      setMatches(enrichedMatches);
    } catch (e) {
      console.error('Journalist matching failed:', e);
    }
    setIsMatching(false);
  };

  const handleToggleSelect = (journalistId) => {
    if (selectedJournalists.includes(journalistId)) {
      setSelectedJournalists(selectedJournalists.filter(id => id !== journalistId));
    } else {
      setSelectedJournalists([...selectedJournalists, journalistId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedJournalists.length === matches.length) {
      setSelectedJournalists([]);
    } else {
      setSelectedJournalists(matches.map(m => m.journalist.id));
    }
  };

  const handleConfirm = () => {
    const selected = matches.filter(m => selectedJournalists.includes(m.journalist.id));
    onSelect?.(selected);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "text-emerald-600 bg-emerald-100";
    if (score >= 60) return "text-blue-600 bg-blue-100";
    if (score >= 40) return "text-amber-600 bg-amber-100";
    return "text-slate-600 bg-slate-100";
  };

  return (
    <Card className="p-5 bg-gradient-to-br from-blue-50 to-purple-50 border-0 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-500" />
          AI Journalist Matcher
        </h3>
        <Button 
          onClick={findMatches} 
          disabled={isMatching}
          size="sm"
        >
          <Target className={cn("w-4 h-4 mr-2", isMatching && "animate-spin")} />
          {isMatching ? 'Matching...' : 'Find Matches'}
        </Button>
      </div>

      {!matches.length ? (
        <div className="text-center py-8">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">
            Click "Find Matches" to get AI-recommended journalists for this press release
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-600">
              Found {matches.length} relevant journalists
            </p>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleSelectAll}
                className="h-7 text-xs"
              >
                {selectedJournalists.length === matches.length ? 'Deselect All' : 'Select All'}
              </Button>
              {selectedJournalists.length > 0 && (
                <Button 
                  size="sm"
                  onClick={handleConfirm}
                  className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
                >
                  <Mail className="w-3 h-3 mr-1" />
                  Send to {selectedJournalists.length}
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {matches.map((match) => (
              <div 
                key={match.journalist.id}
                className="p-3 bg-white rounded-lg border border-slate-200 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedJournalists.includes(match.journalist.id)}
                    onCheckedChange={() => handleToggleSelect(match.journalist.id)}
                    className="mt-1"
                  />
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className="bg-blue-100 text-blue-600 text-sm">
                      {match.journalist.name?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-900 text-sm">
                          {match.journalist.name}
                        </p>
                        <p className="text-xs text-slate-500">{match.journalist.media_outlet}</p>
                      </div>
                      <Badge className={cn("text-xs font-bold", getScoreColor(match.score))}>
                        {match.score}% match
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 mt-2 italic">
                      💡 {match.rationale}
                    </p>
                    <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-100">
                      <p className="text-xs text-blue-900 font-medium mb-1">Suggested Pitch:</p>
                      <p className="text-xs text-blue-800">{match.pitch_angle}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}