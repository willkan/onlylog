var path = require('path')
var fs = require('fs')
var _ = require('lodash')
var moment = require('moment')
var util = require('util')
var EventEmitter = require('events').EventEmitter

function OnlyLog(options) {
  if (!_.isString(options.filename)) throw new Error('options.filename cannot be empty')
  var self = this
  this.options = _.extend({
    duration: 2000,
    bufferLength: 0,
    allLevels: ['info', 'debug', 'warn', 'error'],
    logLevels: ['info', 'debug', 'warn', 'error'],
    format: function (level) {
      return function () {
        return self._timeFormat() + ' [' + level + '] ' + util.format.apply(null, _.toArray(arguments))
      }
    }
  }, options)
  this.buffer = []

  var filename = moment().format(this.options.filename)

  this._createStream(filename)
  this._checkFile()
  this._checkBuffer()
  this._setTimer()
  this._generateApi()
}

util.inherits(OnlyLog, EventEmitter)

OnlyLog.prototype._setTimer = function () {
  //输出定时器
  setTimeout(this._checkBuffer.bind(this), this.options.duration)

  //日志文件翻转定时器
  var now = new Date()
  var tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now
  setTimeout(this._checkFile.bind(this), tomorrow)
}

OnlyLog.prototype._generateApi = function() {
  var self = this
  this.options.allLevels.forEach(function (level) {
    self[level] = self._genWrite(level)
  })
}

OnlyLog.prototype._createStream = function() {
  var self = this

  this.log_day = moment().format('YYYY-MM-DD')
  var filename = moment().format(this.options.filename)
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
    var str = format.apply(null, _.toArray(arguments))
    self.buffer.push(str)
    if (self.buffer.length > self.options.bufferLength) self._checkBuffer()
  }
}

OnlyLog.prototype._timeFormat = function() {
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

OnlyLog.prototype._checkFile = function() {
  if (this.log_day !== moment().format('YYYY-MM-DD')) {
    this.stream.end()
    this.stream = null
    this._createStream(moment().format(this.options.filename))
  }
}

OnlyLog.prototype._checkBuffer = function() {
  if (this.buffer.length !== 0) {
    this.stream.write(this.buffer.join('\n'))
    this.buffer = []
  }
}

module.exports = function(options) {
  return new OnlyLog(options)
}
