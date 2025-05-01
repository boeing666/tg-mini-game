import { defineEventHandler, getRouterParam, sendError, createError } from 'h3'
import { readFile } from 'fs/promises'
import { resolve } from 'path'
import { decodeImageHash } from '~/utils/imageHash'

const IMAGE_DIR = 'public/images'

export default defineEventHandler(async (event) => {
  const hash = getRouterParam(event, 'hash')
  if (!hash) {
    return sendError(event, createError({ statusCode: 400, statusMessage: 'Hash required' }))
  }

  const filename = decodeImageHash(hash)
  if (!filename) {
    return sendError(event, createError({ statusCode: 404, statusMessage: 'Image not found' }))
  }

  const filepath = resolve(IMAGE_DIR, filename)
  try {
    const file = await readFile(filepath)
    event.node.res.setHeader('Content-Type', 'image/svg+xml')
    return file
  } catch (e) {
    return sendError(event, createError({ statusCode: 500, statusMessage: 'Error reading image' }))
  }
})