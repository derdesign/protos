
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

function assert405(r, k, t) {
  assert.isTrue(r.indexOf('HTTP/1.1 405 Method Not Allowed') >= 0);
  assert.isFalse(r.indexOf(util.format('{%s}', k)) >= 0);
}

function testRouteMethod(tmethod, rfunc) {
  for (var expRes, method, i=0; i < httpMethods.length; i++) {
    method = httpMethods[i];
    expRes = (method == tmethod) ? 200 : 405;
    multi.curl(util.format('-i -X %s /test/%s', method, rfunc));
    (function(k, t, cm, rm, er) { // k => key, t => total, cm => current method,   rm => route method, n => numeric response
      currentBatch[util.format('Controller::%s responds w/%d for %s requests', k, er, cm)] = function(results) {
        var r = results[t];
        switch(er) {
          case 200: assert200(r, k, t); break;
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
      
      // Query String validation + no param validation 
      multi.curl('-i -G -d "name=john&id=1&trigger=abc" /test/qstring/novalidate-param');
      
      // Query String validation + param validation
      multi.curl('-i -G -d "name=charlie&id=123" /test/qstring/validate/abc/jkl');
      
      // Validation Messages: strings
      multi.curl('-i -G -d "word=123&num=123" /test/qstring/messages');
      
      // Validation Messages: functions
      multi.curl('-i -G -d "word=cinnamon&num=toast" /test/qstring/messages');
      
      // Validation Messages: Ajax
      multi.curl('-i -G -H "X-Requested-With: XMLHttpRequest" -d "word=123&num=123" /test/qstring/messages');
      
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
    
    'Validates query strings when not validating routes': function(results) {
      var r = results[4];
      assert.isTrue(r.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r.indexOf("{ name: 'john', id: 1, trigger: 'abc' }") >= 0);
    },
    
    'Validates query strings when validating routes': function(results) {
      var r = results[5];
      assert.isTrue(r.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r.indexOf("{ rule1: 'abc', rule2: 'jkl' } { name: 'charlie', id: 123 }") >= 0);
    },
    
    'Invalidation: Responds w/400 + returns error messages': function(results) {
      var r = results[6];
      assert.isTrue(r.indexOf('HTTP/1.1 400 Bad Request') >= 0);
      assert.isTrue(r.indexOf("<p>Oops! Invalid word...</p>") >= 0);
    },
    
    'Invalidation: Responds w/400 + returns dynamic error messages': function(results) {
      var r = results[7];
      assert.isTrue(r.indexOf('HTTP/1.1 400 Bad Request') >= 0);
      assert.isTrue(r.indexOf("<p>Invalid number: toast</p>") >= 0);
    },
    
    'Invalidation: Responds w/200 + returns dynamic error messages on AJAX': function(results) {
      var r = results[8];
      assert.isTrue(r.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r.indexOf("Oops! Invalid word...") >= 0);
    }
    
  }
  
}).addBatch({
  
  'Controller Validation: POST/PUT': {
    
    topic: function() {
      
      // The Body Parse middleware is required to parse POST/PUT Data
      app.use('body_parser');
      
      var promise = new EventEmitter();
      
      // Note: Using POST/PUT interchangeably within the next tests
      // This will ensure that validation works for both POST/PUT methods
      
      // PostData validation + no param validation
      multi.curl('-i -X POST -d "user=nobody&pass=1234" /test/postdata');
      
      // PostData validation + param validation (valid)
      multi.curl('-i -X PUT -d "user=somebody&pass=5678" /test/postdata/5678');

      // PostData validation + param validation (invalid)
      multi.curl('-i -X POST -d "user=somebody&pass=5678" /test/postdata/5678xxx');

      // PostData Validation Messages: strings
      multi.curl('-i -X PUT -d "user=nobody9012&pass=3456" /test/postdata/messages');
      
      // PostData Validation Messages: functions
      multi.curl('-i -X POST -d "user=nobody&pass=notvalid" /test/postdata/messages');
      
      // PostData missing required fields
      multi.curl('-i -X PUT -d "" /test/postdata/messages');
      
      // PostData on AJAX Requests
      multi.curl('-i -X POST -H "X-Requested-With: XMLHttpRequest" /test/postdata/messages');
      multi.curl('-X PUT -H "X-Requested-With: XMLHttpRequest" /test/postdata/messages');
      multi.curl('-i -X PUT -H "X-Requested-With: XMLHttpRequest" -d "user=nobody9012&pass=3456" /test/postdata/messages');

      multi.exec(function(err, results) {
        delete app.supports.body_parser; // Remove support for body_parser after tests complete
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    'Responds w/200 when not validating routes': function(results) {
      var r = results[0];
      assert.isTrue(r.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r.indexOf("{ user: 'nobody', pass: 1234 }") >= 0);
    },
    
    'Responds w/200 when validating routes': function(results) {
      var r = results[1];
      assert.isTrue(r.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r.indexOf("{ user: 'somebody', pass: 5678 }") >= 0);
    },
    
    'Responds w/404 on invalid route parameters': function(results) {
      var r = results[2];
      assert.isTrue(r.indexOf('HTTP/1.1 404 Not Found') >= 0);
    },
    
    'Invalidation: Responds w/400 + returns error messages': function(results) {
      var r = results[3];
      assert.isTrue(r.indexOf('HTTP/1.1 400 Bad Request') >= 0);
      assert.isTrue(r.indexOf("<p>Invalid username!</p>") >= 0);
    },
    
    'Invalidation: Responds w/400 + returns dynamic error messages': function(results) {
      var r = results[4];
      assert.isTrue(r.indexOf('HTTP/1.1 400 Bad Request') >= 0);
      assert.isTrue(r.indexOf("<p>Oops! That's an invalid password: notvalid</p>") >= 0);
    },
    
    'Responds properly when no post data provided': function(results) {
      var r = results[5];
      assert.isTrue(r.indexOf('HTTP/1.1 400 Bad Request') >= 0);
      assert.isTrue(r.indexOf("<p>Missing required fields</p>") >= 0);
    },
    
    'Responds with raw data on AJAX Requests': function(results) {
      var r1 = results[6],
          r2 = results[7],
          r3 = results[8];
      assert.isTrue(r1.indexOf('HTTP/1.1 200 OK') >= 0); // Ajax errors are returned as 200/OK
      assert.isTrue(r1.indexOf('Missing required fields') >= 0);
      assert.equal(r2, 'Missing required fields');
      assert.isTrue(r3.indexOf('HTTP/1.1 200 OK') >= 0); // Ajax errors are returned as 200/OK
      assert.isTrue(r3.indexOf('Invalid username!') >= 0); // Ajax errors are returned as 200/OK
    }
    
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
  
}).export(module);
