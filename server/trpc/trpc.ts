import { TRPCError, initTRPC } from '@trpc/server';
import { Context } from './context';

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const authProcedure = publicProcedure.use(async (opts) => {
    if (!opts.ctx.user) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    return opts.next();
});