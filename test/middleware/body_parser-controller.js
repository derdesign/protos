
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    util = require('util'),
    Multi = require('multi'),
    EventEmitter = require('events').EventEmitter;
    
var multi = new Multi(app);

var total = 0; // counter for controller tests

multi.on('pre_exec', app.backupFilters);
multi.on('post_exec', app.restoreFilters);

vows.describe('Body Parser (middleware) » Controller Validation').addBatch({
  
  'Controller Validation » POST/PUT': {
    
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
      assert.isTrue(r1.indexOf('HTTP/1.1 200 OK') >= 0); // Ajax errors are returned with 200/OK
      assert.isTrue(r1.indexOf('Missing required fields') >= 0); 
      assert.equal(r2, 'Missing required fields');
      assert.isTrue(r3.indexOf('HTTP/1.1 200 OK') >= 0); // Ajax errors are returned with 200/OK
      assert.isTrue(r3.indexOf('Invalid username!') >= 0);
      
    }
    
  }
  
}).export(module);
