"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Ban, UserCheck, Trash2 } from "lucide-react";
import { format } from "date-fns";

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "user" | "admin" | "moderator">("all");
  const [bannedFilter, setBannedFilter] = useState<"all" | "banned" | "active">("all");
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [banReason, setBanReason] = useState("");

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.admin.getUsers.useQuery({
    search: search || undefined,
    role: roleFilter,
    banned: bannedFilter,
    limit: 50,
  });

  const updateRole = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => utils.admin.getUsers.invalidate(),
  });

  const banUser = trpc.admin.banUser.useMutation({
    onSuccess: () => {
      utils.admin.getUsers.invalidate();
      setBanDialogOpen(false);
      setBanReason("");
      setSelectedUser(null);
    },
  });

  const unbanUser = trpc.admin.unbanUser.useMutation({
    onSuccess: () => utils.admin.getUsers.invalidate(),
  });

  const deleteUser = trpc.admin.deleteUser.useMutation({
    onSuccess: () => utils.admin.getUsers.invalidate(),
  });

  const handleBan = (userId: string) => {
    setSelectedUser(userId);
    setBanDialogOpen(true);
  };

  const confirmBan = () => {
    if (selectedUser && banReason) {
      banUser.mutate({ userId: selectedUser, reason: banReason });
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "moderator":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Users</h1>
        <p className="text-gray-300 mt-1">
          Manage user accounts and permissions
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 bg-neutral-800 p-4 rounded-lg shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 text-white bg-neutral-900 border-neutral-700 placeholder:text-gray-400"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v: typeof roleFilter) => setRoleFilter(v)}>
          <SelectTrigger className="w-[150px] bg-neutral-900 text-white border-neutral-700">
            <SelectValue placeholder="Role" className="text-white" />
          </SelectTrigger>
          <SelectContent className="bg-neutral-900 text-white">
            <SelectItem value="all" className="text-white">All Roles</SelectItem>
            <SelectItem value="user" className="text-white">User</SelectItem>
            <SelectItem value="moderator" className="text-white">Moderator</SelectItem>
            <SelectItem value="admin" className="text-white">Admin</SelectItem>
          </SelectContent>
        </Select>
        <Select value={bannedFilter} onValueChange={(v: typeof bannedFilter) => setBannedFilter(v)}>
          <SelectTrigger className="w-[150px] bg-neutral-900 text-white border-neutral-700">
            <SelectValue placeholder="Status" className="text-white" />
          </SelectTrigger>
          <SelectContent className="bg-neutral-900 text-white">
            <SelectItem value="all" className="text-white">All Status</SelectItem>
            <SelectItem value="active" className="text-white">Active</SelectItem>
            <SelectItem value="banned" className="text-white">Banned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <div className="bg-neutral-800 rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-white">User</TableHead>
              <TableHead className="text-white">Role</TableHead>
              <TableHead className="text-white">Status</TableHead>
              <TableHead className="text-white">Joined</TableHead>
              <TableHead className="text-right text-white">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-white">
                  Loading...
                </TableCell>
              </TableRow>
            ) : data?.users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-400">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              data?.users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={user.imageURL} />
                        <AvatarFallback className="bg-neutral-700 text-white">{user.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-white">{user.name}</p>
                        <p className="text-sm text-gray-400">{user.clerkId}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={user.role}
                      onValueChange={(role: "user" | "admin" | "moderator") =>
                        updateRole.mutate({ userId: user.id, role })
                      }
                    >
                      <SelectTrigger className="w-[120px] bg-neutral-900 text-white border-neutral-700">
                        <Badge className={getRoleBadgeColor(user.role) + ' border border-neutral-700'}>
                          {user.role}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent className="bg-neutral-900 text-white">
                        <SelectItem value="user" className="text-white">User</SelectItem>
                        <SelectItem value="moderator" className="text-white">Moderator</SelectItem>
                        <SelectItem value="admin" className="text-white">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {user.isBanned ? (
                      <Badge variant="destructive" className="text-white bg-red-700 border border-red-500">Banned</Badge>
                    ) : (
                      <Badge variant="outline" className="text-green-400 border-green-500 bg-neutral-900">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-gray-200">{format(new Date(user.createdAt), "MMM d, yyyy")}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {user.isBanned ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-white border-neutral-700 hover:bg-green-700 hover:text-white"
                          onClick={() => unbanUser.mutate({ userId: user.id })}
                        >
                          <UserCheck className="h-4 w-4 mr-1" />
                          Unban
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-400 border-neutral-700 hover:bg-red-700 hover:text-white"
                          onClick={() => handleBan(user.id)}
                        >
                          <Ban className="h-4 w-4 mr-1" />
                          Ban
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        className="text-white bg-red-700 hover:bg-red-800"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this user?")) {
                            deleteUser.mutate({ userId: user.id });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {data && (
          <div className="px-4 py-3 border-t border-neutral-700 text-sm text-gray-300">
            Showing {data.users.length} of {data.total} users
          </div>
        )}
      </div>

      {/* Ban Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent className="bg-neutral-900 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Ban User</DialogTitle>
            <DialogDescription className="text-gray-300">
              Please provide a reason for banning this user. This will be recorded.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Enter ban reason..."
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              className="text-white bg-neutral-800 border-neutral-700 placeholder:text-gray-400"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" className="text-white border-neutral-700 hover:bg-neutral-700" onClick={() => setBanDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="text-white bg-red-700 hover:bg-red-800"
              onClick={confirmBan}
              disabled={!banReason || banUser.isPending}
            >
              {banUser.isPending ? "Banning..." : "Ban User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
