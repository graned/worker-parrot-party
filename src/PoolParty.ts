import { Logger } from 'tslog'
import { Parrot } from './Parrot'
import { NoIdleParrotError, CustomErrors } from './CustomErrors'
import { ScriptManager } from './ScriptManager'

/**
 * This interface represents the configuration of the PoolParty. 
 * - task: The function to be executed by the parrots.
 * - partySize: The number of parrots to be used.
 * - basePath: Path to where the automatic generated scripts are stored.
 * - compiledFolderName: The name of the folder where the compiled scripts are stored.
 * - libraryDeclaration: Definition of libraries to import to the worker script.
 * - helpers: Definition of helper functions to be used in the worker script.
 * - resourceLimits: Worker threads resource limits.
 * - onSuccess: Callback to be executed when all the tasks are completed.
 * - onError: Callback to be executed when an error occurs.
 */
export interface PoolPartyConfig {
  task: Function
  partySize: number
  retryInterval?: number
  basePath?: string
  compiledFolderName?: string
  libraryDeclaration?: Array<{ name: string, importDeclaration: string }>
  helpers?: Array<Function>
  resourceLimits?: {
    maxOldGenerationSizeMb: number
    maxYoungGenerationSizeMb: number
    codeRangeSizeMb: number
    stackSizeMb: number
  }
  onSuccess(result: any): any
  onError(error: any): any
}

class Task {
  constructor(private readonly _taskArgs) { }

  get taskArgs() {
    return this._taskArgs
  }
}

export class PoolParty {
  private readonly _logger: Logger = new Logger({ name: 'PoolParty' })
  private readonly _parrotIdleQueue: Array<Parrot> = []
  private readonly _retryTaskQueue: Array<Task> = []
  private _retryInterval: NodeJS.Timer = null
  private _executionScriptFilePath: string

  constructor(
    private readonly _poolPartyConfig: PoolPartyConfig
  ) {
    const scriptManager: ScriptManager = new ScriptManager(
      this._poolPartyConfig.compiledFolderName || './worker-script-dist',
      this._poolPartyConfig.basePath || './'
    )

    this._executionScriptFilePath = scriptManager.createAndCompileExecutionScript(
      this._poolPartyConfig.task,
      this._poolPartyConfig.helpers,
      this._poolPartyConfig.libraryDeclaration
    )
    this._spawnParrots(this._executionScriptFilePath)
  }

  /**
   * Function that sapwns the worker parrots based on the configuration size provided.
   * @param executionFilePath Path to the execution script
   */
  private _spawnParrots(executionFilePath: string): void {
    while (this._parrotIdleQueue.length < this._poolPartyConfig.partySize) {
      const parrot: Parrot = new Parrot({
        execFilePath: executionFilePath,
        resourceLimits: this._poolPartyConfig.resourceLimits
      })

      this._logger.info(`Spawn parrot [${parrot.pid}]`)
      this._parrotIdleQueue.push(parrot)
    }
  }

  /**
   * Function thta returns an idle parrot, if there is no idle, throws a NoIdleParrotError.
   * @returns {Parrot}
   */
  private _getIdleParrot(): Parrot {
    const workerParrot: Parrot | undefined = this._parrotIdleQueue.shift()
    if (workerParrot) {
      return workerParrot
    }

    throw new NoIdleParrotError('No idle parrot found')
  }

  /**
   * Function to schedule a retry of tasks, if there are no idle parrots. As soon as a parrot becomes idle, the task is
   * executed.
   * @param retryTask Task to be retried
   */
  private _scheduleTaskToRetry(retryTask: Task): void {
    this._retryTaskQueue.push(retryTask)

    if (this._retryInterval == null) {
      this._retryInterval = setInterval(() => {
        if (this._parrotIdleQueue.length > 0) {
          const task: Task = this._retryTaskQueue.shift()
          this.run(task.taskArgs)

          if (this._retryTaskQueue.length === 0) {
            clearInterval(this._retryInterval)
          }
        }
      }, this._poolPartyConfig.retryInterval || 1000)
    }
  }

  /**
   * Function that Handles Parrot errors and makes sure to spawn a new parrot if the error is not a NoIdleParrotError.
   * Additionally, kills the parrot instance that caused the error.
   * 
   * @param parrot Worker parrot instance that throwed the error
   * @param parrotError Error that was thrown by the parrot
   */
  private _handleParrotError(parrot: Parrot, parrotError: CustomErrors): void {
    this._logger.fatal(`Parrot [${parrot.pid}] crashed due to error, spawning new parrot`)
    this._logger.error('Error: ' + parrotError)

    // Terminates the process to avoid memory leaks
    parrot.kill()

    const recoveryParrot: Parrot = new Parrot({
      execFilePath: this._executionScriptFilePath,
      resourceLimits: this._poolPartyConfig.resourceLimits
    })

    this._logger.info(`Spawn new parrot [${recoveryParrot.pid}]`)
    this._parrotIdleQueue.push(recoveryParrot)
    this._poolPartyConfig.onError(parrotError)
  }

  /**
   * Schedules a task to be retryed within the configured retry interval.
   * @param taskArgs Arguments to be passed to the task
   */
  private _handleTaskRetry(taskArgs: Array<any>): void {
    this._logger.info('No idle parrot found, spawning new parrot')
    const retryTask: Task = new Task(taskArgs)

    this._scheduleTaskToRetry(retryTask)
  }

  /**
   * 
   * @param args Arguments to be passed to the task function
   * @returns A Promise that resolves to the result of the task function. Additionally calls the onSuccess function 
   * if provided. If there is an error during the task function execution, calls the onError function if provided.
   * 
   * Finally, if there are no idle parrots, the task is added to the retry queue and waits until there is an idle parrot.
   * 
   * Furthermore, when an error occurs and if the error is not identified as a NoIdleParrotError, the onError function is
   * called, and we spawn a new parrot, since the error causes the parrot to be unavailable for new tasks.
   */
  async run(args: Array<any>): Promise<Object> {
    let parrotExecResult: Object = {}
    let parrotWorker: Parrot

    try {
      parrotWorker = this._getIdleParrot()
      parrotExecResult = await parrotWorker.runTask(args)

      this._poolPartyConfig.onSuccess(parrotExecResult)
      this._parrotIdleQueue.push(parrotWorker)
    } catch (parrotError) {
      const error: CustomErrors = parrotError as CustomErrors

      if (parrotError.type === 'NO_IDLE_PARROT_ERROR') {
        this._handleTaskRetry(args)
      } else {
        this._handleParrotError(parrotWorker, error)
      }
    }

    return parrotExecResult
  }
}