
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    fs = require('fs'),
    util = require('util'),
    assert = require('assert'),
    http = require('http'),
    Multi = require('multi'),
    EventEmitter = require('events').EventEmitter;

var IncomingMessage = http.IncomingMessage;
var OutgoingMessage = http.OutgoingMessage;

// Creates a new response
function newResponse() {
  // Simulate a response
  var res = new OutgoingMessage();
  res.__controller = app.controller;
  return res;
}

// Returns a full view path
function vPath(p) {
  return app.fullPath('app/views/' + p);
}

var multi = new Multi(app);

multi.on('pre_exec', app.backupFilters);
multi.on('post_exec', app.restoreFilters);

var transientViewHandler, transientViewData = [];

vows.describe('View Rendering').addBatch({
  
  'OutgoingMessage::getViewPath': {
  
    topic: function() {
      return newResponse();
    },
  
    'Returns valid paths for aliases & filenames': function(res) {
      assert.strictEqual(res.getViewPath('index'), vPath('main/main-index.hbs'));
      assert.strictEqual(res.getViewPath('main-index'), vPath('main/main-index.hbs'));
      assert.strictEqual(res.getViewPath('main-index.hbs'), vPath('main/main-index.hbs'));
      assert.strictEqual(res.getViewPath('index.hbs'), vPath('main/index.hbs'));
    },
  
    'Returns valid paths for @layout views': function(res) {
      assert.strictEqual(res.getViewPath('@header'), vPath('__layout/header.mustache'));
      assert.strictEqual(res.getViewPath('@header.hbs'), vPath('__layout/header.hbs'));
    },
  
    'Returns valid paths for #restricted views': function(res) {
      assert.strictEqual(res.getViewPath('#404'), vPath(app.paths.restricted + '404.mustache'));
      assert.strictEqual(res.getViewPath('#404.hbs'), vPath(app.paths.restricted + '404.hbs'));
      assert.strictEqual(res.getViewPath('#dir/view'), vPath(app.paths.restricted + 'dir/view.mustache'));
      assert.strictEqual(res.getViewPath('#dir/view.hbs'), vPath(app.paths.restricted + 'dir/view.hbs'));
    },
  
    'Returns valid paths relative to views/': function(res) {
      assert.strictEqual(res.getViewPath('main/index'), vPath('main/main-index.hbs'));
      assert.strictEqual(res.getViewPath('/main/index'), vPath('main/main-index.hbs'));
      assert.strictEqual(res.getViewPath('main/index.hbs'), vPath('main/index.hbs'));
    },
  
    'Returns valid paths for static views': function(res) {
      assert.strictEqual(res.getViewPath('/static'), vPath(app.paths.static + 'static.hbs'));
      assert.strictEqual(res.getViewPath('/static.mustache'), vPath(app.paths.static + 'static.mustache'));
    }
  
  }

}).addBatch({

  'View Messages (raw views enabled)': {

      topic: function() {
        
        // Prepare transient view event
        app.on('transient_view', transientViewHandler = function(req, res) {
          transientViewData.push([req, res]);
        });

        // Set multi flush to false (reuse call stack)
        multi.__config.flush = false;

        var promise = new EventEmitter();

        app.config.rawViews = true;

        app.on('request', function(req, res) {
          req.stopRoute();
          switch (req.url) {
            case '/not-found':
              res.statusCode = 404;
              res.sendHeaders();
              app.notFound(res);
              break;
            case '/server-error':
              res.statusCode = 500;
              res.sendHeaders();
              app.serverError(res);
              break;
            case '/http-message':
              res.sendHeaders();
              res.httpMessage('{RAW MESSAGE}');
              break;
          }
        });

        multi.request(app.url('/not-found'));
        multi.request(app.url('/server-error'));
        multi.request(app.url('/http-message'));

        multi.exec(function(err, results) {
          promise.emit('success', err || results);
        });

        return promise;
      },
      
      'Application::notFound works properly': function(results) {
        var res = results[0], buf = res[1].trim(), hdr = res[0].headers;
        assert.isTrue(buf.indexOf('<!doctype html>') === -1);
        assert.equal(buf, '<p>HTTP/404: Page not Found</p>');
        assert.equal(hdr.status, '404 Not Found');
      },

      'Application::serverError works properly': function(results) {
        var res = results[1], buf = res[1].trim(), hdr = res[0].headers;
        assert.isTrue(buf.indexOf('<!doctype html>') === -1);
        assert.equal(buf, '<p>HTTP/500: Internal Server Error</p>');
        assert.equal(hdr.status, '500 Internal Server Error');
      },

      'Application::httpMessage works properly': function(results) {
        var res = results[2], buf = res[1].trim(), hdr = res[0].headers;
        assert.isTrue(buf.indexOf('<!doctype html>') === -1);
        assert.equal(buf, '<p>{RAW MESSAGE}</p>');
        assert.equal(hdr.status, '200 OK');
      }

    }

}).addBatch({

  'View Messages (raw views disabled)': {

    topic: function() {
      
      // #{error} and #msg views are always set to raw

      app.config.rawViews = false;

      var promise = new EventEmitter();

      // Flush call stack upon completion
      multi.__config.flush = false;

      // Reuse the call stack
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });

      return promise;
    },

    'Application::notFound works properly': function(results) {
      var res = results[0], buf = res[1].trim(), hdr = res[0].headers;
      assert.isTrue(buf.indexOf('<!doctype html>') >= 0);
      assert.isTrue(buf.indexOf('<p>HTTP/404: Page not Found</p>') >= 0);
      assert.equal(hdr.status, '404 Not Found');
    },

    'Application::serverError works properly': function(results) {
      // ServerError only includes the #500 template
      var res = results[1], buf = res[1].trim(), hdr = res[0].headers;
      assert.isTrue(buf.indexOf('<!doctype html>') >= 0);
      assert.isTrue(buf.indexOf('<p>HTTP/500: Internal Server Error</p>') >= 0);
      assert.equal(hdr.status, '500 Internal Server Error');
    },

    'Application::httpMessage works properly': function(results) {
      var res = results[2], buf = res[1].trim(), hdr = res[0].headers;
      assert.isTrue(buf.indexOf('<!doctype html>') >= 0);
      assert.isTrue(buf.indexOf('<p>{RAW MESSAGE}</p>') >= 0);
      assert.equal(hdr.status, '200 OK');
    }

  }
  
}).addBatch({

  'View Messages (transientRaw enabled)': {

    topic: function() {
      
      // #{error} and #msg views are always set to raw

      app.config.rawViews = false;
      app.config.transientRaw = true;

      var promise = new EventEmitter();

      // Flush call stack upon completion
      multi.__config.flush = false;

      // Reuse the call stack
      multi.exec(function(err, results) {
        app.config.transientRaw = false;
        app.removeAllListeners('request'); // Remove `request` events
        app.restoreFilters(); // Restore filters state
        promise.emit('success', err || results);
      });

      return promise;
    },

    'Application::notFound works properly': function(results) {
      var res = results[0], buf = res[1].trim(), hdr = res[0].headers;
      assert.isTrue(buf.indexOf('<!doctype html>') === -1);
      assert.isTrue(buf.indexOf('<p>HTTP/404: Page not Found</p>') >= 0);
      assert.equal(hdr.status, '404 Not Found');
    },

    'Application::serverError works properly': function(results) {
      // ServerError only includes the #500 template
      var res = results[1], buf = res[1].trim(), hdr = res[0].headers;
      assert.isTrue(buf.indexOf('<!doctype html>') === -1);
      assert.isTrue(buf.indexOf('<p>HTTP/500: Internal Server Error</p>') >= 0);
      assert.equal(hdr.status, '500 Internal Server Error');
    },

    'Application::httpMessage works properly': function(results) {
      var res = results[2], buf = res[1].trim(), hdr = res[0].headers;
      assert.isTrue(buf.indexOf('<!doctype html>') === -1);
      assert.isTrue(buf.indexOf('<p>{RAW MESSAGE}</p>') >= 0);
      assert.equal(hdr.status, '200 OK');
    }

  }
  
}).addBatch({
  
  'Transient View Event': {
    
    topic: function() {
      app.removeListener('request', transientViewHandler);
      return transientViewData;
    },
    
    'Properly emits the transient_view event': function(data) {
      
      assert.equal(data.length, 9);
      
      urls = data.reduce(function(state, data) {
        var req = data[0], res = data[1];
        state.push(req.url);
        return state;
      }, []);
      
      data.forEach(function(args) {
        var req = args[0], res = args[1];
        assert.equal(args.length, 2);
        assert.isTrue(req instanceof IncomingMessage);
        assert.isTrue(res instanceof OutgoingMessage);
      });
      
      assert.deepEqual(urls, [
        '/not-found',
        '/server-error',
        '/http-message',
        '/not-found',
        '/server-error',
        '/http-message',
        '/not-found',
        '/server-error',
        '/http-message' ]);
      
    }
    
  }
  
}).addBatch({
  
  'Static View Events': {
    
    topic: function() {
      
      var promise = new EventEmitter();
      
      app.__eventSuccess = false;

      app.once('static_view', function(req, res, url) {
        app.__staticViewRequest = req;
        app.__staticViewResponse = res;
        app.__eventSuccess = url;
      });
      
      var multi = new Multi(app);
      
      multi.curl('-i /static-view-event');
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
      
    },
    
    "Properly emits the 'static_view' event": function(results) {
      var r = results[0];
      assert.isTrue(r.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r.indexOf('[STATIC VIEW EVENT]') >= 0);
      assert.equal(app.__eventSuccess, '/static-view-event');
      assert.equal(app.__staticViewRequest.constructor.name, 'IncomingMessage');
      assert.equal(app.__staticViewResponse.constructor.name, 'ServerResponse');
    }
    
  }
  
}).export(module);
