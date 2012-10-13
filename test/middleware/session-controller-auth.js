
var app = require('../fixtures/bootstrap.js'),
    vows = require('vows'),
    assert = require('assert'),
    util = require('util'),
    Multi = require('multi'),
    EventEmitter = require('events').EventEmitter;

app.customCurl = function(url, callback) {
  if (sessId) {
    app.curl(sessCmd + url, callback);
  } else {
    app.curl('-i -G -d "persistent=1" /session/create/ernie', function(err, results) {
      app.customCurl.call(app, url, callback);
    });
  }
}

var multi = new Multi(app),
    controllerCtor = app.controller.constructor,
    httpMethods = app.controller.httpMethods;

var total = 0; // counter for controller tests

var loginUrl = app.url(app.loginUrl);

multi.on('pre_exec', app.backupFilters);
multi.on('post_exec', app.restoreFilters);

var sessId, sessHash, session, sess, shash, sessCmd = '';

var started = false;

app.on('load_session', function(sid, data) {
  if (sid) {
    sess = app.session.config.sessCookie;
    shash = app.session.config.hashCookie;
    sessId = sid;
    sessHash = data.fpr;
    session = data;
    sessCmd = util.format('--cookie "%s=%s; %s=%s" ', sess, sessId, shash, sessHash);
  }
});

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
    else if (isPrivate) expRes = 200;
    else if (isPublic) expRes = 200;
    else expRes = 200;
    
    multi.customCurl(util.format('-i %s -X %s /private/%s', sessCmd, method, rfunc));
    (function(k, t, cm, rm, er) { // k => key, t => total, cm => current method,   rm => route method, n => numeric response
      var label = util.format('Controller::%s responds w/%d for %s requests', k, er, cm);
      
      currentBatch[label] = function(results) {
        var r = results[t];
        switch(er) {
          case 200: assert200(r, k, t); break;
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

var batchQueue = [];
var batch = {};
var currentBatch = batch['Controllers » auth/sessions + authentication'] = {

  topic: function() {

    var promise = new EventEmitter();

    if (!app.supports.csrf) {
      app.use('cookie_parser');
      app.use('session', {storage: 'redis', guestSessions: false, salt: 'abc1234'});
    } else {
      app.session.config.guestSessions = false;
    }

    multi.exec(function(err, results) {
      promise.emit('success', err || results);
    });

    return promise;
  }

}

automateVowsBatches();

// console.exit(batch);

vows.describe('Session (middleware)').addBatch(batch).export(module);
