# grunt-phantomcss

> Automate CSS regression testing with PhantomCSS

This is a fork of the original [grunt-phantomcss](https://github.com/huddle/grunt-phantomcss), with the following updates and enhancements:
 * Anselmh's updates detailed [here](https://github.com/anselmh/grunt-phantomcss)
 * More modular file structure, storing test baseline(s) and result(s) in the directory of the test file itself rather than within a single root directory. This keeps the baselines, results, and tests together with less coupling between tests.
 * PhantomJS updated to v1.98 to fix [SSLv3 bug](https://github.com/ariya/phantomjs/issues/12655)
 * New rootUrl option, to accomodate testing against multiple envirronments

Currently this fork is not available on npm, however, you can install and use this version by following the steps below.

----

## Getting Started
This plugin requires Grunt `~0.4.5`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin through the following steps.

Install from the command line:

```
  $ npm install @micahgodbolt/grunt-phantomcss --save-dev
```

Or add the following line to your `package.json`:

```js
  "@micahgodbolt/grunt-phantomcss": "^0.4.0"
```

Then, once the plugin has been installed via `npm install`, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-phantomcss');
```

## The "phantomcss" task

### Overview
In your project's Gruntfile, add a section named `phantomcss` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  phantomcss: {
    options: {
        screenshots: 'test/visual/screenshots/',
        results: 'results/visual/',
        viewportSize: [1280, 800],
        mismatchTolerance: 0.05,
        rootUrl: 'http://localhost:3000/' // Optional
        phantomjsArgs: [
          // optional, array of phantomJS CLI options
        ]
      },
      src: [
        'test/visual/**/*.js'
      ]
    }
});
```

### Options

#### src
Type: `String|Array`

The test files to run.

#### options.mismatchTolerance
Type: `Number`
Default: `0.05`

The change percentange tolerated between screenshots (for instance to match anti-aliasing bugs).

#### options.screenshots
Type: `String`
Default: `'./screenshots'`

The screenshots directory, relative to the src file, where test fixtures (comparison screenshots) are stored. Baseline screenshots will be stored here on the first run if they're not present.

#### options.results
Type: `String`
Default: `'./results'`

The directory, relative to the src file, to store source, diff, and failure screenshots after tests.

#### options.viewportSize
Type: `Array`
Default: `[1280, 800]`

The viewport size to test the site in `[width, height]` format. Useful when testing responsive layouts.

#### options.logLevel
Type: `String`
Default: `error`

The CasperJS log level. See [CasperJS: Logging](http://casperjs.readthedocs.org/en/latest/logging.html) for details.

#### options.rootUrl
Type: `String`
Default: ``

Optional parameter passed to testfiles for prepending to relative URL's. Useful when testing against multiple environments.

#### options.phantomjsArgs
Type: `Array`
Default: `[]`

Optional array of CLI arguments passed when running phantomJS. See [PhantomJS Command-line Options](http://phantomjs.org/api/command-line.html) for details.


### Usage Examples

#### Basic visual tests
Run tests in `test/visual/` against comparison screenshots stored in `test/visual/screenshots/`, and put the resulting screenshots in `results/visual/`

```js
grunt.initConfig({
  phantomcss: {
    options: {
      screenshots: 'test/visual/screenshots/',
      results: 'results/visual/'
    },
    src: [
      'test/visual/**/*.js'
    ]
  }
});
```

#### Responsive layout testing
Run tests in `test/visual/` against comparison screenshots for destop and mobile. Pass rootUrl option to specify testing against `http://localhost:3000/`.

```js
grunt.initConfig({
  phantomcss: {
    desktop: {
      options: {
        screenshots: 'test/visual/desktop/',
        results: 'results/visual/desktop',
        viewportSize: [1024, 768],
        rootUrl: 'http://localhost:3000/'
      },
      src: [
        'test/visual/**.js'
      ]
    },
    mobile: {
      options: {
        screenshots: 'test/visual/mobile/',
        results: 'results/visual/mobile',
        viewportSize: [320, 480],
        rootUrl: 'http://localhost:3000/mobile/'
      },
      src: [
        'test/visual/**.js'
      ]
    }
  },
});
```

#### Sample test file

Test files should do the following:
* Instruct CasperJS to open the URL you want to test. Grunt automatically envokes `casper.start()` when it begins, so all test files need to start with `casper.thenOpen`.
* Manipulate the page in some way if necessary. *PhantomJS is known to have trouble rendering web fonts and, as such, replacing text with a standard web font may be warranted.*
* Take screenshots

```javascript
casper.thenOpen('http://localhost:3000/todo')
    .then(function() {
      this.evaluate(function() {
        $('*').css('font-family', 'arial, sans-serif');
      });
    })
    .then(function() {
      phantomcss.screenshot('#todo-app', 'Main app');
    })
    .then(function() {
      casper.fill('form.todo-form', {
        todo: 'Item1'
      }, true);

      phantomcss.screenshot('#todo-app', 'Item added');
    })
    .then(function() {
      casper.click('.todo-done');

      phantomcss.screenshot('#todo-app', 'Item checked off');
    });
```

You can also make URL's relative, prepending the rootUrl to them:

```javascript
casper.thenOpen(phantom.rootUrl + 'todo')
    .then(function() {
      jQuery('*').css('font-family', 'arial, sans-serif');
    })
    .then(function() {
      phantomcss.screenshot('#todo-app', 'Main app');
    });
```


### Additional Resources
See the [CasperJS documentation](http://casperjs.readthedocs.org/en/latest/modules/casper.html) and the [PhantomCSS documentation](https://github.com/Huddle/PhantomCSS) for more information on using CasperJS and PhantomCSS.

For further examples, refer to the following posts:
  * [CSS Testing with PhantomCSS, PhantomJS, CasperJS and Grunt](http://www.phase2technology.com/blog/css-testing-with-phantomcss-phantomjs-casperjs-and-grunt/)
  * [Sass Bites #73 - Visual Regression Testing with PhantomCSS (Video)](https://youtu.be/cZtN6xvPcPk?t=14m1s)
  * [Visual Regression Testing: How to Test Dynamic Content with PhantomCSS](http://www.phase2technology.com/blog/visual-regression-testing-how-to-test-dynamic-content-phantomcss/)
  * [Visual Regression Testing Part 2: Extending Grunt-PhantomCSS for Multiple Environments](http://www.phase2technology.com/blog/visual-regression-testing-part-2-extending-grunt-phantomcss-for-multiple-environments/)
