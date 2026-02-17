"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import Link from "next/link";
import { ListVideo, Plus, Trash2, Globe, Lock, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function PlaylistsPage() {
  const utils = trpc.useUtils();
  const { data: playlists, isLoading } = trpc.playlists.getMyPlaylists.useQuery();
  const [newName, setNewName] = useState("");
  const [newVisibility, setNewVisibility] = useState<"public" | "private" | "unlisted">("private");
  const [dialogOpen, setDialogOpen] = useState(false);

  const createPlaylist = trpc.playlists.create.useMutation({
    onSuccess: () => {
      utils.playlists.getMyPlaylists.invalidate();
      setNewName("");
      setDialogOpen(false);
    },
  });

  const deletePlaylist = trpc.playlists.delete.useMutation({
    onSuccess: () => utils.playlists.getMyPlaylists.invalidate(),
  });

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case "public": return <Globe className="h-3.5 w-3.5 text-green-600" />;
      case "private": return <Lock className="h-3.5 w-3.5 text-red-600" />;
      case "unlisted": return <LinkIcon className="h-3.5 w-3.5 text-yellow-600" />;
      default: return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ListVideo className="h-6 w-6 text-primary" />
            <span className="gradient-text">Playlists</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {playlists?.length ?? 0} playlists
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 gradient-btn rounded-lg">
              <Plus className="h-4 w-4" />
              New Playlist
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Playlist</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Playlist name"
                maxLength={100}
              />
              <Select
                value={newVisibility}
                onValueChange={(v) =>
                  setNewVisibility(v as "public" | "private" | "unlisted")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="unlisted">Unlisted</SelectItem>
                </SelectContent>
              </Select>
              <Button
                className="w-full"
                disabled={!newName.trim() || createPlaylist.isPending}
                onClick={() =>
                  createPlaylist.mutate({
                    name: newName.trim(),
                    visibility: newVisibility,
                  })
                }
              >
                {createPlaylist.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : !playlists || playlists.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <ListVideo className="h-10 w-10 text-primary/60" />
          </div>
          <h2 className="text-lg font-semibold mb-1">No playlists yet</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Create a playlist to organize your favorite videos.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {playlists.map((playlist) => (
            <Card key={playlist.id} className="group relative overflow-hidden glass-card gradient-border">
              <Link href={`/playlists/${playlist.id}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    {getVisibilityIcon(playlist.visibility)}
                    <span className="line-clamp-1">{playlist.name}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {playlist.videoCount} videos
                  </p>
                </CardContent>
              </Link>
              <button
                onClick={() => {
                  if (confirm(`Delete "${playlist.name}"?`)) {
                    deletePlaylist.mutate({ id: playlist.id });
                  }
                }}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-destructive/10 transition-all"
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
