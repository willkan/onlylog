'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.OnlyLog = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.default = onlylog;

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _util = require('util');

var _util2 = _interopRequireDefault(_util);

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _timeFormat(time) {
  return (0, _moment2.default)(time).format('YYYY-MM-DD HH:mm:ss');
}

function format(_ref) {
  var level = _ref.level;
  var args = _ref.args;
  var time = _ref.time;

  return _timeFormat(time) + ' [' + level + '] ' + _util2.default.format.apply(null, args);
}

var defaultOptions = {
  duration: 2000,
  bufferLength: 0,
  allLevels: ['info', 'debug', 'warn', 'error'],
  logLevels: ['info', 'debug', 'warn', 'error'],
  format: format
};

var maxListeners = 100000;

var OnlyLog = exports.OnlyLog = function (_events$EventEmitter) {
  _inherits(OnlyLog, _events$EventEmitter);

  function OnlyLog(options) {
    _classCallCheck(this, OnlyLog);

    if (options.stream == void 0 && options.filename == void 0) throw new Error('one of options.filename and options.stream cannot be empty');
    if (options.stream && _lodash2.default.isString(options.filename)) console.warn('[Onlylog warning:] use stream instead of filename');

    var _this = _possibleConstructorReturn(this, (OnlyLog.__proto__ || Object.getPrototypeOf(OnlyLog)).call(this));

    _this.options = _extends({}, defaultOptions, options);
    _this.buffer = [];

    _this._createStream();
    _this._genApis();
    _this._createInterval(_this._flush.bind(_this), _this.options.duration);
    _this._defaultDebugSignalHandler = _this._defaultDebugSignalHandler.bind(_this);
    _this._createDebugSignalHandler();
    _this.setMaxListeners(maxListeners);
    return _this;
  }

  _createClass(OnlyLog, [{
    key: '_createInterval',
    value: function _createInterval(func, interval) {
      var wrap = () => {
        try {
          func();
        } catch (e) {
          this.emit('error', e);
        }
        setTimeout(wrap, interval);
      };
      setTimeout(wrap, interval);
    }
  }, {
    key: '_createStream',
    value: function _createStream() {
      if (this.options.stream) return this.stream = this.options.stream;

      var now = Date.now();
      this.streamEndTime = (0, _moment2.default)(now).endOf('day');
      var filename = (0, _moment2.default)(now).format(this.options.filename);
      var stream = _fs2.default.createWriteStream(filename, {
        flags: 'a'
      });

      stream.on('error', e => {
        return this.emit('error', _util2.default.format('log stream occur error', e));
      });
      this.stream = stream;
    }
  }, {
    key: '_createDebugSignalHandler',
    value: function _createDebugSignalHandler() {
      if (!this.options.debugSignal) return;
      process.on(this.options.debugSignal, this._defaultDebugSignalHandler);
    }
  }, {
    key: '_defaultDebugSignalHandler',
    value: function _defaultDebugSignalHandler() {
      this.options.logLevels.forEach(level => delete this[level]);
      this.options.logLevels = Array.from(this.options.allLevels);
      this._genApis();
    }
  }, {
    key: '_genApis',
    value: function _genApis() {
      this.options.allLevels.forEach(level => {
        this[level] = this._genApi(level);
      });
    }
  }, {
    key: '_genApi',
    value: function _genApi(level) {
      var _this2 = this;

      if (this.options.logLevels.indexOf(level) === -1) return function () {};

      return function () {
        for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }

        var time = Date.now();
        var item = {
          args: args,
          time: time,
          level: level
        };
        _this2.buffer.push(item);
        if (_this2.buffer.length > _this2.options.bufferLength) _this2._flush();
      };
    }
  }, {
    key: '_flush',
    value: function _flush() {
      if (this.buffer.length === 0) return;
      var stream = this.stream;
      var bufferStr = [];

      this.buffer.forEach(item => {

        if (this.streamEndTime < item.time) {
          this._writeTo(stream, bufferStr.join('\n') + '\n', () => {
            this._destroyStream(stream);
          });
          bufferStr = [];
          this._createStream();
          stream = this.stream;
        }

        bufferStr.push(this.options.format(item));
      });

      this._writeTo(stream, bufferStr.join('\n') + '\n');
      this.buffer = [];
    }
  }, {
    key: '_writeTo',
    value: function _writeTo(stream, content, callback) {
      var ret = stream.write(content);
      if (!callback) return;
      if (ret) return callback(null, true);

      return stream.once('drain', function () {
        callback(null, true);
      });
    }
  }, {
    key: '_destroyStream',
    value: function _destroyStream(stream) {
      stream.removeAllListeners();
      stream.end();
    }
  }, {
    key: 'destroy',
    value: function destroy() {
      this._flush();
      this._destroyStream(this.stream);
      if (this.options.debugSignal) process.removeListener(this.options.debugSignal, this._defaultDebugSignalHandler);
      this.removeAllListeners();
    }
  }]);

  return OnlyLog;
}(_events2.default.EventEmitter);

function onlylog(options) {
  return new OnlyLog(options);
}

module.exports = onlylog;

onlylog.format = format;