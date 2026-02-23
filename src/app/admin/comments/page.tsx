"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminAllCommentsPage() {
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.admin.getAllComments.useQuery({
    limit: 100,
    search: search || undefined,
  });
  const comments = data?.comments ?? [];

  const deleteComment = trpc.admin.deleteComment.useMutation({
    onSuccess: () => {
      utils.admin.getAllComments.invalidate();
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
          <h1 className="text-2xl font-bold">All Comments</h1>
          <p className="text-sm text-muted-foreground">{data?.total ?? 0} total comments</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search comments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-card rounded-lg shadow border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Comment</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Video</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Loading comments...
                </TableCell>
              </TableRow>
            ) : comments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No comments found
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
                    <div className="flex gap-1">
                      {c.isToxic && <Badge variant="destructive" className="text-[10px]">Toxic</Badge>}
                      {c.isHidden && <Badge variant="secondary" className="text-[10px]">Hidden</Badge>}
                      {!c.isToxic && !c.isHidden && <Badge variant="outline" className="text-[10px]">Normal</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(c.createdAt), "MMM d, yyyy")}</TableCell>
                  <TableCell>
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
                      <Trash2 className="h-3 w-3 mr-1" /> Delete
                    </Button>
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
