
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    EventEmitter = require('events').EventEmitter;
    Multi = require('multi');
    
var multi = new Multi(app);

vows.describe('Controller Routes').addBatch({
  
  '': {

    topic: function() {

      var promise = new EventEmitter();
      
      // Routes test
      multi.curl('-i /test/routes/99');
      multi.curl('-i /test/routes/:some/:route');
      multi.curl('-i /test/routes/:notfound');
      
      // MainController handling
      multi.curl('-i /blog/handled-by-main');
      multi.curl('-i /private/handled-by-main');
      multi.curl('-i /session/handled-by-main');
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });

      return promise;
    },

    'Automatically detect regex aliases': function(results) {
      var r = results[0];
      assert.isTrue(r.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r.indexOf('{"integer":"99"}') >= 0);
    }, 

    'Allow colons on unhandled routes': function(results) {
      var r = results[1];
      assert.isTrue(r.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r.indexOf('{}') >= 0);
    },
    
    'Return 404 on unknown routes with colons': function(results) {
      var r = results[2];
      assert.isTrue(r.indexOf('HTTP/1.1 404 Not Found') >= 0);
    },
    
    'MainController handles other controller routes': function(results) {
      var r1 = results[3],
          r2 = results[4],
          r3 = results[5];
      assert.isTrue(r1.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r1.indexOf('{"success":"true","url":"/blog/handled-by-main"}') >= 0);
      assert.isTrue(r2.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r2.indexOf('{"success":"true","url":"/private/handled-by-main"}') >= 0);
      assert.isTrue(r3.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r3.indexOf('{"success":"true","url":"/session/handled-by-main"}') >= 0);
    }

  }
  
}).export(module);
