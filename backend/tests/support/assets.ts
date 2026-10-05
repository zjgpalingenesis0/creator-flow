import type { AssetService } from '../../src/services/assets.js'

const unusedAssetService: AssetService = {
  async createFromBytes() {
    throw new Error('Asset service is not used in this test')
  },
}

export const testAssetOptions = {
  assetService: unusedAssetService,
  async createAssetUrl() {
    throw new Error('Asset URL factory is not used in this test')
  },
}
