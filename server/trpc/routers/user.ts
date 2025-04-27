import { TRPCError } from '@trpc/server'
import { router, publicProcedure, authProcedure } from '../trpc'
import { parseTelegramInitData, validateTelegramData } from '~/utils/telegram'
import { z } from 'zod'
import jwt from "jsonwebtoken"
import crypto from "crypto"
import prisma from '~/lib/prisma'

function encryptDeckValues(deckValues: number[], secret: string): string {
  const json = JSON.stringify(deckValues);
  const cipher = crypto.createCipheriv('aes-256-cbc', crypto.scryptSync(secret, 'salt', 32), Buffer.alloc(16, 0));
  const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  return encrypted.toString('hex');
}

function decryptDeckValues(encryptedDeckValues: string, secret: string): number[] {
  const decipher = crypto.createDecipheriv('aes-256-cbc', crypto.scryptSync(secret, 'salt', 32), Buffer.alloc(16, 0));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedDeckValues, 'hex')), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
}

function updatePlayerData(
    event: any,
    userId: Number, 
    deckSize: number,
    deckValues: string,
    steps: number,
    lastcell: number,
    startTime: number ) {

  const token = jwt.sign( { 
    id: userId,
    deckSize: deckSize,
    deckValues: deckValues,
    steps: steps,
    lastcell: lastcell,
    startTime: startTime,
  }, jwt_token, { expiresIn: '24h' } )

  setCookie(event, 'tg-mini-game', token, {
    httpOnly: true,
    sameSite: true,
    maxAge: 60 * 60 * 24 // 1 day
  });
}

function generateDeckValues(deckCells: number) {
  if (deckCells % 2 !== 0) {
    throw new Error("deckCells must be an even number");
  }

  const maxUniqueValues = 32;
  if (deckCells / 2 > maxUniqueValues) {
    throw new Error(`deckCells is too large. Maximum unique pairs allowed is ${maxUniqueValues * 2}`);
  }

  const uniqueValues = Array.from(
    { length: deckCells / 2 }, (_, i) => i + 1
  );

  const deckValues = [...uniqueValues, ...uniqueValues];

  for (let i = deckValues.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deckValues[i], deckValues[j]] = [deckValues[j], deckValues[i]];
  }

  return deckValues;
}

const jwt_token = process.env.JWT_SECRET as string

export const userRouter = router({
  startGame: authProcedure.input(
    z.object({
      deckSize: z.number().refine((val) => [4, 6, 8].includes(val), {
        message: "deckSize must be one of 4, 6, or 8",
      }),
    })
  ).query(async ({ input, ctx }) => {

    const encryptedDeck = generateDeckValues(input.deckSize * input.deckSize)
    const encryptedDeckValues = encryptDeckValues(encryptedDeck, jwt_token)

    updatePlayerData(
      ctx.event,
      ctx.user, 
      input.deckSize,
      encryptedDeckValues,
      0,
      -1,
      Date.now(),
    );

    return {
      success: true,
    }
  }),
  openCard: authProcedure.input(
    z.object({
      index: z.number().min(0).max(63),
    })
  ).query(async ({ input, ctx }) => {
    const userId = ctx.user
    const deckSize = ctx.jwt.deckSize as number
    const currentCell = input.index
    const lastCell = ctx.jwt.lastcell as number

    if (currentCell < 0 || currentCell > (deckSize * deckSize)) {
      throw new TRPCError({ code: 'PARSE_ERROR' })
    }

    const decryptedCells = decryptDeckValues(ctx.jwt.deckValues, jwt_token)
    const resultIndex = decryptedCells[currentCell]

    if (lastCell != -1) {
      if (decryptedCells[lastCell] === decryptedCells[currentCell]) {
        decryptedCells[lastCell] = -1
        decryptedCells[currentCell] = -1
        ctx.jwt.deckValues = encryptDeckValues(decryptedCells, jwt_token)
      }

      if (decryptedCells.every((cell) => cell === -1)) {
        const playedTime = Math.floor((Date.now() - ctx.jwt.startTime) / 1000);
        const existingStats = await prisma.statistics.findFirst({
          where: {
            userID: userId,
            deckSize: ctx.jwt.deckSize,
          },
        });
  
        if (existingStats) {
          await prisma.statistics.update({
            where: {
              id: existingStats.id,
            },
            data: {
              steps: Math.min(existingStats.steps, ctx.jwt.steps),
              time: Math.min(existingStats.time, playedTime),
              trys: existingStats.trys + 1,
            },
          });
        } else {
          await prisma.statistics.create({
            data: {
              userID: userId,
              deckSize: ctx.jwt.deckSize,
              steps: ctx.jwt.steps,
              time: playedTime,
              trys: 1,
            },
          });
        }
      } 
    }

    const encryptedDeckValues = encryptDeckValues(decryptedCells, jwt_token)

    updatePlayerData(
      ctx.event,
      ctx.user, 
      ctx.jwt.deckSize,
      encryptedDeckValues,
      ctx.jwt.steps + 1,
      lastCell != -1 ? -1 : currentCell,
      ctx.jwt.startTime,
    );

    return {
      image: resultIndex,
      success: true,
    }
  }),
  auth: publicProcedure.input(
    z.object({
      initData: z.string(),
      hash: z.string(),
    })
  ).mutation(async ({ input, ctx }) => {
    const { initData, hash } = input

    const parsedInitData = parseTelegramInitData(initData)
    if (!parsedInitData) {
      throw new TRPCError({ code: 'PARSE_ERROR' })
    }

    const bot_token = process.env.TG_BOT_TOKEN as string
    if (!validateTelegramData(hash, initData, bot_token)) {
      throw new TRPCError({ code: 'PARSE_ERROR' })
    }

    let user = await prisma.user.findUnique({
        where: {
          telegramID: parsedInitData.user.id,
        }
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          telegramID: parsedInitData.user.id,
          name: parsedInitData.user.first_name,
          image: parsedInitData.user.photo_url,
        },
      })
    }

    const token = jwt.sign( { 
      id: user.id, 
    }, jwt_token, { expiresIn: '24h' } )

    setCookie(ctx.event, 'tg-mini-game', token, {
        httpOnly: true,
        sameSite: true,
        maxAge: 60 * 60 * 24 // 1 day
    })

    return {
      success: true,
    }
  }),
})