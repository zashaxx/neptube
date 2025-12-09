import { db } from "@/db";
import { users } from "@/db/schema";
import { NextResponse } from "next/server";

// GET /api/users - List all users (for emergency admin access)
// Remove this endpoint in production!
export async function GET() {
  try {
    const allUsers = await db
      .select({
        id: users.id,
        clerkId: users.clerkId,
        name: users.name,
        role: users.role,
        isBanned: users.isBanned,
        banReason: users.banReason,
      })
      .from(users);

    return NextResponse.json({
      count: allUsers.length,
      users: allUsers,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
