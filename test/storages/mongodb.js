
var _ = require('underscore'),
    app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    StorageBatch = require('../fixtures/storage-batch'),
    EventEmitter = require('events').EventEmitter;
    
var storageBatch = new StorageBatch('MongoStorage');

var batch = vows.describe('storages/mongodb.js').addBatch({
  
  'Integrity Checks': {
    
    topic: function() {
      var storage = storageBatch.storage = app.getResource('storages/mongodb');
      if (storage.client) {
        return storage;
      } else {
        var promise = new EventEmitter();
        storage.events.once('init', function() {
          promise.emit('success', storage);
        });
        return promise;
      }
    },

    'Created storage instance': function(storage) {
      assert.equal(storage.className, 'MongoStorage');
      assert.instanceOf(storage, protos.lib.storage);
    }
    
  }
  
});

// Storage API Tests
storageBatch.forEach(function(test) {
  batch = batch.addBatch(test);
});

batch.export(module);
