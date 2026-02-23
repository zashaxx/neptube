"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserCheck, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminBannedUsersPage() {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.admin.getBannedUsers.useQuery({ limit: 50 });
  const bannedUsers = data?.users ?? [];

  const unbanUser = trpc.admin.unbanUser.useMutation({
    onSuccess: () => {
      utils.admin.getBannedUsers.invalidate();
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
          <h1 className="text-2xl font-bold">Banned Users</h1>
          <p className="text-sm text-muted-foreground">{bannedUsers.length} banned user{bannedUsers.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className="bg-card dark:bg-card rounded-lg shadow border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Ban Reason</TableHead>
              <TableHead>Banned Since</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Loading banned users...
                </TableCell>
              </TableRow>
            ) : bannedUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No banned users
                </TableCell>
              </TableRow>
            ) : (
              bannedUsers.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={u.imageURL ?? ""} />
                        <AvatarFallback>{u.name?.charAt(0) ?? "?"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{u.name ?? "Unknown"}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[150px]">{u.clerkId}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs capitalize">{u.role}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[250px]">
                    <p className="text-sm text-muted-foreground truncate">{u.banReason || "No reason provided"}</p>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(u.updatedAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs text-green-600"
                      disabled={actionLoading === u.id && unbanUser.isPending}
                      onClick={() => {
                        setActionLoading(u.id);
                        unbanUser.mutate({ userId: u.id });
                      }}
                    >
                      <UserCheck className="h-3 w-3 mr-1" /> Unban
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
