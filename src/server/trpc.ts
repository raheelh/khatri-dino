import { initTRPC } from '@trpc/server';
import { transformer } from '../shared/transformer';
import { Context } from './context';
import { context, reddit } from '@devvit/web/server';

/**
 * Initialization of tRPC backend.
 * This app only needs a minimal init route for the game shell.
 */
const t = initTRPC.context<Context>().create({
  transformer,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const appRouter = t.router({
  init: t.router({
    get: publicProcedure.query(async () => {
      const username = await reddit.getCurrentUsername();

      return {
        postId: context.postId,
        username,
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
