"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Home,
  Search,
  Upload,
  Video,
  Film,
  History,
  ThumbsUp,
  ListVideo,
  TrendingUp,
  Zap,
  Sun,
  Moon,
  Users,
  Palette,
  Keyboard,
} from "lucide-react";
import { useTheme } from "next-themes";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const router = useRouter();
  const { setTheme, theme } = useTheme();

  // Global keyboard shortcut: "/" or Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // "/" key (only when not focused on input/textarea)
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(
          (e.target as HTMLElement)?.tagName
        ) &&
        !(e.target as HTMLElement)?.isContentEditable
      ) {
        e.preventDefault();
        setOpen(true);
      }

      // Ctrl+K / Cmd+K
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navigate = useCallback(
    (path: string) => {
      setOpen(false);
      setSearchValue("");
      router.push(path);
    },
    [router]
  );

  const handleSearch = useCallback(() => {
    if (searchValue.trim()) {
      navigate(`/feed?q=${encodeURIComponent(searchValue.trim())}`);
    }
  }, [searchValue, navigate]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Type a command or search..."
        value={searchValue}
        onValueChange={setSearchValue}
        onKeyDown={(e) => {
          if (e.key === "Enter" && searchValue.trim()) {
            handleSearch();
          }
        }}
      />
      <CommandList>
        <CommandEmpty>
          {searchValue.trim() ? (
            <button
              onClick={handleSearch}
              className="flex items-center gap-2 mx-auto text-primary hover:underline"
            >
              <Search className="h-4 w-4" />
              Search for &quot;{searchValue}&quot;
            </button>
          ) : (
            "No results found."
          )}
        </CommandEmpty>

        {/* Quick Navigation */}
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => navigate("/")}>
            <Home className="mr-2 h-4 w-4" />
            <span>Home</span>
            <kbd className="ml-auto text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
              H
            </kbd>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/feed")}>
            <TrendingUp className="mr-2 h-4 w-4" />
            <span>Explore Feed</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/shorts")}>
            <Zap className="mr-2 h-4 w-4" />
            <span>Shorts</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/feed/subscriptions")}>
            <Users className="mr-2 h-4 w-4" />
            <span>Subscriptions</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Library */}
        <CommandGroup heading="Library">
          <CommandItem onSelect={() => navigate("/history")}>
            <History className="mr-2 h-4 w-4" />
            <span>Watch History</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/liked")}>
            <ThumbsUp className="mr-2 h-4 w-4" />
            <span>Liked Videos</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/playlists")}>
            <ListVideo className="mr-2 h-4 w-4" />
            <span>Playlists</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Creator */}
        <CommandGroup heading="Creator">
          <CommandItem onSelect={() => navigate("/studio/upload")}>
            <Upload className="mr-2 h-4 w-4" />
            <span>Upload Video</span>
          </CommandItem>
          <CommandItem
            onSelect={() => navigate("/studio/upload?type=short")}
          >
            <Film className="mr-2 h-4 w-4" />
            <span>Upload Short</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/studio")}>
            <Video className="mr-2 h-4 w-4" />
            <span>Creator Studio</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Actions */}
        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => {
              setTheme(theme === "dark" ? "light" : "dark");
              setOpen(false);
            }}
          >
            {theme === "dark" ? (
              <Sun className="mr-2 h-4 w-4" />
            ) : (
              <Moon className="mr-2 h-4 w-4" />
            )}
            <span>Toggle {theme === "dark" ? "Light" : "Dark"} Mode</span>
          </CommandItem>
          <CommandItem disabled>
            <Palette className="mr-2 h-4 w-4" />
            <span>Change Accent Color</span>
            <span className="ml-auto text-[10px] text-muted-foreground">
              Soon
            </span>
          </CommandItem>
          <CommandItem disabled>
            <Keyboard className="mr-2 h-4 w-4" />
            <span>Keyboard Shortcuts</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
