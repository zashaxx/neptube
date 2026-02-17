"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SearchIcon, X } from "lucide-react";

export const SearchInput = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/feed?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push("/feed");
    }
  };

  const handleClear = () => {
    setQuery("");
    router.push("/feed");
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-[520px]">
      <div className="relative w-full glow-ring rounded-lg transition-all">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search videos..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-10 py-2 rounded-lg border border-border/60 bg-muted/30 backdrop-blur-sm text-sm focus:outline-none placeholder:text-muted-foreground transition-all"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted rounded-md transition-colors"
          >
            <X className="size-3.5 text-muted-foreground" />
          </button>
        )}
      </div>
    </form>
  );
};