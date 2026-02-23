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

export default function AdminToxicCommentsPage() {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.admin.getToxicComments.useQuery({ limit: 100 });
  const comments = data?.comments ?? [];

  const deleteComment = trpc.admin.deleteComment.useMutation({
    onSuccess: () => utils.admin.getToxicComments.invalidate(),
  });
  const unmarkToxic = trpc.admin.unmarkToxicComment.useMutation({
    onSuccess: () => utils.admin.getToxicComments.invalidate(),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Toxic Comments</h1>
      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Comment</TableHead>
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
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  Loading toxic comments...
                </TableCell>
              </TableRow>
            ) : comments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  No toxic comments found
                </TableCell>
              </TableRow>
            ) : (
              comments.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="max-w-[300px] truncate text-sm">{c.content}</TableCell>
                  <TableCell>{c.user?.name || "Unknown"}</TableCell>
                  <TableCell>{c.video?.title || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="destructive">
                      {c.toxicityScore != null ? (c.toxicityScore * 100).toFixed(1) : "-"}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">{format(new Date(c.createdAt), "MMM d, yyyy")}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 h-7 text-xs"
                        disabled={actionLoading === c.id && deleteComment.isPending}
                        onClick={() => {
                          setActionLoading(c.id);
                          deleteComment.mutate({ id: c.id });
                        }}
                      >
                        Delete
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 h-7 text-xs"
                        disabled={actionLoading === c.id && unmarkToxic.isPending}
                        onClick={() => {
                          setActionLoading(c.id);
                          unmarkToxic.mutate({ id: c.id });
                        }}
                      >
                        Unmark Toxic
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
