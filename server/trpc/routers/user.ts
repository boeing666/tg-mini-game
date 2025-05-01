import { TRPCError } from '@trpc/server'
import { router, publicProcedure, authProcedure } from '../trpc'
import { parseTelegramInitData, validateTelegramData } from '~/utils/telegram'
import { z } from 'zod'
import jwt from "jsonwebtoken"
import crypto from "crypto"
import prisma from '~/lib/prisma'
import { encodeImagePath } from '~/utils/imageHash'

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
    startTime: number ) {

  const token = jwt.sign( { 
    id: userId,
    deckSize: deckSize,
    deckValues: deckValues,
    steps: steps,
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
    { length: deckCells / 2 }, 
    () => Math.floor(Math.random() * 132) + 1
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
    const generatedDeck = generateDeckValues(input.deckSize * input.deckSize)
    const encryptedDeckValues = encryptDeckValues(generatedDeck, jwt_token)

    const paths = generatedDeck.map((value) => {
      const imagePath = `${value}.svg` // Adjust the path as needed
      return encodeImagePath(imagePath)
    })

    updatePlayerData(
      ctx.event,
      ctx.user, 
      input.deckSize,
      encryptedDeckValues,
      0,
      Math.floor(Date.now() / 1000),
    );

    return {
      paths,
      success: true,
    }
  }),
  openCards: authProcedure.input(
    z.object({
      index1: z.number().min(0).max(63),
      index2: z.number().min(0).max(63),
    })
  ).query(async ({ input, ctx }) => {
    const userId = ctx.user
    const deckSize = ctx.jwt.deckSize as number
    const cell1 = input.index1 as number
    const cell2 = input.index2 as number

    [cell1, cell2].forEach(cell => {
      if (cell < 0 || cell >= (deckSize * deckSize)) {
        throw new TRPCError({ code: 'PARSE_ERROR' });
      }
    });

    ctx.jwt.steps += 2

    const decryptedCells = decryptDeckValues(ctx.jwt.deckValues, jwt_token)

    if (decryptedCells[cell1] === decryptedCells[cell2]) {
      decryptedCells[cell1] = -1
      decryptedCells[cell2] = -1
      ctx.jwt.deckValues = encryptDeckValues(decryptedCells, jwt_token)

      if (decryptedCells.every((cell) => cell === -1)) {
        const playedTime = Math.floor((Date.now() / 1000)) - ctx.jwt.startTime;
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

    updatePlayerData(
      ctx.event,
      ctx.user, 
      ctx.jwt.deckSize,
      ctx.jwt.deckValues,
      ctx.jwt.steps,
      ctx.jwt.startTime,
    );

    return {
      success: decryptedCells[cell1] === decryptedCells[cell2],
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