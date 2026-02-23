"use client";

import { trpc } from "@/trpc/client";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Video,
  Eye,
  ThumbsUp,
  MoreVertical,
  Pencil,
  Trash2,
  Globe,
  Lock,
  Link as LinkIcon,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";

export default function StudioPage() {
  const utils = trpc.useUtils();
  const { data: videos, isLoading } = trpc.videos.getMyVideos.useQuery({
    limit: 50,
  });

  const deleteVideo = trpc.videos.delete.useMutation({
    onSuccess: () => {
      utils.videos.getMyVideos.invalidate();
    },
  });

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case "public":
        return <Globe className="h-4 w-4 text-green-600" />;
      case "private":
        return <Lock className="h-4 w-4 text-red-600" />;
      case "unlisted":
        return <LinkIcon className="h-4 w-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return <Badge className="bg-green-100 text-green-800">Published</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      case "draft":
        return <Badge className="bg-muted text-foreground">Draft</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const totalViews = videos?.reduce((sum, v) => sum + v.viewCount, 0) || 0;
  const totalLikes = videos?.reduce((sum, v) => sum + v.likeCount, 0) || 0;

  return (
    <div className="py-6 min-h-screen w-full">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold tracking-tight gradient-text">Creator Studio</h1>
          <div className="flex items-center gap-2">
            <Link href="/studio/ai-dashboard">
              <Button variant="outline" className="gap-2 rounded-lg">
                <Sparkles className="h-4 w-4" />
                AI Dashboard
              </Button>
            </Link>
            <Link href="/studio/upload">
              <Button className="gap-2 gradient-btn rounded-lg">
                <Upload className="h-4 w-4" />
                Upload Video
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <Card className="glass-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Videos
              </CardTitle>
              <Video className="h-4 w-4 text-primary/50" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold gradient-text">{videos?.length || 0}</div>
            </CardContent>
          </Card>

          <Card className="glass-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Views
              </CardTitle>
              <Eye className="h-4 w-4 text-primary/50" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold gradient-text">
                {totalViews.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Likes
              </CardTitle>
              <ThumbsUp className="h-4 w-4 text-primary/50" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold gradient-text">
                {totalLikes.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Videos Table */}
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle>Your Videos</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading your videos...
              </div>
            ) : !videos || videos.length === 0 ? (
              <div className="text-center py-12">
                <Video className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-base font-medium mb-1">
                  No videos yet
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Upload your first video to get started
                </p>
                <Link href="/studio/upload">
                  <Button className="gap-2">
                    <Upload className="h-4 w-4" />
                    Upload Video
                  </Button>
                </Link>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[400px]">Video</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Likes</TableHead>
                    <TableHead>Quality</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {videos.map((video) => (
                    <TableRow key={video.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative w-32 h-18 rounded overflow-hidden bg-muted flex-shrink-0">
                            {video.thumbnailURL ? (
                              <Image
                                src={video.thumbnailURL}
                                alt={video.title}
                                width={128}
                                height={72}
                                className="object-cover w-full h-full"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900">
                                <Video className="h-6 w-6 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/feed/${video.id}`}
                              className="font-medium hover:text-primary line-clamp-2 transition-colors">
                              {video.title}
                            </Link>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {video.description || "No description"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getVisibilityIcon(video.visibility)}
                          <span className="capitalize text-sm">
                            {video.visibility}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(video.status)}</TableCell>
                      <TableCell>{video.viewCount.toLocaleString()}</TableCell>
                      <TableCell>{video.likeCount.toLocaleString()}</TableCell>
                      <TableCell>
                        {video.qualityScore !== null && video.qualityScore !== undefined ? (
                          <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
                            video.qualityScore >= 70
                              ? "bg-emerald-500/10 text-emerald-600"
                              : video.qualityScore >= 40
                                ? "bg-yellow-500/10 text-yellow-600"
                                : "bg-red-500/10 text-red-600"
                          }`}>
                            {video.qualityScore}/100
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(video.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/studio/edit/${video.id}`}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => {
                                if (
                                  confirm(
                                    "Are you sure you want to delete this video?"
                                  )
                                ) {
                                  deleteVideo.mutate({ id: video.id });
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
