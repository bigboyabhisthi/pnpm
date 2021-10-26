import path from 'path'
import assertProject from '@pnpm/assert-project'
import { MutatedProject, mutateModules } from '@pnpm/core'
import { preparePackages } from '@pnpm/prepare'
import rimraf from '@zkochan/rimraf'
import pathExists from 'path-exists'
import { testDefaults } from '../utils'

test('hard link local packages', async () => {
  const project1Manifest = {
    name: 'project-1',
    version: '1.0.0',
    dependencies: {
      'is-negative': '1.0.0',
    },
    devDependencies: {
      'dep-of-pkg-with-1-dep': '100.0.0',
    },
    peerDependencies: {
      'is-positive': '1.0.0',
    },
  }
  const project2Manifest = {
    name: 'project-2',
    version: '1.0.0',
    dependencies: {
      'is-positive': '1.0.0',
      'project-1': 'workspace:1.0.0',
    },
  }
  const projects = preparePackages([
    {
      location: 'project-1',
      package: project1Manifest,
    },
    {
      location: 'project-2',
      package: project2Manifest,
    },
  ])

  const importers: MutatedProject[] = [
    {
      buildIndex: 0,
      manifest: project1Manifest,
      mutation: 'install',
      rootDir: path.resolve('project-1'),
    },
    {
      buildIndex: 0,
      manifest: project2Manifest,
      mutation: 'install',
      rootDir: path.resolve('project-2'),
    },
  ]
  const workspacePackages = {
    'project-1': {
      '1.0.0': {
        dir: path.resolve('project-1'),
        manifest: project1Manifest,
      },
    },
    'project-2': {
      '1.0.0': {
        dir: path.resolve('project-2'),
        manifest: project2Manifest,
      },
    },
  }
  await mutateModules(importers, await testDefaults({
    hardLinkLocalPackages: true,
    workspacePackages,
  }))

  await projects['project-1'].has('is-negative')
  await projects['project-1'].has('dep-of-pkg-with-1-dep')
  await projects['project-1'].hasNot('is-positive')

  await projects['project-2'].has('is-positive')
  await projects['project-2'].has('project-1')

  const rootModules = assertProject(process.cwd())
  const lockfile = await rootModules.readLockfile()
  expect(lockfile.packages['local/project-1_is-positive@1.0.0']).toEqual({
    resolution: {
      directory: 'project-1',
      type: 'directory',
    },
    id: 'local/project-1',
    name: 'project-1',
    version: '1.0.0',
    peerDependencies: {
      'is-positive': '1.0.0',
    },
    dependencies: {
      'is-negative': '1.0.0',
      'is-positive': '1.0.0',
    },
    dev: false,
  })

  await rimraf('node_modules')
  await rimraf('project-1/node_modules')
  await rimraf('project-2/node_modules')

  await mutateModules(importers, await testDefaults({
    frozenLockfile: true,
    hardLinkLocalPackages: true,
    workspacePackages,
  }))

  await projects['project-1'].has('is-negative')
  await projects['project-1'].has('dep-of-pkg-with-1-dep')
  await projects['project-1'].hasNot('is-positive')

  await projects['project-2'].has('is-positive')
  await projects['project-2'].has('project-1')
})

test('hard link local packages and relink them after build', async () => {
  const project1Manifest = {
    name: 'project-1',
    version: '1.0.0',
    dependencies: {
      'is-negative': '1.0.0',
    },
    devDependencies: {
      'dep-of-pkg-with-1-dep': '100.0.0',
    },
    peerDependencies: {
      'is-positive': '1.0.0',
    },
    scripts: {
      prepublishOnly: 'touch main.js',
    },
  }
  const project2Manifest = {
    name: 'project-2',
    version: '1.0.0',
    dependencies: {
      'is-positive': '1.0.0',
      'project-1': 'workspace:1.0.0',
    },
  }
  const projects = preparePackages([
    {
      location: 'project-1',
      package: project1Manifest,
    },
    {
      location: 'project-2',
      package: project2Manifest,
    },
  ])

  const importers: MutatedProject[] = [
    {
      buildIndex: 0,
      manifest: project1Manifest,
      mutation: 'install',
      rootDir: path.resolve('project-1'),
    },
    {
      buildIndex: 0,
      manifest: project2Manifest,
      mutation: 'install',
      rootDir: path.resolve('project-2'),
    },
  ]
  const workspacePackages = {
    'project-1': {
      '1.0.0': {
        dir: path.resolve('project-1'),
        manifest: project1Manifest,
      },
    },
    'project-2': {
      '1.0.0': {
        dir: path.resolve('project-2'),
        manifest: project2Manifest,
      },
    },
  }
  await mutateModules(importers, await testDefaults({
    hardLinkLocalPackages: true,
    workspacePackages,
  }))

  await projects['project-1'].has('is-negative')
  await projects['project-1'].has('dep-of-pkg-with-1-dep')
  await projects['project-1'].hasNot('is-positive')

  await projects['project-2'].has('is-positive')
  await projects['project-2'].has('project-1')

  expect(await pathExists(path.resolve('project-2/node_modules/project-1/main.js'))).toBeTruthy()

  const rootModules = assertProject(process.cwd())
  const lockfile = await rootModules.readLockfile()
  expect(lockfile.packages['local/project-1_is-positive@1.0.0']).toEqual({
    resolution: {
      directory: 'project-1',
      type: 'directory',
    },
    id: 'local/project-1',
    name: 'project-1',
    version: '1.0.0',
    peerDependencies: {
      'is-positive': '1.0.0',
    },
    dependencies: {
      'is-negative': '1.0.0',
      'is-positive': '1.0.0',
    },
    dev: false,
  })

  await rimraf('node_modules')
  await rimraf('project-1/main.js')
  await rimraf('project-1/node_modules')
  await rimraf('project-2/node_modules')

  await mutateModules(importers, await testDefaults({
    frozenLockfile: true,
    hardLinkLocalPackages: true,
    workspacePackages,
  }))

  await projects['project-1'].has('is-negative')
  await projects['project-1'].has('dep-of-pkg-with-1-dep')
  await projects['project-1'].hasNot('is-positive')

  await projects['project-2'].has('is-positive')
  await projects['project-2'].has('project-1')

  expect(await pathExists(path.resolve('project-2/node_modules/project-1/main.js'))).toBeTruthy()
})
