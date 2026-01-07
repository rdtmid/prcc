import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Copy, CheckCircle, RefreshCw } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function ResponseSuggestion({ content, sentiment, context = "", type = "mention" }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [copied, setCopied] = useState(null);

  const generateSuggestions = async () => {
    setIsGenerating(true);
    try {
      const isCrisis = type === "crisis";
      const prompt = isCrisis 
        ? `Sebagai expert crisis communication untuk tim PR, buatlah 3 draft respons untuk situasi krisis berikut:

KRISIS: ${content}
KONTEKS: ${context || 'Tidak ada konteks tambahan'}

Berikan 3 variasi respons yang berbeda:
1. Formal dan sangat hati-hati (untuk media resmi)
2. Empati dan proaktif (untuk sosial media)
3. Singkat dan lugas (untuk statement cepat)

Setiap respons harus:
- Mengakui masalah tanpa mengakui kesalahan langsung
- Menunjukkan empati dan concern
- Menyebutkan tindakan yang diambil/akan diambil
- Menjaga kepercayaan publik
- Profesional dan menenangkan

Format dalam JSON dengan array suggestions.`
        : `Sebagai AI assistant untuk tim PR, buatlah 3 draft respons untuk mention berikut:

KONTEN: "${content}"
SENTIMEN: ${sentiment}
KONTEKS: ${context || 'Mention dari media sosial'}

Berikan 3 variasi respons:
1. Profesional dan informatif
2. Friendly dan engaging
3. Singkat dan to-the-point

Setiap respons harus:
- Sesuai dengan tone dan sentimen mention
- Menjawab atau merespons dengan tepat
- Membangun engagement positif
- Profesional namun approachable

Format dalam JSON dengan array suggestions.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  tone: { type: "string" },
                  response: { type: "string" },
                  rationale: { type: "string" }
                }
              }
            }
          }
        }
      });

      setSuggestions(result.suggestions || []);
    } catch (e) {
      console.error('Response generation failed:', e);
    }
    setIsGenerating(false);
  };

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopied(index);
    setTimeout(() => setCopied(null), 2000);
  };

  const toneColors = {
    formal: "bg-blue-100 text-blue-700",
    empati: "bg-purple-100 text-purple-700",
    friendly: "bg-emerald-100 text-emerald-700",
    singkat: "bg-amber-100 text-amber-700"
  };

  return (
    <Card className="p-5 bg-gradient-to-br from-purple-50 to-blue-50 border-0 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-500" />
          AI Response Suggestions
        </h3>
        <Button 
          onClick={generateSuggestions} 
          disabled={isGenerating}
          size="sm"
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", isGenerating && "animate-spin")} />
          {isGenerating ? 'Generating...' : 'Generate'}
        </Button>
      </div>

      {!suggestions ? (
        <div className="text-center py-6">
          <Sparkles className="w-10 h-10 text-purple-300 mx-auto mb-2" />
          <p className="text-sm text-slate-600">
            Click "Generate" to get AI-powered response suggestions
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {suggestions.map((suggestion, idx) => (
            <div key={idx} className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-900 text-sm">{suggestion.title}</span>
                  <Badge 
                    className={cn("text-xs", 
                      toneColors[suggestion.tone?.toLowerCase()] || "bg-slate-100 text-slate-700"
                    )}
                  >
                    {suggestion.tone}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(suggestion.response, idx)}
                  className="h-7 px-2"
                >
                  {copied === idx ? (
                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-slate-700 mb-2 whitespace-pre-wrap">{suggestion.response}</p>
              {suggestion.rationale && (
                <p className="text-xs text-slate-500 italic border-t pt-2">
                  💡 {suggestion.rationale}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}