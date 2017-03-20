/*
* grunt-phantomcss
* https://github.com/micahgodbolt/grunt-phantomcss
*
* Copyright (c) 2013 Chris Gladd
* Copyright (c) since 2014 Anselm Hannemann
* Copyright (c) since 2015 Micah Godbolt
*
* Licensed under the MIT license.
*/

'use-strict';

// Get node fileSystem module and define the separator module
var fs = require('fs');
var s = fs.separator;
// Path not avaliable in phantomjs (for whatever reason), so...
var system = require('system');
var dirname = function(fullPath) {
  var dname = fullPath;
  var sepIdx = fullPath.lastIndexOf(s);
  if (sepIdx >= 0) {
    dname = fullPath.substring(0, sepIdx);
  }
  return dname;
};

// Parse arguments passed in from the grunt task
var args = JSON.parse(system.args[1]);

// Get viewport arguments (width | height)
var viewportSize = {
  width: args.viewportSize[0],
  height: args.viewportSize[1]
};

// Messages are sent to the parent by appending them to the tempfile
var sendMessage = function() {
  fs.write(args.tempFile, JSON.stringify(Array.prototype.slice.call(arguments)) + '\n', 'a');
};

// Initialise CasperJs
var phantomCSSPath = args.phantomCSSPath;

phantom.casperPath = args.casperJSPath;
phantom.injectJs(phantom.casperPath + s + 'bin' + s + 'bootstrap.js');

var casper = require('casper').create({
  viewportSize: viewportSize,
  logLevel: args.logLevel,
  verbose: true
});

// Require and initialise PhantomCSS module
var phantomcss = require(phantomCSSPath + s + 'phantomcss.js');

var phantomCSSOptions = {
  screenshotRoot: args.screenshots,
  libraryRoot: phantomCSSPath, // Give absolute path, otherwise PhantomCSS fails
  mismatchTolerance: args.mismatchTolerance, // defaults to 0.05

  onFail: function(test) {
    sendMessage('onFail', test);
  },
  onPass: function(test) {
    sendMessage('onPass', test);
  },
  onTimeout: function(test) {
    sendMessage('onTimeout', test);
  },
  onComplete: function(allTests, noOfFails, noOfErrors) {
    sendMessage('onComplete', allTests, noOfFails, noOfErrors);
  },
  fileNameGetter: function(root, filename) {
    var name = phantomcss.pathToTest + args.screenshots + '/' + filename;
    if (fs.isFile(name + '.png')) {
      return name + '.diff.png';
    } else {
      return name + '.png';
    }
  }
};
if (args.failures) {
  phantomCSSOptions.failedComparisonsRoot = args.failures;
} else {
  phantomCSSOptions.failedComparisonsRoot = false;
}

phantomcss.init(phantomCSSOptions);

casper.start();
// Run the test scenarios
args.test.forEach(function(testSuite) {
  phantom.casperTest = true;
  phantom.rootUrl = args.rootUrl;
  casper.then(function() {
    phantomcss.pathToTest = dirname(testSuite) + '/';
  });
  require(testSuite);
  casper.then(function() {
    phantomcss.compareSession();
  })
  .then(function() {
    casper.test.done();
  });
});

// End tests
casper.run(function() {
  phantom.exit();
});
