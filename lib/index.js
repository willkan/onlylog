var path = require('path')
var fs = require('fs')
var _ = require('lodash')
var moment = require('moment')
var util = require('util')
var mkdirp = require('mkdirp')
var EventEmitter = require('events').EventEmitter

function _timeFormat () {
  var d, m, now, time, y
  now = new Date()
  y = now.getFullYear()
  m = now.getMonth() + 1
  m = m < 10 ? '0' + m : m
  d = now.getDate()
  d = d < 10 ? '0' + d : d
  time = now.toLocaleTimeString()
  return y + '-' + m + '-' + d + ' ' + time
}

function format (level) {
  return function () {
    return _timeFormat() + ' [' + level + '] ' + util.format.apply(null, _.toArray(arguments))
  }
}

function OnlyLog(options) {
  if (options.stream == void 0 && options.filename == void 0) throw new Error('one of options.filename and options.stream cannot be empty')
  if (options.stream && _.isString(options.filename)) console.warn('[Onlylog warning:] use stream instead of filename')
  var self = this
  this.options = _.extend({
    duration: 2000,
    bufferLength: 0,
    allLevels: ['info', 'debug', 'warn', 'error'],
    logLevels: ['info', 'debug', 'warn', 'error'],
    format: format,
    rotation: 7
  }, options)
  this.buffer = []

  var filename = moment().format(this.options.filename)

  this._createStream(filename)
  this._setTimer()
  this._generateApi()
}

util.inherits(OnlyLog, EventEmitter)

OnlyLog.prototype._setTimer = function () {
  function createInterval (func, interval) {
    function wrap () {
      func()
      setTimeout(wrap, interval)
    }
    setTimeout(wrap, interval)
  }
  //输出定时器
  createInterval(this._flush.bind(this), this.options.duration)

  //日志文件翻转定时器
  var now = new Date()
  var tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now
  createInterval(this._checkFile.bind(this), tomorrow)

  // 日志文件删除定时器
  createInterval(this._rotate.bind(this), tomorrow)
}

OnlyLog.prototype._generateApi = function() {
  var self = this
  this.options.allLevels.forEach(function (level) {
    self[level] = self._genWrite(level)
  })
}

OnlyLog.prototype._createStream = function() {
  if (this.options.stream) return this.stream = this.options.stream
  var self = this
  this.log_day = moment().format('YYYY-MM-DD')
  var filename = moment().format(this.options.filename)
  var folder = filename.slice(0, filename.lastIndexOf('/'))
  try {
    fs.lstatSync(folder)
  } catch(err) {
    mkdirp.sync(folder)
  }
  var stream = fs.createWriteStream(filename, {
    flags: 'a'
  })
  stream.on('error', function(e) {
    return self.emit('error', util.format('log stream occur error', e))
  })
  stream.on('open', function() {})
  stream.on('close', function() {})
  this.stream = stream
}

OnlyLog.prototype._genWrite = function(level) {
  if (this.options.logLevels.indexOf(level) === -1) return function () {}
  var self = this
  var format = this.options.format(level)
  level = level.toUpperCase()
  return function () {
    var str = format.apply(null, _.toArray(arguments)) + '\n'
    self.buffer.push(str)
    if (self.buffer.length > self.options.bufferLength) self._flush()
  }
}

OnlyLog.prototype._checkFile = function() {
  if (this.log_day !== moment().format('YYYY-MM-DD')) {
    this.stream.end()
    this.stream = null
    this._createStream(moment().format(this.options.filename))
  }
}

OnlyLog.prototype._rotate = function () {
  var self = this
  if (this.log_day !== moment().format('YYYY-MM-DD')) {
    const oldestDateFile = moment().subtract(this.options.rotation, 'days').format(this.options.filename)
    fs.lstat(oldestDateFile, function (err, stats) {
      if(err) return
      return fs.unlink(oldestDateFile, function(err){
        return self.buffer.push('delete oldest file failed, error=', err)
      })
    })
  }
}

OnlyLog.prototype._flush = function() {
  if (this.buffer.length !== 0 && this.stream) {
    this.stream.write(this.buffer.join(''))
    this.buffer = []
  }
}

function createOnlyLog (options) {
  return new OnlyLog(options)
}
createOnlyLog.OnlyLog = OnlyLog
createOnlyLog.format = format
module.exports = createOnlyLog
