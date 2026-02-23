"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2, Eye, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminHiddenCommentsPage() {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.admin.getHiddenComments.useQuery({ limit: 100 });
  const comments = data?.comments ?? [];

  const deleteComment = trpc.admin.deleteComment.useMutation({
    onSuccess: () => {
      utils.admin.getHiddenComments.invalidate();
      utils.admin.getStats.invalidate();
    },
  });

  const unhideComment = trpc.admin.unhideComment.useMutation({
    onSuccess: () => {
      utils.admin.getHiddenComments.invalidate();
      utils.admin.getStats.invalidate();
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Auto-Hidden Comments</h1>
          <p className="text-sm text-muted-foreground">Comments automatically hidden by content moderation</p>
        </div>
      </div>

      <div className="bg-white dark:bg-card rounded-lg shadow border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[35%]">Comment</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Video</TableHead>
              <TableHead>Toxicity</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Loading hidden comments...
                </TableCell>
              </TableRow>
            ) : comments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No auto-hidden comments found
                </TableCell>
              </TableRow>
            ) : (
              comments.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="max-w-[300px]">
                    <p className="truncate text-sm">{c.content}</p>
                  </TableCell>
                  <TableCell className="text-sm">{c.user?.name || "Unknown"}</TableCell>
                  <TableCell className="text-sm max-w-[150px] truncate">{c.video?.title || "-"}</TableCell>
                  <TableCell>
                    {c.toxicityScore != null ? (
                      <Badge variant="destructive" className="text-[10px]">
                        {(c.toxicityScore * 100).toFixed(1)}%
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(c.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={actionLoading === c.id}
                        onClick={() => {
                          setActionLoading(c.id);
                          unhideComment.mutate({ id: c.id });
                        }}
                      >
                        <Eye className="h-3 w-3 mr-1" /> Unhide
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 h-7 text-xs"
                        disabled={actionLoading === c.id}
                        onClick={() => {
                          setActionLoading(c.id);
                          deleteComment.mutate({ id: c.id });
                        }}
                      >
                        <Trash2 className="h-3 w-3 mr-1" /> Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
