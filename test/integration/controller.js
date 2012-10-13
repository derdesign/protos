
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

multi.on('pre_exec', app.backupFilters);
multi.on('post_exec', app.restoreFilters);

// Automatically add requets url in headers (for debugging purposes)
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
    expRes = (method == tmethod) ? 200 : (tmethod != 'GET' && method == 'GET') ? 404 : 405;
    
    // console.log([tmethod, method, expRes]);
    
    multi.curl(util.format('-i -X %s /test/%s', method, rfunc));
    
    (function(k, t, cm, rm, er) { // k => key, t => total, cm => current method,   rm => route method, n => numeric response
      currentBatch[util.format('Controller::%s responds w/%d for %s requests', k, er, cm)] = function(results) {
        
        // console.log([k, er, cm]);
        
        var r = results[t];
        
        // console.log(r);
        
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
    var method;
    if (m != 'super_' && controllerCtor.hasOwnProperty(m) && (method=controllerCtor[m]) instanceof Function ) {
      var hm = m.slice(m.lastIndexOf('_') + 1).toUpperCase();
      testRouteMethod(hm, m);
    }
  });
}

// TEST AUTOMATION [END] --

var batch = {};
var currentBatch = batch['Route Functions (sessions not enabled)'] = {
  
  topic: function() {
    
    var promise = new EventEmitter();
    
    // Disable sessions
    app.supports.session = false;
    delete app.session;
    
    multi.exec(function(err, results) {
      promise.emit('success', err || results);
    });
    
    return promise;
  }
  
}

automateVowsBatches(); // Creates the nifty automated tests

// console.exit(batch);

vows.describe('Application Controllers').addBatch(batch).addBatch({
  
  'Controller Validation: GET': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      // Parameter validation: valid 
      multi.curl('-i /test/qstring/abcde');
      
      // Parameter validation: invalid
      multi.curl('-i /test/qstring/12346');
      
      // Query String values + no param validation
      multi.curl('-i -G -d "alpha=1&bravo=2&charlie=3" /test/qstring');
      
      // Query String values + param validation
      multi.curl('-i -G -d "alpha=4&bravo=5&charlie=6" /test/qstring/abc/123');
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    'Responds w/200 on valid route parameters': function(results) {
      var r = results[0];
      assert.isTrue(r.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r.indexOf("{ rule1: 'abcde' }") >= 0);
    },
    
    'Responds w/404 on invalid route parameters': function(results) {
      var r = results[1];
      assert.isTrue(r.indexOf('HTTP/1.1 404 Not Found') >= 0);
    },
    
    'Detects query string values when not validating routes': function(results) {
      var r = results[2];
      assert.isTrue(r.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r.indexOf("{ alpha: '1', bravo: '2', charlie: '3' }") >= 0);
    },
    
    'Detects query string values when validating routes': function(results) {
      var r = results[3];
      assert.isTrue(r.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r.indexOf("{ rule1: 'abc', rule2: '123' } { alpha: '4', bravo: '5', charlie: '6' }") >= 0);
    },

  }
  
}).addBatch({
  
  'Controller Filters': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      // Routes blocked by filters
      multi.curl('-i /filter/bad-route-1');
      multi.curl('-i /filter/bad-route-2');
      
      // Normal route with params (should not be blocked by filters)
      multi.curl('-i /filter/greeting/ernie');
      
      // Should not conflict with route resolution
      multi.curl('-i /filter/404');
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    'Filters can block route callbacks': function(results) {
      var r1 = results[0],
          r2 = results[1];
      assert.isTrue(r1.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r1.indexOf('{BAD ROUTE 1}') >= 0);
      assert.isTrue(r2.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r2.indexOf('{BAD ROUTE 2}') >= 0);
    },
    
    'Filter chain works properly': function(results) {
      var r = results[2];
      assert.isTrue(r.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r.indexOf('{Hello ernie}') >= 0);
    },
    
    "Filters don't conflict with route resolution": function(results) {
      var r = results[3];
      assert.isTrue(r.indexOf('HTTP/1.1 404 Not Found') >= 0);
    }
    
  }
  
}).addBatch({
  
  'Multiple Route Functions Chain': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      // Should run functions in order
      multi.curl('-i /route-chain-a');
      multi.curl('-i /route-chain-b');
      multi.curl('-i -X POST /route-chain-b');
      multi.curl('-i -X PUT /route-chain-b');
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    'Runs chained route functions': function(results) {
      var r1 = results[0];
      assert.isTrue(r1.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r1.indexOf('Counter: {-41}') >= 0);
    },
    
    "Runs chained route functions w/ multiple HTTP methods": function(results) {
      var r2 = results[1],
          r3 = results[2],
          r4 = results[3];
      assert.isTrue(r2.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r2.indexOf('Counter: {-41}') >= 0);
      assert.isTrue(r3.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r3.indexOf('Counter: {-41}') >= 0);
      assert.isTrue(r4.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r4.indexOf('Counter: {-41}') >= 0);
    }
    
  }
  
}).addBatch({
  
  'Static Views (directory structure)': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      multi.curl('/category/archive');
      multi.curl('/category/uncategorized/post');
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    "Renders custom paths for static views within directories": function(results) {
      var r1 = results[0];
      var r2 = results[1];
      
      assert.isTrue(r1.indexOf('CATEGORY ARCHIVE') >= 0);
      assert.isTrue(r2.indexOf('THIS IS A POST') >= 0);
    }
    
  }
  
}).addBatch({
  
  'Raw Routes': {
    
    topic: function() {
      
      var promise = new EventEmitter();
      
      multi.curl('-i /raw/hello/normal');
      multi.curl('-i /raw/hello/');
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
      
    },
    
    'Are executed and matched properly (no filters run, support queued callbacks)': function(results) {
      var r1 = results[0],
          r2 = results[1];
          
      // Runs all filters and queued callbacks
      assert.isTrue(r1.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r1.indexOf('{"filter1":true,"filter2":true,"pre_callback":true}') >= 0);

      // Skips all filters and only runs queued callbacks
      assert.isTrue(r2.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r2.indexOf('{"pre_callback":true}') >= 0);
    }
    
  }
  
}).export(module);
