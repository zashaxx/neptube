import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "../init";
import { usersRouter } from "./users";
import { videosRouter } from "./videos";
import { commentsRouter } from "./comments";
import { subscriptionsRouter } from "./subscriptions";
import { adminRouter } from "./admin";
import { historyRouter } from "./history";
import { playlistsRouter } from "./playlists";
import { notificationsRouter } from "./notifications";
import { reportsRouter } from "./reports";
import { communityRouter } from "./community";
import { youtubeRouter } from "./youtube";

export const appRouter = createTRPCRouter({
  // Keep hello for testing
  hello: baseProcedure
    .input(
      z.object({
        text: z.string(),
      })
    )
    .query((opts) => {
      return {
        greeting: `hello ${opts.input.text}`,
      };
    }),

  // Sub-routers
  users: usersRouter,
  videos: videosRouter,
  comments: commentsRouter,
  subscriptions: subscriptionsRouter,
  admin: adminRouter,
  history: historyRouter,
  playlists: playlistsRouter,
  notifications: notificationsRouter,
  reports: reportsRouter,
  community: communityRouter,
  youtube: youtubeRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;