# Worker Parrot Party!

This library has as purpose the creation of a pool of NodeJs workers (Parrots) using Typescript.

<img src="./pictures/parrot.gif" width="20%" height="50%"><img src="./pictures/parrot.gif" width="20%" height="50%"><img src="./pictures/parrot.gif" width="20%" height="50%"><img src="./pictures/parrot.gif" width="20%" height="50%">

## Installation

NPM

```
npm install --save worker-parrot-party
```

## Motivation

The main purpose of this library is to simplify the usage of Worker Threads with typescript. Additionally, to offer a more flexible way to create worker threads with more complex logic.

## How it works

The library dinamically creates a worker script typescript file and compiles this on runtime. Finally we use the Worker Node js library to spawn a thread with the automatically generated file.

NOTE: At the moment, all Parrots in the pool will share the same logic of execution. There is no way to dinamically change the logic

## Usage

Import declaration

### Javascript

```javascript
const workerParrotParty = require('worker-parrot-party')
```

### Typescript

```javascript
import { PoolParty } from 'worker-parrot-party'
```

## Examples

### Typescript

```javascript
import { PoolParty } from 'worker-parrot-party'

// Define an async function task to execute in the threads
async function veryComplexTask (myVar: string): string {
    ...// my complex implementation
}

// Define the pool configuration
const poolPartyConfig = {
    partySize: 2, // number of parrots to spawn
    basePath: __dirname, // current directory
    task: veryComplexTask,
    onSuccess: (result: any) => { console.log('All good in the hood!', result: any) },
    onError: (error: any) => console.error
}

// Create Instance
const poolParty: PoolParty = new PoolParty(poolPartyConfig)

// Spawn the parrot in the pool
poolParty.spawnParrots().then(() => {
    // Run your task in a thread
    poolParty.run('myNiceVariable')
})

// NOTE: You may use async/await
```

### Complex process

Sometimes we need to be able to do a very complex process that may require helper functions.

Scenario.
Let's say you need to process thousands of data and need to make a request for all of those results. You can make the definition of all of that process and "inject" the logic to the worker thread, to delegate that logic to an independent process.

```javascript
import { PoolParty } from 'worker-parrot-party'

// ****************************************************
// This is the isolated logic we want our worker to execute
import { SomeLibrary } from 'SomeLibrary'

async function helperFunction1 () {...}
function helperFunction2() {...}

// Define an async function task to execute in the threads
async function veryComplexTask (myVar: string): string {
    await helperFunction1()
    helperFunction2()
    ...// my complex implementation
}
// ****************************************************

// Define the pool configuration
const poolPartyConfig = {
    partySize: 2, // number of parrots to spawn
    basePath: __dirname, // current directory
    task: veryComplexTask,
    libraryDeclaration: [
        {
            name: 'SomeLibrary',
            importDeclaration: '{ SomeLibrary }'
        }
    ],
    helpers: [helperFunction1, helperFunction2],
    onSuccess: (result: any) => { console.log('All good in the hood!', result: any) },
    onError: (error: any) => console.error
}

// Create Instance
const poolParty: PoolParty = new PoolParty(poolPartyConfig)

// Spawn the parrot in the pool
poolParty.spawnParrots().then(() => {
    // Run your task in a thread
    poolParty.run('myNiceVariable')
})
```

## Pool configuration variables

- task [**_REQUIRED_**]: The function to be executed by the worker parrots.

- partySize [**_REQUIRED_**]: The number of parrots to be used.

- onSuccess [**_REQUIRED_**]: Callback to be executed when all the tasks are completed.

- onError [**_REQUIRED_**]: Callback to be executed when an error occurs.

- retryInterval [**_OPTIONAL_**]: Interval in milliseconds, for the pool to retry a task. If not specified the default value is 1s.

- basePath [**_OPTIONAL_**]: Path to where the automatic generated scripts are stored. Additionally the compiled script is also stored in this path. Default value is `./`.

- compiledFolderName [**_OPTIONAL_**]: The name of the folder where the compiled scripts are stored. Default value is `./worker-script-dist`.

- libraryDeclaration [**_OPTIONAL_**]: Specification how a certain library should be imported into the worker script. Default is `empty string`.

- helpers [**_OPTIONAL_**]: Specification of helper function to be used in the worker script.

- resourceLimits [**_OPTIONAL_**]: Worker threads resource limits.

## Known issues

- Compiled typescript files, not being cleaned. WORKAROUND: You may just delete the auto generated folders to "clean" the state
