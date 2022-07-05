import { Worker, WorkerOptions } from 'worker_threads'
import { v4 } from 'uuid'
import { Logger } from 'tslog'

/**
 * This interface represents the configuration of the worker taken from the official site:
 * https://nodejs.org/api/worker_threads.html#new-workerfilename-options
 */
export interface ParrotConfig {
  execFilePath: string
  resourceLimits?: {
    maxOldGenerationSizeMb: number
    maxYoungGenerationSizeMb: number
    codeRangeSizeMb: number
    stackSizeMb: number
  }
}

export class Parrot {
  private readonly _logger: Logger = new Logger({ name: 'Parrot' })

  private readonly _id: string

  private _workerThread: Worker

  constructor(private readonly _parrotConfig: ParrotConfig) {
    this._id = v4()
    const { execFilePath, ...resourceLimits } = this._parrotConfig
    const opts: WorkerOptions = { resourceLimits } as WorkerOptions
    this._workerThread = new Worker(execFilePath, opts)
  }

  // eslint-disable-next-line class-methods-use-this
  private _messageHandler(resolve, workerThread: Worker) {
    return function handler(executionResult) {
      resolve(executionResult)
      workerThread.removeListener('message', handler)
    }
  }

  async runTask(args: Array<unknown>): Promise<unknown> {
    return new Promise((resolve) => {
      this._workerThread.once('message', this._messageHandler(resolve, this._workerThread))

      this._logger.info(`[${this.pid}] Parrot will execute the task`)
      this._workerThread.postMessage({ args, pid: this._id })
    })
  }

  kill(): void {
    this._workerThread.terminate()
  }

  get pid(): string {
    return this._id
  }
}
