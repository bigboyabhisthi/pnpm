import { promises as fs } from 'fs'
import path from 'path'
import { Cafs, FilesIndex } from '@pnpm/fetcher-base'

export default () => {
  return {
    directory: async function fetchFromLocal (
      cafs: Cafs,
      resolution: {
        directory: string
        type: 'directory'
      }
    ) {
      const filesIndex: FilesIndex = {}
      await mapDirectory(resolution.directory, resolution.directory, filesIndex)
      return { filesIndex }
    },
  }
}

async function mapDirectory (
  rootDir: string,
  currDir: string,
  index: FilesIndex
) {
  try {
    const files = await fs.readdir(currDir)
    await Promise.all(files.map(async (file) => {
      const fullPath = path.join(currDir, file)
      const stat = await fs.stat(fullPath)
      if (stat.isDirectory()) {
        await mapDirectory(rootDir, fullPath, index)
        return
      }
      if (stat.isFile()) {
        const relativePath = path.relative(rootDir, fullPath)
        index[relativePath] = {
          location: fullPath,
        } as any
      }
    }))
  } catch (err: any) { // eslint-disable-line
    if (err.code !== 'ENOENT') {
      throw err
    }
  }
}
