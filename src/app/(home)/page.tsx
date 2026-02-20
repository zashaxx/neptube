"use client"

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import TrendingFeed from "../feed/trending/page";

export default function Home() {
  return <TrendingFeed />;
}
