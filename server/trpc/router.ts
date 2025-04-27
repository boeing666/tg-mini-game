import { lazy } from '@trpc/server';
import { router } from './trpc';

export const appRouter = router({
    data: lazy(() => import('./routers/data')),
    user: lazy(() => import('./routers/user')),
});

export type AppRouter = typeof appRouter;