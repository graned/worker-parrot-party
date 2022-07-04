/* eslint-disable no-await-in-loop */
/* eslint-disable class-methods-use-this */
import * as path from 'path'
import * as fs from 'fs'
import * as tsc from 'tsc-prog'

enum FILE_EXT {
  TS = '.ts',
  JS = '.js',
}

/**
 * Class in charge of managing the worker scripts. It is target to create the TS file to use for the workers and
 * compile it, since Workers do not support Typescript files.
 */
export class ScriptManager {
  constructor(private readonly _outDir: string, private readonly _basePath: string) {}

  /**
   * This function will compile the typescript file and create a plain JS file, that will be
   * used as a worker script.
   * @param fileName Name of the file to compile
   * @param filePath Path where the file is located
   */
  private _compileScriptFile(fileName: string, folderPath: string): void {
    const fullFilePath: string = path.join(folderPath, fileName)

    tsc.build({
      basePath: this._basePath,
      // REVISIT: Allow to specify the tsconfig file
      // configFilePath: path.join(__dirname, 'tsconfig.json'),
      compilerOptions: {
        module: 'commonjs',
        moduleResolution: 'node',
        pretty: true,
        sourceMap: true,
        baseUrl: this._basePath,
        outDir: this._outDir,
        declaration: true,
        skipDefaultLibCheck: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        skipLibCheck: true,
      },
      include: [fullFilePath],
      exclude: ['**/*.test.ts', '**/*.spec.ts'],
    })
  }

  /**
   * This function will delete the previous script file, if it exists.
   * We do this in order to ensure that we only have a single execution script per pool of workers.
   * @param filePath Path to the script file
   */
  private _deletePreviosScript(filePath: string): void {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  }

  /**
   * Function to determine the name of the task function.
   * @param task
   * @returns task name if exists otherwise returns 'anonymous'
   */
  private _determineTaskFunctionName(task: Function): string {
    return task.name || 'anonymous'
  }

  /**
   * This function transforms a given task function into a worker script.
   *
   * NOTE: In order to avoid compilation error warnings due to nature of typescipt, we use the flag
   *       @ts-nocheck to disable the type checking.
   *
   * reference: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html
   * @param task
   * @returns String representation of the task to be used by the worker functions
   */
  private _createWorkerScriptString(
    task: Function,
    handlers?: Array<Function>,
    libs?: Array<{ name: string; importDeclaration: string }>,
  ): string {
    const stringifedFunction: string = task.toString()
    const taskName = this._determineTaskFunctionName(task)
    const handlerFunctions: string = handlers?.reduce(
      (acc: string, handler: Function) => acc.concat(handler.toString(), '\n'),
      '',
    )

    const libsString: string = libs?.reduce((acc: string, lib: { name: string; importDeclaration: string }) => {
      return lib?.importDeclaration == null || lib?.importDeclaration === ''
        ? acc.concat(`import '${lib?.name}'\n`)
        : acc.concat(`import ${lib?.importDeclaration} from '${lib?.name}'\n`)
    }, '')

    return `
        // @ts-nocheck
        import { parentPort } from 'worker_threads'
        ${libsString != null || libsString?.length > 0 ? libsString : ''}
        ${handlerFunctions != null || handlerFunctions?.length > 0 ? handlerFunctions : ''}

        ${stringifedFunction}
        
        parentPort.on('message', async data => {
            const result = await ${taskName}(...data.args)
            parentPort.postMessage({ data: result })
        })
        `
  }

  /**
   * This function converts a task function into a TS file, that will be used as a worker script. In addition,
   * deletes the previously created TS file and compiles a new version to be used by the worker threads.
   *
   * NOTE: When calling the function toString() function, we receieve a JS representation of the function that uses
   * ___awaitor.
   *
   * References:
   * - https://medium.com/@joshuakgoldberg/hacking-typescripts-async-await-awaiter-for-jquery-2-s-promises-60612e293c4b
   * - https://github.com/SUCHMOKUO/node-worker-threads-pool/blob/f2220030a27e5b8333e12fb9edafeb29602a484b/src/utils.ts
   *
   * @param task
   * @returns full qualified path of the JS worker script.
   */
  async createAndCompileExecutionScript(
    task: Function,
    handlers?: Array<Function>,
    libs?: Array<{ name: string; importDeclaration: string }>,
  ): Promise<string> {
    // REVISIT: We should verify that the task is in fact a promise

    const executionScriptContent = this._createWorkerScriptString(task, handlers, libs)
    const taskName = this._determineTaskFunctionName(task)

    const fileName = `${taskName}.ms-parrot`
    const tsFileName: string = fileName.concat(FILE_EXT.TS)
    const jsFileName: string = fileName.concat(FILE_EXT.JS)

    const workerScriptFolder: string = path.join(this._basePath, './worker-scripts')

    if (!fs.existsSync(workerScriptFolder)) {
      fs.mkdirSync(workerScriptFolder)
    }
    const fullFilePath = path.join(workerScriptFolder, tsFileName)

    // NOTE: Ensures that previous script is deleted, to ensure we only have a single execution script per pool of
    //       workers.
    this._deletePreviosScript(fullFilePath)
    fs.appendFileSync(fullFilePath, executionScriptContent)

    this._compileScriptFile(tsFileName, workerScriptFolder)

    return this.getFullPathOfCompiledFile(path.join(this._basePath, this._outDir), jsFileName)
  }

  private async listFolderFiles(srcFolder: string): Promise<string[]> {
    const entries = await fs.readdirSync(srcFolder, { withFileTypes: true })
    let files: Array<string> = entries
      .filter((file) => !file.isDirectory())
      .map((file) => path.join(srcFolder, file.name))

    const folders = entries.filter((folder) => folder.isDirectory())

    // eslint-disable-next-line no-plusplus
    for (let idx = 0; idx < folders.length; idx++) {
      const folder = folders[idx]
      const nestedFolderFiles = await this.listFolderFiles(path.join(srcFolder, folder.name))
      files = files.concat(nestedFolderFiles)
    }

    return files
  }

  private async getFullPathOfCompiledFile(searchDirectory: string, jsFileName: string): Promise<string> {
    const compiledFolderStructure = await this.listFolderFiles(searchDirectory)

    const foundPath = compiledFolderStructure.filter((fileName) => fileName.endsWith(jsFileName))

    if (!foundPath) {
      throw new Error(`Compiled file not found [${jsFileName}]`)
    }

    return foundPath.pop()
  }
}
