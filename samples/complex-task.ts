/* eslint-disable no-restricted-syntax */
/* eslint-disable no-console */
/* eslint-disable no-plusplus */
/* eslint-disable no-await-in-loop */
import { PoolParty, PoolPartyConfig } from '../src/PoolParty'
import { pageFetcherTask, responseParser } from './helpers/tasks/ComplexTask'

const poolPartyConfig: PoolPartyConfig = {
  partySize: 2,
  basePath: __dirname,
  libraryDeclaration: [
    {
      // NOTE: This path is relative to the worker script generated folder
      name: '../helpers/utils/ComplexHelper',
      importDeclaration: '* as ch',
    },
  ],
  helpers: [responseParser],
  task: pageFetcherTask,
  onSuccess: () => {
    console.log('all good in the hood!')
  },
  onError: (error: unknown) => {
    console.log('error', error)
  },
} as PoolPartyConfig

const poolParty: PoolParty = new PoolParty(poolPartyConfig)

// nicolas cage meme pages
const nicolasCageUrls: Array<string> = ['https://www.dw.com/de/themen/s-9077']

// nicolas cage meme pages
const memesUrls: Array<string> = [
  'https://www.pocket-lint.com/de-de/software/news/152027-diese-meme-existieren-nicht-und-werden-von-ai-erstellt',
]

poolParty
  .spawnParrots()
  .then(() => {
    poolParty.run([nicolasCageUrls])
    poolParty.run([memesUrls])
  })
  .catch(console.error)
