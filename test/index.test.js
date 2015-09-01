var cwd, expect, fs, OnlyLog, moment, os, path;

expect = require('expect.js');

path = require('path');

fs = require('fs');

os = require('options-stream');

moment = require('moment');

OnlyLog = require('../index.js');

cwd = process.cwd();

describe('OnlyLog', function() {
  var filename, options;
  options = null;
  filename = moment().format("[test/test-]YYYY-MM-DD[.log]");
  beforeEach(function() {
    return options = {
      duration: 5000,
      bufferLength: 1000,
      filename: "[test/test-]YYYY-MM-DD[.log]"
    };
  });
  afterEach(function(done) {
    if (fs.existsSync(filename)) {
      fs.unlinkSync(filename);
    }
    return done();
  });
  it('info because buffLength', function(done) {
    var log;
    log = OnlyLog(os({}, options, {
      bufferLength: 1
    }));
    expect(log).to.have.keys('info', 'debug', 'warn', 'error')
    log.on('error', function (err) {console.error(err)})
    log.info('msg');
    log.info('msg');
    return setTimeout(function() {
      var str;
      str = fs.readFileSync(filename, 'utf-8');
      expect(str).to.match(/.+msg\n.+msg/);
      expect(log.buffer.length).to.be(0);
      return done();
    }, 300);
  });
  it('info because duration', function(done) {
    var log;
    log = OnlyLog(os({}, options, {
      duration: 100
    }));
    log.info('msg');
    log.info('msg');
    return setTimeout(function() {
      var str;
      str = fs.readFileSync(filename, 'utf-8');
      expect(str).to.match(/.+msg\n.+msg/);
      expect(log.buffer.length).to.be(0);
      return done();
    }, 300);
  });
  it('check file', function(done) {
    var log;
    log = OnlyLog(os({}, options, {
      bufferLength: 1
    }));
    log.log_day = '2014-01-01';
    log._checkFile();
    log.info('msg');
    log.info('msg');
    return setTimeout(function() {
      var str;
      str = fs.readFileSync(filename, 'utf-8');
      expect(str).to.match(/.+msg\n.+msg/);
      expect(log.buffer.length).to.be(0);
      return done();
    }, 300);
  });
  it('stream on error occoured', function(done) {
    var log;
    log = OnlyLog(os({}, options, {
      filename: '[/private/test]'
    }));
    log.info('msg');
    var isErrorOccur = false
    log.on('error', function () {
      isErrorOccur = true
    })
    return setTimeout(function() {
      expect(isErrorOccur).to.be(true)
      var exists;
      exists = fs.existsSync('/private/test.log', 'utf-8');
      expect(exists).not.to.be.ok();
      return done();
    }, 300);
  });
  it('log only level in logLevels', function(done) {
    var log;
    log = OnlyLog(os({}, options, {
      bufferLength: 1,
      logLevels: ['info']
    }));
    log.debug('msg');
    log.debug('msg');
    return setTimeout(function() {
      var str;
      str = fs.readFileSync(filename, 'utf-8');
      expect(str).to.be('')
      expect(log.buffer.length).to.be(0);
      return done();
    }, 300);
  });
  it('throw error when filename isnt stream', function(done) {
    try {
      var log;
      log = OnlyLog({});
    } catch (e) {
      done()
    }
  });
});