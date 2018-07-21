# onlylog 

onlylog , A pretty simple logger for Node.js

# Installation

`npm install onlylog`

## Usage

### Getting start

```javascript
var OnlyLog = require('onlylog')
var log = OnlyLog({
  fileName : '[test-]YYYY-MM-DD[.log]', //define log file
});
log.info('xxxx')
```

### api

#### OnlyLog(options)

*one of options.filename and options.stream is required*

- options

  ```javascript
  {
    fileName : '[test-]YYYY-MM-DD[.log]', //define log file
    allLevels : ['info', 'debug', 'warn', 'error'], //define api name
    logLevels : ['info'], //define the level need to write to file
    duration : 5000, // flush buffer time, default is 2000
    bufferLength : 1000, // max buffer length, default is 0
    format: // custom format function
      function (level) {
        return function () {
          return arguments.toString()
        }
      },
    stream: process.stdout, // use stream instead of default file ouput
    rotation: 7 // 日志默认保留7天
  }
  ```