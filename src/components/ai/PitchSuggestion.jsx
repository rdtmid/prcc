import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Mail, Copy, CheckCircle, Wand2 } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function PitchSuggestion({ journalist, pressRelease, onUse }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [pitch, setPitch] = useState(null);
  const [copied, setCopied] = useState(false);

  const generatePitch = async () => {
    if (!journalist || !pressRelease) return;
    
    setIsGenerating(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Sebagai AI untuk media outreach, buatlah email pitch yang dipersonalisasi:

JURNALIS:
- Nama: ${journalist.name}
- Media: ${journalist.media_outlet}
- Beat/Coverage: ${journalist.beat?.join(', ') || 'General'}
- Relationship: ${journalist.relationship_status}
- Notes: ${journalist.notes || 'Tidak ada catatan khusus'}
- Riwayat Coverage: ${journalist.coverage_count || 0} artikel sebelumnya

PRESS RELEASE:
- Judul: ${pressRelease.title}
- Subtitle: ${pressRelease.subtitle || ''}
- Kategori: ${pressRelease.category}
- Summary: ${pressRelease.summary || ''}

Buatlah email pitch yang:
1. Dipersonalisasi untuk jurnalis ini (sebutkan nama, media, atau coverage sebelumnya jika relevan)
2. Menarik perhatian di paragraf pembuka
3. Menjelaskan relevansi dengan beat mereka
4. Highlight news value dan angle menarik
5. Call-to-action yang jelas
6. Profesional namun approachable
7. Tidak terlalu panjang (3-4 paragraf)

Return JSON dengan subject line dan body email.`,
        response_json_schema: {
          type: "object",
          properties: {
            subject: { type: "string" },
            body: { type: "string" },
            key_angle: { type: "string" },
            talking_points: { type: "array", items: { type: "string" } }
          }
        }
      });

      setPitch(result);
    } catch (e) {
      console.error('Pitch generation failed:', e);
    }
    setIsGenerating(false);
  };

  const handleCopy = () => {
    if (!pitch) return;
    const fullEmail = `Subject: ${pitch.subject}\n\n${pitch.body}`;
    navigator.clipboard.writeText(fullEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="p-5 bg-gradient-to-br from-indigo-50 to-purple-50 border-0 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-indigo-500" />
          Personalized Pitch
        </h3>
        <Button 
          onClick={generatePitch} 
          disabled={isGenerating}
          size="sm"
        >
          <Sparkles className={cn("w-4 h-4 mr-2", isGenerating && "animate-spin")} />
          {isGenerating ? 'Generating...' : 'Generate Pitch'}
        </Button>
      </div>

      {!pitch ? (
        <div className="text-center py-6">
          <Mail className="w-10 h-10 text-indigo-300 mx-auto mb-2" />
          <p className="text-sm text-slate-600">
            Generate AI-personalized pitch for this journalist
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Subject */}
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Subject Line</Label>
            <div className="p-3 bg-white rounded-lg border border-indigo-200">
              <p className="text-sm font-medium text-slate-900">{pitch.subject}</p>
            </div>
          </div>

          {/* Key Angle */}
          {pitch.key_angle && (
            <div className="p-3 bg-indigo-100 rounded-lg border border-indigo-200">
              <p className="text-xs font-semibold text-indigo-900 mb-1">🎯 Key Angle:</p>
              <p className="text-sm text-indigo-800">{pitch.key_angle}</p>
            </div>
          )}

          {/* Email Body */}
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Email Body</Label>
            <Textarea
              value={pitch.body}
              onChange={(e) => setPitch({ ...pitch, body: e.target.value })}
              className="min-h-[200px] bg-white"
            />
          </div>

          {/* Talking Points */}
          {pitch.talking_points?.length > 0 && (
            <div>
              <Label className="text-xs text-slate-500 mb-2 block">Key Talking Points</Label>
              <ul className="space-y-1">
                {pitch.talking_points.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                    <span className="text-indigo-500 mt-0.5">→</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              onClick={handleCopy}
              className="flex-1"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2 text-emerald-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Email
                </>
              )}
            </Button>
            <Button 
              onClick={() => onUse?.(pitch)}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            >
              <Mail className="w-4 h-4 mr-2" />
              Use This Pitch
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}