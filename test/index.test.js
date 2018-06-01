import expect from 'expect.js'
import path from 'path'
import fs from 'fs'
import moment from 'moment'
import _ from 'lodash'
import OnlyLog from '../lib'

const cwd = process.cwd()

describe('OnlyLog', function() {
  let options = null
  let log
  const filename = moment().format("[test/test-]YYYY-MM-DD[.log]")
  const yesterdayFilename = moment().subtract(1, 'day').format("[test/test-]YYYY-MM-DD[.log]")
  beforeEach(function() {
    return options = {
      duration: 5000,
      bufferLength: 1000,
      filename: "[test/test-]YYYY-MM-DD[.log]"
    }
  })
  afterEach(function(done) {
    if (log) {
      log.destroy()
      log = null
    }

    if (fs.existsSync(filename)) {
      fs.unlinkSync(filename)
    }

    if (fs.existsSync(yesterdayFilename)) {
      fs.unlinkSync(yesterdayFilename)
    }
    
    return done()
  })
  it('info because buffLength', function(done) {
    log = OnlyLog({
      ...options,
      bufferLength: 1
    })
    expect(log).to.have.keys('info', 'debug', 'warn', 'error')
    log.on('error', function (err) {console.error(err)})
    log.info('msg')
    setTimeout(function() {
      expect(log.buffer.length).to.be(1)
      log.info('msg')
      setTimeout(function() {
        var str
        str = fs.readFileSync(filename, 'utf-8')
        expect(str).to.match(/.+msg\n.+msg\n/)
        expect(log.buffer.length).to.be(0)
        return done()
      }, 200)
    }, 200)
  })
  it('wait for drain if write drain', function(done) {
    this.timeout(10000)
    const originNow = Date.now
    Date.now = () => originNow() - 24 * 3600 * 1000
    log = OnlyLog({
      ...options,
      bufferLength: 0
    })
    let isDrained = false
    for (let i = 0; i < 10000; i++) {
      log.info('msg')
    }

    log.stream.on('drain', function () {
      isDrained = true
    })

    Date.now = originNow
    log.info('msg')


    return setTimeout(function() {
      expect(isDrained).to.be(true)
      const str = fs.readFileSync(filename, 'utf-8')
      expect(str).to.match(/.+msg\n/)
      expect(log.buffer.length).to.be(0)
      return done()
    }, 300)
  })
  it('info because duration', function(done) {
    log = OnlyLog({
      ...options,
      duration: 100
    })
    log.info('msg')
    log.info('msg')
    expect(log.buffer.length).to.be.greaterThan(0)
    return setTimeout(function() {
      var str
      str = fs.readFileSync(filename, 'utf-8')
      expect(str).to.match(/.+msg\n.+msg\n/)
      expect(log.buffer.length).to.be(0)
      return done()
    }, 300)
  })
  it('rotate if item.time > log.streamEndTime', function(done) {
    const originNow = Date.now
    Date.now = () => originNow() - 24 * 3600 * 1000

    log = OnlyLog({
      ...options,
      bufferLength: 0
    })

    log.info('msg')

    return setTimeout(function() {
      const yesterdayContent = fs.readFileSync(yesterdayFilename, 'utf-8')
      expect(yesterdayContent).to.match(/.+msg\n/)

      Date.now = originNow
      log.info('msg')
      setTimeout(function () {
        const todayContent = fs.readFileSync(filename, 'utf-8')
        expect(todayContent).to.match(/.+msg\n/)
        expect(log.buffer.length).to.be(0)
        return done()
      }, 300)

    }, 300)
  })
  it('stream on error occoured', function(done) {
    log = OnlyLog({
      ...options,
      filename: '[/private/test]'
    })
    log.info('msg')
    var isErrorOccur = false
    log.on('error', function (e) {
      isErrorOccur = true
    })
    return setTimeout(function() {
      expect(isErrorOccur).to.be(true)
      var exists
      exists = fs.existsSync('/private/test.log', 'utf-8')
      expect(exists).not.to.be.ok()
      return done()
    }, 300)
  })
  it('log only level in logLevels', function(done) {
    log = OnlyLog({
      ...options,
      bufferLength: 1,
      logLevels: ['info']
    })
    log.debug('msg')
    log.debug('msg')
    return setTimeout(function() {
      var str
      str = fs.readFileSync(filename, 'utf-8')
      expect(str).to.be('')
      expect(log.buffer.length).to.be(0)
      return done()
    }, 300)
  })
  it('log to stream', function(done) {
    const stream = fs.createWriteStream(yesterdayFilename)
    log = OnlyLog({
      ...options,
      bufferLength: 1,
      stream: stream
    })
    log.debug('msg')
    log.debug('msg')
    return setTimeout(function() {
      expect(fs.existsSync(filename)).to.be(false)
      return done()
    }, 300)
  })
  it('if will set logLevels === allLevels when receive debugSignal', function(done) {
    log = OnlyLog({
      ...options,
      bufferLength: 0,
      logLevels: ['info'],
      debugSignal: 'SIGUSR2'
    })
    log.debug('msg')
    return setTimeout(function() {
      const str = fs.readFileSync(filename, 'utf-8')
      expect(str).to.be('')
      expect(log.buffer.length).to.be(0)
      
      // send debugSignal
      process.emit(log.options.debugSignal)
      log.debug('msg')
      setTimeout(function () {
        const str = fs.readFileSync(filename, 'utf-8')
        expect(str).to.match(/.+msg\n/)
        expect(log.buffer.length).to.be(0)
        return done()
      }, 300)
    }, 300)
  })
  it('throw error when format throw error', function(done) {
    const mockError = new Error('xxxx')
    log = OnlyLog({
      ...options,
      duration: 100,
      format: function () {
        throw mockError
      }
    })
    let error
    log.on('error', function (e) {
      error = e
    })
    log.info('xxx')
    setTimeout(function () {
      expect(error).to.be(mockError)
      done()
    }, 300)
  })
  it('throw error when filename isnt stream', function(done) {
    try {
      log = OnlyLog({})
    } catch (e) {
      done()
    }
  })
})