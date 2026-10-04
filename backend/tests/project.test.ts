import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { projectInfo } from '../src/project.js'

describe('projectInfo', () => {
  it('describes the CreatorFlow backend runtime', () => {
    assert.deepEqual(projectInfo, {
      name: 'CreatorFlow backend',
      runtime: 'node',
      nodeMajor: 24,
    })
  })
})
