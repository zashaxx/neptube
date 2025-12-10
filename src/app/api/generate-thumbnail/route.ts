import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { UTApi } from "uploadthing/server";

const utapi = new UTApi();

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "You must be logged in to generate thumbnails" },
        { status: 401 }
      );
    }

    const { title, description } = await request.json();

    if (!title) {
      return NextResponse.json(
        { error: "Title is required to generate a thumbnail" },
        { status: 400 }
      );
    }

    // Create a prompt for YouTube-style thumbnail
    const prompt = `A professional YouTube video thumbnail for a video titled "${title}". ${description ? `The video is about: ${description}.` : ""} High quality, eye-catching, vibrant colors, professional design, cinematic lighting, 4K quality, no text`;

    console.log("Generating thumbnail with prompt:", prompt);

    // Use Pollinations AI - completely FREE, no API key needed!
    const encodedPrompt = encodeURIComponent(prompt);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1280&height=720&nologo=true&seed=${Date.now()}`;

    console.log("Fetching image from Pollinations...");

    // Download the image from Pollinations
    const imageResponse = await fetch(pollinationsUrl);
    
    if (!imageResponse.ok) {
      throw new Error("Failed to generate image from Pollinations AI");
    }

    // Get the image as a blob
    const imageBlob = await imageResponse.blob();
    
    // Create a File object for UploadThing
    const fileName = `thumbnail-${Date.now()}.png`;
    const file = new File([imageBlob], fileName, { type: "image/png" });

    console.log("Uploading thumbnail to UploadThing...");

    // Upload to UploadThing
    const uploadResponse = await utapi.uploadFiles([file]);
    
    if (!uploadResponse[0]?.data?.ufsUrl) {
      throw new Error("Failed to upload thumbnail to storage");
    }

    const thumbnailUrl = uploadResponse[0].data.ufsUrl;
    console.log("Thumbnail uploaded successfully:", thumbnailUrl);

    return NextResponse.json({
      thumbnailUrl: thumbnailUrl,
      success: true,
    });
  } catch (error) {
    console.error("Error generating thumbnail:", error);
    return NextResponse.json(
      { error: "Failed to generate thumbnail. Please try again." },
      { status: 500 }
    );
  }
}
