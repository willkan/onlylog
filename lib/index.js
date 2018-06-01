import path from 'path'
import fs from 'fs'
import _ from 'lodash'
import moment from 'moment'
import util from 'util'
import events from 'events'

function _timeFormat (time) {
  return moment(time).format('YYYY-MM-DD HH:mm:ss')
}

function format ({level, args, time}) {
  return _timeFormat(time) + ' [' + level + '] ' + util.format.apply(null, args)
}

const defaultOptions = {
  duration: 2000,
  bufferLength: 0,
  allLevels: ['info', 'debug', 'warn', 'error'],
  logLevels: ['info', 'debug', 'warn', 'error'],
  format: format
}

const maxListeners = 100000

export class OnlyLog extends events.EventEmitter {
  constructor(options) {
    if (options.stream == void 0 && options.filename == void 0) throw new Error('one of options.filename and options.stream cannot be empty')
    if (options.stream && _.isString(options.filename)) console.warn('[Onlylog warning:] use stream instead of filename')
    super()
    this.options = {
      ...defaultOptions,
      ...options 
    }
    this.buffer = []

    this._createStream()
    this._genApis()
    this._createInterval(this._flush.bind(this), this.options.duration)
    this._defaultDebugSignalHandler = this._defaultDebugSignalHandler.bind(this)
    this._createDebugSignalHandler()
    this.setMaxListeners(maxListeners)
  }

  _createInterval(func, interval) {
    const wrap = ()=> {
      try {
        func()
      } catch (e) {
        this.emit('error', e)
      }
      setTimeout(wrap, interval)
    }
    setTimeout(wrap, interval)
  }

  _createStream() {
    if (this.options.stream) return this.stream = this.options.stream

    const now = Date.now()
    this.streamEndTime = moment(now).endOf('day')
    const filename = moment(now).format(this.options.filename)
    const stream = fs.createWriteStream(filename, {
      flags: 'a'
    })

    stream.on('error', (e) => {
      return this.emit('error', util.format('log stream occur error', e))
    })
    this.stream = stream
  }

  _createDebugSignalHandler() {
    if (!this.options.debugSignal) return
    process.on(this.options.debugSignal, this._defaultDebugSignalHandler)
  }

  _defaultDebugSignalHandler() {
    this.options.logLevels.forEach((level) => delete this[level])
    this.options.logLevels = Array.from(this.options.allLevels)
    this._genApis()
  }

  _genApis() {
    this.options.allLevels.forEach((level) => {
      this[level] = this._genApi(level)
    })
  }

  _genApi(level) {
    if (this.options.logLevels.indexOf(level) === -1) return function () {}

    return (...args) => {
      const time = Date.now()
      const item = {
        args,
        time,
        level
      }
      this.buffer.push(item)
      if (this.buffer.length > this.options.bufferLength) this._flush()
    }
  }

  _flush() {
    if (this.buffer.length === 0) return
    let stream = this.stream
    let bufferStr = []

    this.buffer.forEach((item) => {

      if (this.streamEndTime < item.time) {
        this._writeTo(stream, bufferStr.join('\n') + '\n', () => {
          this._destroyStream(stream)
        })
        bufferStr = []
        this._createStream()
        stream = this.stream
      }

      bufferStr.push(this.options.format(item))
    })

    this._writeTo(stream, bufferStr.join('\n') + '\n')
    this.buffer = []
  }

  _writeTo(stream, content, callback) {
    const ret = stream.write(content)
    if (!callback) return
    if (ret) return callback(null, true)

    return stream.once('drain', function () {
      callback(null, true)
    })
  }

  _destroyStream(stream) {
    stream.removeAllListeners()
    stream.end()
  }

  destroy() {
    this._flush()
    this._destroyStream(this.stream)
    if (this.options.debugSignal) process.removeListener(this.options.debugSignal, this._defaultDebugSignalHandler)
    this.removeAllListeners()
  }
}

export default function onlylog(options) {
  return new OnlyLog(options)
}

onlylog.format = format