
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    StorageBatch = require('../fixtures/storage-batch'),
    EventEmitter = require('events').EventEmitter;

var sqliteStore;

var storageBatch = new StorageBatch('SQLiteStorage');

var batch = vows.describe('storages/sqlite.js').addBatch({
  
  'Integrity Checks': {
    
    topic: function() {
      sqliteStore = storageBatch.storage = app.getResource('storages/sqlite');
      if (sqliteStore.initialized) {
        return sqliteStore;
      } else {
        var promise = new EventEmitter();
        sqliteStore.events.once('init', function(client) {
          client.all("SELECT * FROM storage WHERE key=1", function(err, fields) {
            promise.emit('success', sqliteStore);
          });
        });
        return promise;
      }
    },

    'Created storage instance': function(storage) {
      assert.equal(storage.className, 'SQLiteStorage');
      assert.instanceOf(storage, protos.lib.storage);
    }
    
  }
  
});

// Storage API Tests
storageBatch.forEach(function(test) {
  batch = batch.addBatch(test);
});

batch.export(module);
