import { PoolParty, PoolPartyConfig } from '../src/PoolParty'
import 'isomorphic-fetch'

async function fetchToSite(url: string): Promise<Response> {
    return fetch(url);
}

async function pageFetcher(urlsToFetch: Array<string>): Promise<void> {
    for (const url of urlsToFetch) {
        const response = await fetchToSite(url)
        console.log(response.status)
        console.log(await response.json())
    }
}

const poolPartyConfig: PoolPartyConfig = {
    partySize: 2,
    basePath: __dirname,
    libraryDeclaration: [
        {
            name: 'isomorphic-fetch',
            importDeclaration: ''
        }
    ],
    helpers: [fetchToSite],
    task: pageFetcher,
    onSuccess: () => { console.log('all good in the hood!') },
    onError: (error: any) => { console.log('error', error) }
} as PoolPartyConfig

const poolParty: PoolParty = new PoolParty(poolPartyConfig)

// nicolas cage meme pages
const nicolasCageUrls: Array<string> = [
    'https://www.dw.com/de/themen/s-9077',
]

// nicolas cage meme pages
const memesUrls: Array<string> = [
    'https://www.pocket-lint.com/de-de/software/news/152027-diese-meme-existieren-nicht-und-werden-von-ai-erstellt',
]

poolParty.run([nicolasCageUrls])
poolParty.run([memesUrls])
