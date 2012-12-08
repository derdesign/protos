
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    util = require('util'),
    assert = require('assert'),
    EventEmitter = require('events').EventEmitter;
    
var multi, storage;

/*
  All of the redis native multi methods work exactly the same
  that is, they're dynamically generated and rely on the original
  storage code.
  
  It will just suffice to test a few methods to know if the interface
  is working as expected.
*/
    
vows.describe('storages/redis-native-multi.js').addBatch({

  'Preliminaries': {
    
    topic: function() {
      
      storage = app.getResource('storages/redis');
      multi = storage.nativeMulti();
      
      return storage;
      
    },
    
    'Properly configured storage': function(storage) {
      assert.isTrue(storage.constructor === protos.storages.redis);
    }
    
  }

}).addBatch({
  
  'Integrity Tests': {
    
    topic: function() {
      
      var promise = new EventEmitter();

      storage.delete(['a', 'b', 'c', 'myhash'], function(err) {
        
        if (err) {
          
          throw err;
          
        } else {
          
          multi.set('a', 1);
          multi.set({b: 2, c: 3});
          multi.setHash('myhash', {one: 1, two: 2});
          multi.incr('a');
          multi.decr('c');

          multi.exec(function(err, results) {
            
            if (err) {
              
              throw err;
              
            } else {
              
              multi.get('a');
              multi.get(['b', 'c']);
              multi.getHash('myhash');
              
              multi.exec(function(err, results) {
                
                if (err) {
                  
                  throw err;
                  
                } else {
                  
                  promise.emit('success', results);
                  
                }
                
              });
              
            }
            
          });
          
        }
        
      });
      
      return promise;
      
    },
    
    "Uses the storage backend's transaction mechanism (multi)": function(results) {
      var expected = [ //[ '2', '2', '2', { one: '1', two: '2' } ]
        '2', // Increased 1 to a (originally 1)
        '2', // b remains unaffected
        '2', // Decreased 1 from c (originally 3)
        {one: '1', two: '2'} // Original hash value
      ];
      
      assert.deepEqual(results, expected);
        
    }
    
  }
  
}).export(module);
