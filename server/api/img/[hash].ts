import { defineEventHandler, getRouterParam, sendError, createError } from 'h3'
import { readFile } from 'fs/promises'
import { resolve } from 'path'
import { decodeImageHash } from '~/utils/imageHash'

const IMAGE_URL = process.env.STATIC_FILES_BASE_URL as string;

export default defineEventHandler(async (event) => {
  const hash = getRouterParam(event, 'hash')
  if (!hash) {
    return sendError(event, createError({ statusCode: 400, statusMessage: 'Hash required' }))
  }

  const filename = decodeImageHash(hash)
  if (!filename) {
    return sendError(event, createError({ statusCode: 404, statusMessage: 'Image not found' }))
  }

  const imageUrl = `${IMAGE_URL}/${filename}`

  try {
    const response = await fetch(imageUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`)
    }
    const buffer = await response.arrayBuffer()
    const file = Buffer.from(buffer)

    event.node.res.setHeader('Content-Type', 'image/svg+xml')
    event.node.res.end(file)
  } catch (e) {
    return sendError(event, createError({ statusCode: 500, statusMessage: 'Error fetching or processing image' }))
  }
})