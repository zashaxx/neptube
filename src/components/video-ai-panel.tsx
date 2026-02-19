"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Sparkles,
  Brain,
  Shield,
  DollarSign,
  Scissors,
  Rocket,
  Image as ImageIcon,
  AlertTriangle,
  CheckCircle,
  Palette,
  BarChart3,
  Lightbulb,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

function scoreColor(score: number) {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  if (score >= 40) return "text-orange-600";
  return "text-red-600";
}

function riskLevel(score: number) {
  if (score < 0.3) return { label: "Low Risk", color: "text-green-600 bg-green-50 dark:bg-green-900/20" };
  if (score < 0.6) return { label: "Medium Risk", color: "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20" };
  return { label: "High Risk", color: "text-red-600 bg-red-50 dark:bg-red-900/20" };
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const moodColors: Record<string, string> = {
  uplifting: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  dark: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  humorous: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  informative: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  inspirational: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  chill: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  intense: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  nostalgic: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  suspenseful: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
};

export function VideoAIPanel({ videoId }: { videoId: string }) {
  const [expanded, setExpanded] = useState(false);

  // Queries
  const { data: thumbnailScore } = trpc.ai.getThumbnailScore.useQuery({ videoId });
  const { data: retention } = trpc.ai.getRetention.useQuery({ videoId });
  const { data: contentDNA } = trpc.ai.getContentDNA.useQuery({ videoId });
  const { data: clips } = trpc.ai.getClips.useQuery({ videoId });
  const { data: viralSims } = trpc.ai.getViralSimulations.useQuery({ videoId });

  // Mutations
  const runFull = trpc.ai.runFullAnalysis.useMutation();
  const analyzeThumbnail = trpc.ai.analyzeThumbnail.useMutation();
  const predictRetention = trpc.ai.predictRetention.useMutation();
  const analyzeContentDNAMut = trpc.ai.analyzeContentDNA.useMutation();
  const scanRisks = trpc.ai.scanRisks.useMutation();
  const generateClips = trpc.ai.generateClips.useMutation();
  const simulateViral = trpc.ai.simulateViral.useMutation();
  const predictRevenue = trpc.ai.predictRevenue.useMutation();

  const isAnyPending =
    runFull.isPending ||
    analyzeThumbnail.isPending ||
    predictRetention.isPending ||
    analyzeContentDNAMut.isPending ||
    scanRisks.isPending ||
    generateClips.isPending ||
    simulateViral.isPending ||
    predictRevenue.isPending;

  const fullResult = runFull.data;
  const risksResult = scanRisks.data;
  const clipsResult = generateClips.data;
  const viralResult = simulateViral.data;
  const revenueResult = predictRevenue.data;

  return (
    <div className="space-y-4">
      <Card className="glass-card gradient-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="h-5 w-5 text-purple-500" />
              AI Analysis
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Run Full Analysis */}
          <Button
            onClick={() => runFull.mutate({ videoId })}
            disabled={isAnyPending}
            className="w-full gap-2"
            variant="default"
          >
            {runFull.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running Full Analysis...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Run Full AI Analysis
              </>
            )}
          </Button>

          {/* Quick results from full analysis */}
          {fullResult && (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-xs text-muted-foreground">Thumbnail</div>
                <div className={`text-lg font-bold ${scoreColor(fullResult.thumbnailScore.attentionScore)}`}>
                  {fullResult.thumbnailScore.attentionScore}/100
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-xs text-muted-foreground">Trending</div>
                <div className="text-lg font-bold text-orange-600">
                  {fullResult.trendingScore}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-xs text-muted-foreground">Rewatch</div>
                <div className="text-lg font-bold">
                  {Math.round(fullResult.retention.rewatchProbability * 100)}%
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-xs text-muted-foreground">Brand Safety</div>
                <div className={`text-lg font-bold ${scoreColor(fullResult.risks.brandSafetyScore)}`}>
                  {fullResult.risks.brandSafetyScore}/100
                </div>
              </div>
            </div>
          )}

          {/* Existing cached data */}
          {(thumbnailScore || contentDNA || retention) && !fullResult && (
            <div className="space-y-3">
              {thumbnailScore && (
                <div className="p-3 rounded-lg bg-muted/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Thumbnail Score</span>
                  </div>
                  <span className={`font-bold ${scoreColor(thumbnailScore.attentionScore ?? 0)}`}>
                    {thumbnailScore.attentionScore}/100
                  </span>
                </div>
              )}
              {contentDNA && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Palette className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium">Content DNA</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge className={moodColors[contentDNA.mood] ?? "bg-gray-100"}>
                      {contentDNA.mood}
                    </Badge>
                    <Badge variant="outline">{contentDNA.storytellingStyle}</Badge>
                    <Badge variant="secondary">{contentDNA.energyLevel}</Badge>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Expanded individual actions */}
          {expanded && (
            <div className="space-y-3 pt-2 border-t">
              <p className="text-xs text-muted-foreground">Run individual analyses:</p>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  disabled={isAnyPending}
                  onClick={() => analyzeThumbnail.mutate({ videoId })}
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  Thumbnail
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  disabled={isAnyPending}
                  onClick={() => predictRetention.mutate({ videoId })}
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  Retention
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  disabled={isAnyPending}
                  onClick={() => analyzeContentDNAMut.mutate({ videoId })}
                >
                  <Palette className="h-3.5 w-3.5" />
                  Content DNA
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  disabled={isAnyPending}
                  onClick={() => scanRisks.mutate({ videoId })}
                >
                  <Shield className="h-3.5 w-3.5" />
                  Risk Scan
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  disabled={isAnyPending}
                  onClick={() => generateClips.mutate({ videoId })}
                >
                  <Scissors className="h-3.5 w-3.5" />
                  Auto-Clips
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  disabled={isAnyPending}
                  onClick={() => simulateViral.mutate({ videoId })}
                >
                  <Rocket className="h-3.5 w-3.5" />
                  Viral Sim
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs col-span-2"
                  disabled={isAnyPending}
                  onClick={() => predictRevenue.mutate({ videoId })}
                >
                  <DollarSign className="h-3.5 w-3.5" />
                  Revenue Prediction
                </Button>
              </div>

              {/* Risk scan results */}
              {risksResult && (
                <Card className="border-orange-500/20">
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center gap-2 font-medium text-sm">
                      <Shield className="h-4 w-4" />
                      Risk Scan Results
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className={`p-2 rounded ${riskLevel(risksResult.nsfwScore).color}`}>
                        NSFW: {(risksResult.nsfwScore * 100).toFixed(0)}%
                      </div>
                      <div className={`p-2 rounded ${riskLevel(risksResult.copyrightProbability).color}`}>
                        Copyright: {(risksResult.copyrightProbability * 100).toFixed(0)}%
                      </div>
                      <div className={`p-2 rounded ${riskLevel(risksResult.controversyScore).color}`}>
                        Controversy: {(risksResult.controversyScore * 100).toFixed(0)}%
                      </div>
                      <div className="p-2 rounded bg-muted/50">
                        Brand Safety: {risksResult.brandSafetyScore}/100
                      </div>
                    </div>
                    {risksResult.risks.length > 0 && (
                      <div className="space-y-1">
                        {risksResult.risks.map((risk, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <AlertTriangle className="h-3.5 w-3.5 text-orange-500 mt-0.5 shrink-0" />
                            {risk}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      {risksResult.canPublish ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Safe to Publish
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Review Before Publishing
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Auto-clips results */}
              {(clipsResult && clipsResult.length > 0) && (
                <Card>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center gap-2 font-medium text-sm">
                      <Scissors className="h-4 w-4" />
                      Suggested Clips ({clipsResult.length})
                    </div>
                    {clipsResult.map((clip, i) => (
                      <div key={i} className="p-2 rounded-lg bg-muted/50 text-sm space-y-1">
                        <div className="font-medium">{clip.caption}</div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{formatTime(clip.startTime)} → {formatTime(clip.endTime)}</span>
                          <span>Hook: {clip.hookStrength}/100</span>
                          {clip.verticalOptimized && (
                            <Badge variant="outline" className="text-[10px] h-4">9:16</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Existing saved clips */}
              {clips && clips.length > 0 && !clipsResult && (
                <Card>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center gap-2 font-medium text-sm">
                      <Scissors className="h-4 w-4" />
                      Saved Clips ({clips.length})
                    </div>
                    {clips.map((clip) => (
                      <div key={clip.id} className="p-2 rounded-lg bg-muted/50 text-sm space-y-1">
                        <div className="font-medium">{clip.caption}</div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{formatTime(clip.startTime)} → {formatTime(clip.endTime)}</span>
                          <span>Hook: {clip.hookStrength}/100</span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Viral simulation */}
              {viralResult && (
                <Card>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center gap-2 font-medium text-sm">
                      <Rocket className="h-4 w-4" />
                      Viral Simulation
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 bg-muted/50 rounded">
                        <div className="text-lg font-bold">{viralResult.reach24h.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">24h Reach</div>
                      </div>
                      <div className="p-2 bg-muted/50 rounded">
                        <div className="text-lg font-bold">{viralResult.reach48h.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">48h Reach</div>
                      </div>
                      <div className="p-2 bg-muted/50 rounded">
                        <div className="text-lg font-bold">{Math.round(viralResult.confidenceScore * 100)}%</div>
                        <div className="text-xs text-muted-foreground">Confidence</div>
                      </div>
                    </div>
                    {viralResult.factors.length > 0 && (
                      <div className="space-y-1">
                        {viralResult.factors.map((f, i) => (
                          <div key={i} className="text-xs flex items-center gap-1.5">
                            <Lightbulb className="h-3 w-3 text-yellow-500" />
                            {f}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Viral sims history */}
              {viralSims && viralSims.length > 0 && !viralResult && (
                <Card>
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex items-center gap-2 font-medium text-sm">
                      <Rocket className="h-4 w-4" />
                      Past Simulations
                    </div>
                    {viralSims.slice(0, 3).map((sim) => (
                      <div key={sim.id} className="text-xs p-2 bg-muted/50 rounded flex justify-between">
                        <span>{sim.niche} • {sim.publishTime}</span>
                        <span className="font-medium">{sim.reach24h?.toLocaleString()} views/24h</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Revenue prediction */}
              {revenueResult && (
                <Card className="border-green-500/20">
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center gap-2 font-medium text-sm">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      Revenue Prediction
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded">
                        <div className="text-lg font-bold text-green-600">
                          ${revenueResult.estimatedCPM.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">Est. CPM</div>
                      </div>
                      <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded">
                        <div className="text-lg font-bold text-green-600">
                          ${revenueResult.estimatedRevenuePer1k.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">Per 1K</div>
                      </div>
                      <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded">
                        <div className="text-lg font-bold text-green-600">
                          {revenueResult.monetizationScore}
                        </div>
                        <div className="text-xs text-muted-foreground">Score</div>
                      </div>
                    </div>
                    <div className="text-xs space-y-1 text-muted-foreground">
                      <div>📦 {revenueResult.breakdown.category}</div>
                      <div>🛡️ {revenueResult.breakdown.brandSafety}</div>
                      <div>👥 {revenueResult.breakdown.audienceValue}</div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Retention curve display */}
              {(fullResult?.retention || retention || predictRetention.data) && (
                <RetentionCurve
                  curve={
                    fullResult?.retention.retentionCurve ??
                    predictRetention.data?.retentionCurve ??
                    retention?.predictedRetentionCurve ??
                    []
                  }
                  dropPoints={
                    fullResult?.retention.dropPoints ??
                    predictRetention.data?.dropPoints ??
                    retention?.predictedDropPoints ??
                    []
                  }
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Simple retention curve visualization ─────────────────────────────────
function RetentionCurve({
  curve,
  dropPoints,
}: {
  curve: number[];
  dropPoints: number[];
}) {
  if (!curve || curve.length === 0) return null;
  const max = Math.max(...curve, 100);

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center gap-2 font-medium text-sm">
          <BarChart3 className="h-4 w-4 text-blue-500" />
          Retention Curve
        </div>
        <div className="flex items-end gap-0.5 h-24">
          {curve.map((val, i) => {
            const isDrop = dropPoints.includes((i + 1) * 5);
            return (
              <div
                key={i}
                className="flex-1 group relative"
                title={`${(i + 1) * 5}% of video: ${Math.round(val)}% retention`}
              >
                <div
                  className={`w-full rounded-t transition-all ${
                    isDrop ? "bg-red-500" : "bg-blue-500/70"
                  }`}
                  style={{ height: `${(val / max) * 100}%` }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
        {dropPoints.length > 0 && (
          <div className="text-xs text-muted-foreground">
            <span className="text-red-500 font-medium">Drop points:</span>{" "}
            {dropPoints.map((p) => `${p}%`).join(", ")} of video
          </div>
        )}
      </CardContent>
    </Card>
  );
}
