import { createUploadthing, type FileRouter } from "uploadthing/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { UploadThingError } from "uploadthing/server";

const f = createUploadthing();

// Helper function to get or create user in database
async function getOrCreateUser(clerkId: string) {
  // Try to find existing user
  const user = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (user[0]) {
    return user[0];
  }

  // User not found, create them from Clerk data
  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(clerkId);

  const newUser = await db
    .insert(users)
    .values({
      clerkId: clerkId,
      name: clerkUser.firstName 
        ? `${clerkUser.firstName} ${clerkUser.lastName || ""}`.trim()
        : clerkUser.emailAddresses[0]?.emailAddress?.split("@")[0] || "User",
      imageURL: clerkUser.imageUrl || "",
    })
    .returning();

  return newUser[0];
}

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

      // Get or create user in database
      const user = await getOrCreateUser(clerkId);

      if (!user) {
        throw new UploadThingError("Failed to get user");
      }

      if (user.isBanned) {
        throw new UploadThingError("Your account is suspended");
      }

      // Return metadata to be stored with the file
      return { userId: user.id, clerkId };
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

      // Get or create user in database
      const user = await getOrCreateUser(clerkId);

      if (!user) {
        throw new UploadThingError("Failed to get user");
      }

      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Thumbnail upload complete for user:", metadata.userId);
      return { 
        uploadedBy: metadata.userId,
        url: file.ufsUrl,
      };
    }),

  // Image uploader - for profile pictures
  imageUploader: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      const { userId: clerkId } = await auth();

      if (!clerkId) {
        throw new UploadThingError("You must be logged in to upload images");
      }

      // Get or create user in database
      const user = await getOrCreateUser(clerkId);

      if (!user) {
        throw new UploadThingError("Failed to get user");
      }

      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Profile image upload complete for user:", metadata.userId);
      return { 
        uploadedBy: metadata.userId,
        url: file.ufsUrl,
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
