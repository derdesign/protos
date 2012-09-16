
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
      
      multi.curl('-i /test/routes/99');
      multi.curl('-i /test/routes/:some/:route');
      multi.curl('-i /test/routes/:notfound');
      
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
    }

  }
  
}).export(module);
