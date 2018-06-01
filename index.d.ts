declare var onlylog: ((options: onlylog.OnlylogOptions) => onlylog.Onlylog) & {
  format: onlylog.formatFunction
}
declare namespace onlylog {
  export type Level = 'info' | 'debug' | 'warn' | 'error'
  export type formatFunction = (options: {level: Level, args: any[], time: number}) => string
  export interface Onlylog {
    destroy: () => void
    error(message?: any, ...optionalParams: any[]): void;
    info(message?: any, ...optionalParams: any[]): void;
    debug(message?: any, ...optionalParams: any[]): void;
    warn(message?: any, ...optionalParams: any[]): void;
    on?(msg: string, handler: Function): any
  }
  export interface OnlylogOptions {
    fileName?: string //define log file, e.p. [test-]YYYY-MM-DD[.log]
    allLevels?: Level[] //define api name
    logLevels?: Level[] //define the level need to write to file
    duration?: number // flush buffer time, default is 2000
    bufferLength?: number // max buffer length, default is 0
    format?: formatFunction// custom format function
    stream?: any, // use stream instead of default file ouput
    debugSignal?: string // set logLevels = allLevels when receive debugSignal
  }
}
export = onlylog