
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    util = require('util'),
    Multi = require('multi'),
    EventEmitter = require('events').EventEmitter;
    
var multi = new Multi(app),
    controllerCtor = app.controller.constructor,
    httpMethods = app.controller.httpMethods;

var total = 0; // counter for controller tests

var loginUrl = app.url(app.loginUrl);

multi.on('pre_exec', app.backupFilters);
multi.on('post_exec', app.restoreFilters);

// Automatically add requests url in headers (for debugging purposes)
app.config.headers['X-Request-Url'] = function(req, res) {
  return req.url;
}

// Automatically add request method in headers (for debugging purposes)
app.config.headers['X-Request-Method'] = function(req, res) {
  return req.method;
}

function assert200(r, k, t) {
  assert.isTrue(r.indexOf('HTTP/1.1 200 OK') >= 0);
  assert.isTrue(r.indexOf(util.format('{%s}', k)) >= 0);
}

function assert302(r, k, t) {
  assert.isTrue(r.indexOf('HTTP/1.1 302 Moved Temporarily') >= 0);
  assert.isTrue(r.indexOf('Location: ' + loginUrl) >= 0);
}

function assert404(r, k, t) {
  assert.isTrue(r.indexOf('HTTP/1.1 404 Not Found') >= 0);
  assert.isTrue(r.indexOf('<p>HTTP/404: Page not Found</p>') >= 0);
}

function assert405(r, k, t) {
  assert.isTrue(r.indexOf('HTTP/1.1 405 Method Not Allowed') >= 0);
  assert.isFalse(r.indexOf(util.format('{%s}', k)) >= 0);
}

function testRouteMethod(tmethod, rfunc) {
  for (var expRes, method, i=0; i < httpMethods.length; i++) {
    method = httpMethods[i];
    
    var isPrivate = (rfunc.indexOf('private') >= 0),
        isPublic = (rfunc.indexOf('public') >= 0);
    
    if (method != tmethod) expRes = (tmethod != 'GET' && method == 'GET') ? 404 : 405;
    else if (isPrivate) expRes = 302;
    else if (isPublic) expRes = 200;
    else expRes = 302;
    
    multi.curl(util.format('-i -X %s /private/%s', method, rfunc));
    (function(k, t, cm, rm, er) { // k => key, t => total, cm => current method,   rm => route method, n => numeric response
      currentBatch[util.format('Controller::%s responds w/%d for %s requests', k, er, cm)] = function(results) {
        var r = results[t];
        switch(er) {
          case 200: assert200(r, k, t); break;
          case 302: assert302(r, k, t); break;
          case 404: assert404(r, k, t); break;
          case 405: assert405(r, k, t); break;
          default:
            throw new Error("Response not expected: " + er);
            // break;
        }
      }
    })(rfunc, total++, method, tmethod, expRes);
  }
}

// TEST AUTOMATION [START] --

function automateVowsBatches() {
  
  controllerCtor.prototype.routeMethods.forEach(function(m) {
    if (m.indexOf('raw_') === 0) return; // Raw routes do not apply
    var method;
    if (m != 'super_' && controllerCtor.hasOwnProperty(m) && (method=controllerCtor[m]) instanceof Function ) {
      var hm = m.slice(m.lastIndexOf('_') + 1).toUpperCase();
      testRouteMethod(hm, m);
    }
  });
}

// TEST AUTOMATION [END] --

var batch = {};
var currentBatch = batch['Controllers » auth/sessions + no authentication'] = {
  
  topic: function() {
    
    var promise = new EventEmitter();
    
    app.use('cookie_parser');
    app.use('session', {storage: 'redis', guestSessions: false, salt: 'abc1234'});
    
    multi.exec(function(err, results) {
      promise.emit('success', err || results);
    });
    
    return promise;
  }
  
}

automateVowsBatches(); // Creates the nifty automated tests

// console.exit(batch);

vows.describe('Session (middleware)').addBatch(batch).export(module);
