"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { format } from "date-fns";
import { Flag, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function AdminReportsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveAction, setResolveAction] = useState<"resolved" | "dismissed">(
    "resolved"
  );
  const [resolveNote, setResolveNote] = useState("");

  const utils = trpc.useUtils();

  const { data: reportsData, isLoading } = trpc.reports.getAll.useQuery({
    status: statusFilter === "all" ? undefined : (statusFilter as "pending" | "reviewed" | "resolved" | "dismissed"),
    limit: 50,
  });

  const reports = reportsData?.reports;

  const { data: pendingCount } = trpc.reports.getPendingCount.useQuery();

  const resolve = trpc.reports.resolve.useMutation({
    onSuccess: () => {
      utils.reports.getAll.invalidate();
      utils.reports.getPendingCount.invalidate();
      setResolvingId(null);
      setResolveNote("");
    },
  });

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="gap-1 text-yellow-600 border-yellow-300">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case "reviewed":
        return (
          <Badge variant="outline" className="gap-1 text-primary border-primary/30">
            <AlertTriangle className="h-3 w-3" />
            Reviewed
          </Badge>
        );
      case "resolved":
        return (
          <Badge variant="outline" className="gap-1 text-green-600 border-green-300">
            <CheckCircle className="h-3 w-3" />
            Resolved
          </Badge>
        );
      case "dismissed":
        return (
          <Badge variant="outline" className="gap-1 text-muted-foreground border-border">
            <XCircle className="h-3 w-3" />
            Dismissed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Flag className="h-6 w-6 text-red-500" />
            Content Reports
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {pendingCount ? `${pendingCount} pending reports` : "No pending reports"}
          </p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Loading reports...
                </TableCell>
              </TableRow>
            ) : !reports || reports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No reports found
                </TableCell>
              </TableRow>
            ) : (
              reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {report.targetType}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {report.reason}
                  </TableCell>
                  <TableCell className="max-w-[250px] truncate text-sm text-muted-foreground">
                    {report.description || "—"}
                  </TableCell>
                  <TableCell>{statusBadge(report.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(report.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    {report.status === "pending" || report.status === "reviewed" ? (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 h-7 text-xs"
                          onClick={() => {
                            setResolvingId(report.id);
                            setResolveAction("resolved");
                          }}
                        >
                          Resolve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-muted-foreground h-7 text-xs"
                          onClick={() => {
                            setResolvingId(report.id);
                            setResolveAction("dismissed");
                          }}
                        >
                          Dismiss
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {report.resolvedNote || "—"}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Resolve dialog */}
      <Dialog open={!!resolvingId} onOpenChange={() => setResolvingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {resolveAction === "resolved" ? "Resolve" : "Dismiss"} Report
            </DialogTitle>
            <DialogDescription>
              Add an optional note about your decision.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={resolveNote}
            onChange={(e) => setResolveNote(e.target.value)}
            placeholder="Add a note (optional)..."
            className="min-h-[80px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolvingId(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (resolvingId) {
                  resolve.mutate({
                    id: resolvingId,
                    status: resolveAction,
                    note: resolveNote || undefined,
                  });
                }
              }}
              disabled={resolve.isPending}
            >
              {resolve.isPending
                ? "Saving..."
                : resolveAction === "resolved"
                ? "Mark Resolved"
                : "Dismiss"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
