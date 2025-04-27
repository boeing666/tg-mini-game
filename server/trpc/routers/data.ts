import { router, publicProcedure } from '../trpc'
import { z } from 'zod'
import prisma from '~/lib/prisma'

export const userRouter = router({
  getUsers: publicProcedure.input(
    z.object({
        deckSize: z.number().refine((val) => [4, 6, 8].includes(val), {
            message: "deckSize must be one of 4, 6, or 8",
        }),
    })).query(async ({ input }) => {
        const userStats = await prisma.statistics.findMany({
            where: {
                deckSize: input.deckSize,
            },
            select: {
                id: true,
                time: true,
                steps: true,
                date: true,
                trys: true,
                user: {
                    select: {
                        image: true,
                        name: true,
                    },
                },
            },
            orderBy: {
                time: 'asc',
            },
            take: 20,
        })
        return userStats
    }),
})