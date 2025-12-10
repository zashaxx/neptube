import { createUploadthing, type FileRouter } from "uploadthing/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { UploadThingError } from "uploadthing/server";

const f = createUploadthing();

// FileRouter for your app, can contain multiple file routes
export const ourFileRouter = {
  // Video uploader - max 512MB, 3-5 min videos for demo
  videoUploader: f({
    video: {
      maxFileSize: "512MB",
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      // Get the authenticated user
      const { userId: clerkId } = await auth();

      if (!clerkId) {
        throw new UploadThingError("You must be logged in to upload videos");
      }

      // Get user from database
      const user = await db
        .select()
        .from(users)
        .where(eq(users.clerkId, clerkId))
        .limit(1);

      if (!user[0]) {
        throw new UploadThingError("User not found");
      }

      if (user[0].isBanned) {
        throw new UploadThingError("Your account is suspended");
      }

      // Return metadata to be stored with the file
      return { userId: user[0].id, clerkId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Video upload complete for user:", metadata.userId);
      console.log("File URL:", file.ufsUrl);

      // Return the file info to the client
      return { 
        uploadedBy: metadata.userId,
        url: file.ufsUrl,
        name: file.name,
        size: file.size,
      };
    }),

  // Thumbnail uploader - for custom thumbnails
  thumbnailUploader: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      const { userId: clerkId } = await auth();

      if (!clerkId) {
        throw new UploadThingError("You must be logged in to upload thumbnails");
      }

      const user = await db
        .select()
        .from(users)
        .where(eq(users.clerkId, clerkId))
        .limit(1);

      if (!user[0]) {
        throw new UploadThingError("User not found");
      }

      return { userId: user[0].id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Thumbnail upload complete for user:", metadata.userId);
      return { 
        uploadedBy: metadata.userId,
        url: file.ufsUrl,
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
