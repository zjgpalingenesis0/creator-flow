import type { FastifyPluginAsync } from 'fastify'

import { toAssetResponse } from '../schemas/assets.js'
import type { AssetService } from '../services/assets.js'
import { ImageRejectedError } from '../services/images.js'

export interface AssetRoutesOptions {
  service: AssetService
  createAssetUrl(storageKey: string): Promise<string>
}

export const assetRoutes: FastifyPluginAsync<AssetRoutesOptions> = async (app, options) => {
  app.post(
    '/',
    {
      prefixTrailingSlash: 'both',
      preHandler: app.requireCurrentUser,
    },
    async (request, reply) => {
      if (!request.isMultipart()) {
        return reply.code(422).send({ message: '请使用 multipart/form-data 上传图片' })
      }

      const file = await request.file()
      if (!file || file.fieldname !== 'file') {
        return reply.code(422).send({ message: '请选择要上传的图片' })
      }

      let data: Buffer
      try {
        data = await file.toBuffer()
      } catch (error) {
        if (error instanceof app.multipartErrors.RequestFileTooLargeError) {
          return reply.code(413).send({ message: '文件超过 20 MB 上限' })
        }
        throw error
      }

      try {
        const asset = await options.service.createFromBytes({
          userId: request.currentUser.id,
          data,
          kind: 'original',
          source: 'upload',
        })
        const url = await options.createAssetUrl(asset.storageKey)
        return reply.code(201).send(toAssetResponse(asset, url))
      } catch (error) {
        if (error instanceof ImageRejectedError) {
          return reply.code(422).send({ message: error.message })
        }
        throw error
      }
    },
  )
}
