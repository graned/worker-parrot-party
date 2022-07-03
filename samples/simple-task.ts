/* eslint-disable no-console */
/* eslint-disable no-plusplus */
/* eslint-disable no-await-in-loop */
import { PoolParty } from '../src/PoolParty'

async function simple(loopLimit: number, msg: string) {
  let idx = 0
  const promisedTimeout = () =>
    new Promise((resolve) => {
      setTimeout(resolve, 500)
    })

  while (idx < loopLimit) {
    console.log(`>> HEAVY PROCESS IN THREAD: msg[${msg}]`)
    await promisedTimeout()
    idx++
  }
}

const poolPartyConfig = {
  partySize: 2,
  basePath: __dirname,
  task: simple,
  onSuccess: () => {
    console.log('all good in the hood!')
  },
  onError: (error: unknown) => {
    console.log('error', error)
  },
}

const poolParty: PoolParty = new PoolParty(poolPartyConfig)

poolParty.run([10, 'stuff-1'])
poolParty.run([50, 'stuff-3'])
poolParty.run([20, 'stuff-2'])
poolParty.run([42, 'stuff-42'])
poolParty.run([5, 'stuff-5'])
