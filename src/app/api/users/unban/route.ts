import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

// POST /api/users/unban - Unban a user by Clerk ID or database ID
// This is an emergency endpoint - remove after use in production
export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required (can be Clerk ID or database UUID)" },
        { status: 400 }
      );
    }

    // Check if it's a UUID or Clerk ID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

    const updated = await db
      .update(users)
      .set({
        isBanned: false,
        banReason: null,
        updatedAt: new Date(),
      })
      .where(isUUID ? eq(users.id, userId) : eq(users.clerkId, userId))
      .returning();

    if (!updated[0]) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `User ${updated[0].name} has been unbanned`,
      user: {
        id: updated[0].id,
        clerkId: updated[0].clerkId,
        name: updated[0].name,
        isBanned: updated[0].isBanned,
      },
    });
  } catch (error) {
    console.error("Error unbanning user:", error);
    return NextResponse.json(
      { error: "Failed to unban user" },
      { status: 500 }
    );
  }
}

// GET /api/users/unban?userId=xxx - Alternative GET method for easy browser access
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { 
        error: "userId query parameter is required",
        usage: "/api/users/unban?userId=YOUR_CLERK_ID_OR_UUID"
      },
      { status: 400 }
    );
  }

  // Check if it's a UUID or Clerk ID
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

  const updated = await db
    .update(users)
    .set({
      isBanned: false,
      banReason: null,
      updatedAt: new Date(),
    })
    .where(isUUID ? eq(users.id, userId) : eq(users.clerkId, userId))
    .returning();

  if (!updated[0]) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    message: `User ${updated[0].name} has been unbanned`,
    user: {
      id: updated[0].id,
      clerkId: updated[0].clerkId,
      name: updated[0].name,
      isBanned: updated[0].isBanned,
    },
  });
}
