import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ isBanned: false });
    }

    const user = await db
      .select({ isBanned: users.isBanned, banReason: users.banReason })
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .limit(1);

    if (!user[0]) {
      return NextResponse.json({ isBanned: false });
    }

    return NextResponse.json({
      isBanned: user[0].isBanned,
      banReason: user[0].banReason,
    });
  } catch (error) {
    console.error("Error checking banned status:", error);
    return NextResponse.json({ isBanned: false });
  }
}
