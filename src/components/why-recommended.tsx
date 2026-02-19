"use client";

import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Info, Tag, FolderOpen, BarChart3, Type, Sparkles } from "lucide-react";

function ScoreBar({
  label,
  value,
  max,
  icon,
}: {
  label: string;
  value: number;
  max: number;
  icon: React.ReactNode;
}) {
  const pct = Math.min(100, (value / Math.max(max, 1)) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5">
          {icon}
          {label}
        </span>
        <span className="font-mono text-xs text-muted-foreground">
          {value.toFixed(1)}
        </span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  );
}

export function WhyRecommended({
  videoId,
  sourceVideoId,
}: {
  videoId: string;
  sourceVideoId?: string;
}) {
  const { data, isLoading } = trpc.ai.getRecommendationBreakdown.useQuery(
    { videoId, sourceVideoId },
    { enabled: false }
  );

  // Lazy-load on open
  const utils = trpc.useUtils();

  return (
    <Dialog
      onOpenChange={(open) => {
        if (open) {
          utils.ai.getRecommendationBreakdown.fetch({ videoId, sourceVideoId });
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground h-7">
          <Info className="h-3.5 w-3.5" />
          Why this video?
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Why This Was Recommended
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="text-sm text-muted-foreground py-4 text-center">
            Computing recommendation scores...
          </div>
        )}

        {data && (
          <div className="space-y-4 py-2">
            <ScoreBar
              label="Title Match"
              value={data.titleMatchScore ?? 0}
              max={100}
              icon={<Type className="h-3.5 w-3.5" />}
            />
            <ScoreBar
              label="Tag Overlap"
              value={data.tagScore ?? 0}
              max={15}
              icon={<Tag className="h-3.5 w-3.5" />}
            />
            <ScoreBar
              label="Category Match"
              value={data.categoryScore ?? 0}
              max={20}
              icon={<FolderOpen className="h-3.5 w-3.5" />}
            />
            <ScoreBar
              label="Engagement Signal"
              value={data.engagementWeight ?? 0}
              max={50}
              icon={<BarChart3 className="h-3.5 w-3.5" />}
            />
            <div className="pt-2 border-t flex items-center justify-between">
              <span className="text-sm font-medium">Final Score</span>
              <span className="text-lg font-bold text-purple-600">
                {(data.finalScore ?? 0).toFixed(1)}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              This score is calculated using a transparent, open formula. Higher
              title overlap, matching tags, same category, and strong viewer
              engagement all contribute. No hidden signals — what you see is what
              drives the recommendation.
            </p>
          </div>
        )}

        {!data && !isLoading && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No recommendation data available for this video yet.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
