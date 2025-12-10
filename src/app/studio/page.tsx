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
        return <Badge className="bg-gray-100 text-gray-800">Draft</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const totalViews = videos?.reduce((sum, v) => sum + v.viewCount, 0) || 0;
  const totalLikes = videos?.reduce((sum, v) => sum + v.likeCount, 0) || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/feed" className="text-gray-500 hover:text-gray-700">
                ← Back
              </Link>
              <h1 className="text-2xl font-bold">Creator Studio</h1>
            </div>
            <Link href="/studio/upload">
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Upload Video
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Videos
              </CardTitle>
              <Video className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{videos?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Views
              </CardTitle>
              <Eye className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalViews.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Likes
              </CardTitle>
              <ThumbsUp className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalLikes.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Videos Table */}
        <Card>
          <CardHeader>
            <CardTitle>Your Videos</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">
                Loading your videos...
              </div>
            ) : !videos || videos.length === 0 ? (
              <div className="text-center py-12">
                <Video className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No videos yet
                </h3>
                <p className="text-gray-500 mb-4">
                  Upload your first video to get started
                </p>
                <Link href="/studio/upload">
                  <Button>
                    <Upload className="h-4 w-4 mr-2" />
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
                    <TableHead>Date</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {videos.map((video) => (
                    <TableRow key={video.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative w-32 h-18 rounded overflow-hidden bg-gray-100 flex-shrink-0">
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
                              className="font-medium hover:text-blue-600 line-clamp-2"
                            >
                              {video.title}
                            </Link>
                            <p className="text-sm text-gray-500 line-clamp-1">
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
                      <TableCell className="text-sm text-gray-500">
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
