/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable class-methods-use-this */
import * as ch from '../utils/ComplexHelper'

export async function responseParser(response: Response): Promise<unknown> {
  console.log('Response status', response.status)
  let jsonResponse

  try {
    jsonResponse = await response.json()
  } catch (error) {
    console.log('> error while getting response as json', error)
  }

  return jsonResponse
}

export async function pageFetcherTask(urlsToFetch: Array<string>): Promise<void> {
  for (const url of urlsToFetch) {
    const complexHelper = new ch.ComplexHelper()
    const response = await complexHelper.fetchToSite(url)
    await responseParser(response)
  }
}
