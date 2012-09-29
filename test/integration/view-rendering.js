
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    util = require('util'),
    assert = require('assert'),
    Multi = require('multi'),
    EventEmitter = require('events').EventEmitter;

var OutgoingMessage = require('http').OutgoingMessage;

// Creates a new response
function newResponse() {
  // Simulate a response
  var res = new OutgoingMessage();
  res.app = app;
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

vows.describe('View Rendering').addBatch({
  
  'OutgoingMessage::getViewPath': {

    topic: function() {
      return newResponse();
    },

    'Returns valid paths for aliases & filenames': function(res) {
      assert.strictEqual(res.getViewPath('index'), vPath('main/main-index.html'));
      assert.strictEqual(res.getViewPath('index.html'), vPath('main/index.html'));
    },

    'Returns valid paths for @layout views': function(res) {
      assert.strictEqual(res.getViewPath('@header'), vPath('__layout/header.mustache'));
      assert.strictEqual(res.getViewPath('@header.html'), vPath('__layout/header.html'));
    },

    'Returns valid paths for #restricted views': function(res) {
      assert.strictEqual(res.getViewPath('#404'), vPath('__restricted/404.mustache'));
      assert.strictEqual(res.getViewPath('#404.html'), vPath('__restricted/404.html'));
      assert.strictEqual(res.getViewPath('#dir/view'), vPath('__restricted/dir/view.mustache'));
      assert.strictEqual(res.getViewPath('#dir/view.html'), vPath('__restricted/dir/view.html'));
    },

    'Returns valid paths relative to views/': function(res) {
      assert.strictEqual(res.getViewPath('main/index'), vPath('main/main-index.html'));
      assert.strictEqual(res.getViewPath('/main/index'), vPath('main/main-index.html'));
      assert.strictEqual(res.getViewPath('main/index.html'), vPath('main/index.html'));
    },

    'Returns valid paths for static views': function(res) {
      assert.strictEqual(res.getViewPath('/static'), vPath('__static/static.html'));
      assert.strictEqual(res.getViewPath('/static.mustache'), vPath('__static/static.mustache'));
    }

  }

}).addBatch({

  'View Messages (raw views enabled)': {

      topic: function() {

        // Set multi flush to false (reuse call stack)
        multi.__config.flush = false;

        var promise = new EventEmitter();

        app.config.rawViews = true;

        app.on('request', function(req, res) {
          req.stopRoute();
          switch (req.url) {
            case '/bad-request':
              res.statusCode = 400;
              res.sendHeaders();
              res.httpMessage(400);
              break;
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

        multi.clientRequest('/bad-request');
        multi.clientRequest('/not-found');
        multi.clientRequest('/server-error');
        multi.clientRequest('/http-message');

        multi.exec(function(err, results) {
          promise.emit('success', err || results);
        });

        return promise;
      },

      'Application::notFound works properly': function(results) {
        var res = results[1], buf = res[0].trim(), hdr = res[1];
        assert.isTrue(buf.indexOf('<!DOCTYPE html>') === -1);
        assert.equal(buf, '<p>HTTP/404: Page not Found</p>');
        assert.equal(hdr.status, '404 Not Found');
      },

      'Application::serverError works properly': function(results) {
        var res = results[2], buf = res[0].trim(), hdr = res[1];
        assert.isTrue(buf.indexOf('<!DOCTYPE html>') === -1);
        assert.equal(buf, '<p>HTTP/500: Internal Server Error</p>');
        assert.equal(hdr.status, '500 Internal Server Error');
      },

      'Application::httpMessage works properly': function(results) {
        var res = results[3], buf = res[0].trim(), hdr = res[1];
        assert.isTrue(buf.indexOf('<!DOCTYPE html>') === -1);
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
        app.removeAllListeners('request'); // Remove `request` events
        app.restoreFilters(); // Restore filters state
        promise.emit('success', err || results);
      });

      return promise;
    },

    'Application::notFound works properly': function(results) {
      var res = results[1], buf = res[0].trim(), hdr = res[1];
      assert.isTrue(buf.indexOf('<!DOCTYPE html>') === -1);
      assert.isTrue(buf.indexOf('<p>HTTP/404: Page not Found</p>') >= 0);
      assert.equal(hdr.status, '404 Not Found');
    },

    'Application::serverError works properly': function(results) {
      // ServerError only includes the #500 template
      var res = results[2], buf = res[0].trim(), hdr = res[1];
      assert.equal(buf, '<p>HTTP/500: Internal Server Error</p>');
      assert.equal(hdr.status, '500 Internal Server Error');
    },

    'Application::httpMessage works properly': function(results) {
      var res = results[3], buf = res[0].trim(), hdr = res[1];
      assert.isTrue(buf.indexOf('<!DOCTYPE html>') === -1);
      assert.isTrue(buf.indexOf('<p>{RAW MESSAGE}</p>') >= 0);
      assert.equal(hdr.status, '200 OK');
    }

  }

}).addBatch({
  
  'Static View Events': {
    
    topic: function() {
      
      var promise = new EventEmitter();
      
      app.__eventSuccess = false;

      app.once('static_view', function(url) {
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
    }
    
  }
  
}).export(module);




























