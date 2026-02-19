"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Brain,
  Loader2,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
} from "lucide-react";

function scoreColor(score: number) {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  if (score >= 40) return "text-orange-600";
  return "text-red-600";
}

export default function ScriptCoachPage() {
  const [transcript, setTranscript] = useState("");

  const analyzeScript = trpc.ai.analyzeScript.useMutation();

  const result = analyzeScript.data;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-6 w-6 text-purple-500" />
            AI Script Coach
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Paste your script or transcript to get AI-powered performance predictions
          </p>
        </div>
        <Link href="/studio/ai-dashboard">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Dashboard
          </Button>
        </Link>
      </div>

      {/* Input */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Your Script / Transcript</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Paste your video script here... (minimum 10 characters)"
            className="min-h-[200px] font-mono text-sm"
          />
          <Button
            onClick={() => analyzeScript.mutate({ transcript })}
            disabled={transcript.length < 10 || analyzeScript.isPending}
            className="gap-2"
          >
            {analyzeScript.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Analyze Script
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-4 animate-in fade-in-50 duration-300">
          {/* Score cards */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="glass-card">
              <CardContent className="pt-5">
                <div className="text-sm text-muted-foreground mb-1">Hook Strength</div>
                <div className={`text-3xl font-bold ${scoreColor(result.hookStrength ?? 0)}`}>
                  {result.hookStrength}
                </div>
                <Progress
                  value={result.hookStrength ?? 0}
                  className="mt-2 h-2"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  How compelling your opening 30 seconds are
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="pt-5">
                <div className="text-sm text-muted-foreground mb-1">Retention Prediction</div>
                <div className={`text-3xl font-bold ${scoreColor(result.retentionPrediction ?? 0)}`}>
                  {result.retentionPrediction}%
                </div>
                <Progress
                  value={result.retentionPrediction ?? 0}
                  className="mt-2 h-2"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Predicted average watch percentage
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="pt-5">
                <div className="text-sm text-muted-foreground mb-1">Engagement Prediction</div>
                <div className={`text-3xl font-bold ${scoreColor(result.engagementPrediction ?? 0)}`}>
                  {result.engagementPrediction}%
                </div>
                <Progress
                  value={result.engagementPrediction ?? 0}
                  className="mt-2 h-2"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Likelihood of likes, comments & shares
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Weak segments */}
          {result.weakSegments && (result.weakSegments as Array<{ start: number; end: number; reason: string }>).length > 0 && (
            <Card className="glass-card border-orange-500/20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Weak Segments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(result.weakSegments as Array<{ start: number; end: number; reason: string }>).map((seg, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/10"
                    >
                      <Badge variant="outline" className="shrink-0">
                        Words {seg.start}–{seg.end}
                      </Badge>
                      <p className="text-sm">{seg.reason}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Suggestions */}
          {result.suggestions && (result.suggestions as string[]).length > 0 && (
            <Card className="glass-card border-green-500/20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-green-500" />
                  Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(result.suggestions as string[]).map((sug, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      {sug}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
