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

'use strict';

var path = require('path');
var fs = require('fs');

function findPath(folderName, paths) {
  var goodPath = null;
  for (var i = 0; i < paths.length && !goodPath; i++) {
    var folderPath = path.resolve(paths[i], folderName);
    console.log('testing ' + folderPath);
    try {
      var stats = fs.statSync(folderPath);
      if (stats.isDirectory()) {
        goodPath = folderPath;
        break;
      }
    } catch (e) {
      // if we get an exception, just try the next path
    }
  }
  if (goodPath == null) {
    throw new Error('Unable to locate the root folder for ' + folderName + ' module');
  }
  return goodPath;
}

var tmp = require('temporary');
var phantomBinaryPath = require('phantomjs').path;
var runnerPath = path.resolve(__dirname, '..', 'phantomjs', 'runner.js');
var phantomCSSPath = findPath('phantomcss', [
  path.resolve(__dirname, '..', 'node_modules'),
  path.resolve(__dirname, '..', '..', 'node_modules'), // sibling node_module (per npm 3 installation)
  path.resolve(__dirname, '..', '..', '..', '..', 'node_modules') // sibling node_module with '@micahgodbolt' (per npm 3 installation)
]);
var casperJSPath = findPath('casperjs', [
  path.resolve(phantomCSSPath, 'node_modules'),
  path.resolve(phantomCSSPath, '..', '..', 'node_modules'), // sibling node_module of phantomcss (per nmp 3)
  path.resolve(__dirname, '..', '..', 'node_modules'), // sibling root node_module (per npm 3)
  path.resolve(__dirname, '..', '..', '..', '..', 'node_modules') // sibling node_module with '@micahgodbolt' (per npm 3 installation)
]);


module.exports = function(grunt) {
  grunt.registerMultiTask('phantomcss', 'CSS Regression Testing', function() {
    var done = this.async();

    // Variable object to set default values for options
    var options = this.options({
      rootUrl: false,
      screenshots: 'screenshots',
      results: 'results',
      viewportSize: [1280, 800],
      mismatchTolerance: 0.05,
      waitTimeout: 5000, // Set timeout to wait before throwing an exception
      logLevel: 'warning' // debug | info | warning | error
    });

    // Timeout ID for message checking loop
    var messageCheckTimeout;

    // The number of tempfile lines already read
    var lastLine = 0;

    // The number of failed tests
    var failureCount = 0;

    // This is effectively the project root (location of Gruntfile)
    // This allows relative paths in tests, i.e. casper.start('someLocalFile.html')
    var cwd = process.cwd();

    // Create a temporary file for message passing between the task and PhantomJS
    var tempFile = new tmp.File();

    var deleteDiffScreenshots = function(folderpath) {
      // Find diff/fail files
      var diffScreenshots = grunt.file.expand([
        path.join(folderpath + '/' + options.screenshots, '*diff.png'),
        path.join(folderpath + '/' + options.screenshots, '*fail.png'),
      ]);

      // Delete all of 'em
      diffScreenshots.forEach(function(filepath) {
        grunt.file.delete(filepath, { force: true });
      });
    };

    var deleteDiffResults = function(folderpath) {
      // Find diff/fail files
      var diffScreenshots = grunt.file.expand([
        path.join(folderpath, options.results),
      ]);

      // Delete all of 'em
      diffScreenshots.forEach(function(filepath) {
        grunt.file.delete(filepath, { force: true });
      });
    };

    var cleanup = function(error) {
      // Remove temporary file
      tempFile.unlink();

      options.testFolder.forEach(function(folderpath) {
        // Create the output directory
        grunt.file.mkdir(folderpath + '/' + options.results);

        // Copy fixtures, diffs, and failure images to the results directory
        var allScreenshots = grunt.file.expand(path.join(folderpath + '/' + options.screenshots, '**.png'));

        allScreenshots.forEach(function(filepath) {
          grunt.file.copy(filepath, path.join(
            folderpath + '/' + options.results,
            path.basename(filepath)
          ));
        });

        deleteDiffScreenshots(folderpath);
      });
      done(error || failureCount === 0);
    };

    var checkForMessages = function checkForMessages(stopChecking) {
      // Disable logging temporarily
      grunt.log.muted = true;

      // Read the file, splitting lines on \n, and removing a trailing line
      var lines = grunt.file.read(tempFile.path).split('\n').slice(0, -1);

      // Re-enable logging
      grunt.log.muted = false;

      // Iterate over all lines that haven't already been processed
      lines.slice(lastLine).some(function(line) {
        // Get args and method
        var args = JSON.parse(line);
        var eventName = args[0];

        // Debugging messages
        grunt.log.debug(JSON.stringify(['phantomjs'].concat(args)).magenta);

        // Call handler
        if (messageHandlers[eventName]) {
          messageHandlers[eventName].apply(null, args.slice(1));
        }
      });

      // Update lastLine so previously processed lines are ignored
      lastLine = lines.length;

      if (stopChecking) {
        clearTimeout(messageCheckTimeout);
      } else {
        // Check back in a little bit
        messageCheckTimeout = setTimeout(checkForMessages, 100);
      }
    };

    var messageHandlers = {
      onFail: function(test) {
        grunt.log.writeln('Visual change found for ' + path.basename(test.filename) + ' (' + test.mismatch + '% mismatch)');
      },
      onPass: function(test) {
        grunt.log.writeln('No changes found for ' + path.basename(test.filename));
      },
      onTimeout: function(test) {
        grunt.log.writeln('Timeout while processing ' + path.basename(test.filename));
      },
      onComplete: function(allTests, noOfFails, noOfErrors) {
        if (allTests.length) {
          var noOfPasses = allTests.length - failureCount;
          failureCount = noOfFails + noOfErrors;

          if (failureCount === 0) {
            grunt.log.ok('All ' + noOfPasses + ' tests passed!');
          } else {
            if (noOfErrors === 0) {
              grunt.log.error(noOfFails + ' tests failed.');
            } else {
              grunt.log.error(noOfFails + ' tests failed, ' + noOfErrors + ' had errors.');
            }
          }
        }
      }
    };

    // Resolve paths for tests
    options.test = [];
    options.testFolder = [];
    this.filesSrc.forEach(function(filepath) {
      options.test.push(path.resolve(filepath));
      options.testFolder.push(path.dirname(filepath));
    });

    // Put failure screenshots in the same place as source screenshots, we'll move/delete them after the test run
    // Note: This duplicate assignment is provided for clarity; PhantomCSS will put failures in the screenshots folder by default
    options.failures = options.screenshots;

    // Pass necessary paths
    options.tempFile = tempFile.path;
    options.phantomCSSPath = phantomCSSPath;
    options.casperJSPath = casperJSPath;

    // Remove old diff screenshots

    options.testFolder.forEach(function(folderpath) {
      deleteDiffScreenshots(folderpath);
      deleteDiffResults(folderpath);
    });

    // Start watching for messages
    checkForMessages();

    grunt.util.spawn({
      cmd: phantomBinaryPath,
      args: [
        runnerPath,
        JSON.stringify(options),
      ],
      opts: {
        cwd: cwd,
        stdio: 'inherit'
      }
    }, function(error, result, code) {
      // When Phantom exits check for remaining messages one last time
      checkForMessages(true);

      cleanup(error);
    });
  });
};
