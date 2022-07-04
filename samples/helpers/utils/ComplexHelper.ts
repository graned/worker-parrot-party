/* eslint-disable class-methods-use-this */
import 'isomorphic-fetch'

export class ComplexHelper {
  async fetchToSite(url: string): Promise<Response> {
    return fetch(url)
  }
}
