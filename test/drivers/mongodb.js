
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    util = require('util'),
    assert = require('assert'),
    colorize = protos.util.colorize,
    mongodb = require('mongodb'),
    Db = mongodb.Db,
    Cursor = mongodb.Cursor,
    Server = mongodb.Server,
    ObjectID = mongodb.ObjectID,
    Multi = require('multi'),
    ModelBatch = require('../fixtures/model-batch'),
    EventEmitter = require('events').EventEmitter;

var mongodb, multi, model, storageMulti;

var config = app.config.drivers.mongodb;

//Local variables for testing
var userId1, userId2;

var oid = new ObjectID('4de6abd5da558a49fc5eef29');

// Test Model
function TestModel() {

  this.driver = 'mongodb';

  this.properties = app.locals.commonModelProps;

}

util.inherits(TestModel, protos.lib.model);

var modelBatch = new ModelBatch();

var batch = vows.describe('drivers/mongodb.js').addBatch({
  
  'Integrity Checks': {
    
    topic: function() {
      var promise = new EventEmitter();

      mongodb = app.getResource('drivers/mongodb');
      multi = mongodb.multi();
      
      var dropTestDatabase = function() {
        mongodb.deleteWhere({
          collection: config.collection,
          condition: {}
        }, function(err, ok) {
          mongodb.client.dropDatabase(function(err) {
            mongodb.client.ensureIndex(config.collection, {_id: 1}, function(err) {
              promise.emit('success', err);
            });
          });
        });
      }

      if (mongodb.client) {
        dropTestDatabase();
      } else {
        mongodb.events.once('init', dropTestDatabase);
      }
      
      return promise;
      
    },
    
    'Sets db': function() {
      assert.instanceOf(mongodb.db, Db);
    },

    'Sets config': function() {
      assert.strictEqual(mongodb.config.host, app.config.drivers.mongodb.host);
    },
    
    'Sets client': function() {
      assert.instanceOf(mongodb.client, Db);
    },
    
    'Dropped test db': function(err) {
      assert.isNull(err);
    }
    
  }
}).addBatch({
  
  'Preliminaries': {
    topic: function() {
      var promise = new EventEmitter();

      var db = new Db(config.database, new Server(config.host, config.port), {safe: true});
      
      db.open(function(err, client) {
        if (err) throw err;
        else {
          client.collection(config.collection, function(err, collection) {
            if (err) throw err;
            else {
              
              var multi = new Multi(collection);
              
              // Remove everything before starting the test
              multi.remove({});
              
              // Should get an empty array
              multi.find();
              
              multi.exec(function(err, results) {
                if (err) throw err;
                else {
                  var cursor = results.pop();
                  cursor.toArray(function(err, docs) {
                    if (err) throw err;
                    else {
                      results.push(docs);
                      promise.emit('success', results);
                    }
                  });
                }
              });
            }
          });
        }
      });

      return promise;
    },
    
    'Cleaned up collection': function(results) {
      assert.deepEqual(results, [0, []]);
    }
   }
  
}).addBatch({
  
  'MongoDB::insertInto': {
    
    topic: function() {
      var promise = new EventEmitter();

      // Insert user 1
      multi.insertInto({
        collection: config.collection,
        values: {
          _id: 1,
          user: 'user1',
          pass: 'pass1'
        }
      });
      
      // Insert user 2
      multi.insertInto({
        collection: config.collection,
        values: {
          _id: 2,
          user: 'user2',
          pass: 'pass2'
        }
      });
      
      // Insert user 3 (with oid)
      multi.insertInto({
        collection: config.collection,
        values: {
          _id: new ObjectID('4de6abd5da558a49fc5eef29'),
          name: 'user3',
          pass: 'pass3'
        }
      });
      
      // Insert without values (error)
      multi.insertInto({
        collection: config.collection
      });
      
      multi.exec(function(err, results) {
        promise.emit('success', [err, results]);
      });
      
      return promise;
    },
    
    "Inserts records into the database": function(topic) {
      var results = topic[1],
          r1 = results[0],
          r2 = results[1],
          r3 = results[2],
          r4 = results[3];
      assert.deepEqual(r1, [{_id: 1, user: 'user1', pass: 'pass1'}]);
      assert.deepEqual(r2, [{_id: 2, user: 'user2', pass: 'pass2'}]);
      assert.equal(util.inspect(r3), util.inspect([{ _id: oid, name: 'user3', pass: 'pass3' }]));
    },
    
    "Properly reports errors": function(topic) {
      var err = topic[0].pop();
      assert.instanceOf(err, Error);
      assert.equal(err.toString(), "Error: MongoDB::insertInto: 'values' is missing");
    }
    
  }

}).addBatch({
  
  'MongoDB::queryWhere': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      // condition + collection
      multi.queryWhere({
        collection: config.collection,
        condition: {user: 'user1'}
      });
      
      // condition + collection + fields
      multi.queryWhere({
        collection: config.collection,
        fields: {pass: 1},
        condition: {user: {$in: ['user1', 'user2']}}
      });
      
      // No condition provided (error)
      multi.queryWhere({
        collection: config.collection,
      });
      
      multi.exec(function(err, results) {
        promise.emit('success', [err, results]);
      });
      
      return promise;
    },
    
    "Returns valid results": function(topic) {
      var results = topic[1],
          r1 = results[0],
          r2 = results[1];
      assert.deepEqual(r1, [{_id: 1, user: 'user1', pass: 'pass1'}]);
      assert.deepEqual(r2, [{_id: 1, pass: 'pass1' }, { _id: 2, pass: 'pass2'}]);
    },
    
    "Properly reports errors": function(topic) {
      var err = topic[0].pop();
      assert.instanceOf(err, Error);
      assert.equal(err.toString(), "Error: MongoDB::queryWhere: 'condition' is missing");
    }
    
  }

}).addBatch({
  
  'MongoDB::queryAll': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      // Query all
      multi.queryAll({
        collection: config.collection
      });
      
      // Query all + fields
      multi.queryAll({
        collection: config.collection,
        fields: {pass: 1}
      });
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    "Returns valid results": function(results) {
      var r1 = results[0],
          r2 = results[1];
      assert.deepEqual(r1[0], {_id: 1, user: 'user1', pass: 'pass1'});
      assert.deepEqual(r1[1], {_id: 2, user: 'user2', pass: 'pass2'});
      assert.equal(util.inspect(r1[2]), util.inspect({_id: oid, name: 'user3', pass: 'pass3'}));
      assert.deepEqual(r2[0], {_id: 1, pass: 'pass1'});
      assert.deepEqual(r2[1], {_id: 2, pass: 'pass2'});
      assert.equal(util.inspect(r2[2]), util.inspect({_id: oid, pass: 'pass3'}));
    }

  }
  
}).addBatch({
  
  'MongoDB::queryById': {
    
    topic: function() {
      var promise = new EventEmitter();

      // id (int) + collection
      multi.queryById({
        collection: config.collection,
        _id: 1
      });
      
      // id (string) + collection
      multi.queryById({
        collection: config.collection,
        _id: '4de6abd5da558a49fc5eef29'
      });
      
      // id (oid) + collection
      multi.queryById({
        collection: config.collection,
        _id: oid
      });
      
      // id (object) + collection
      multi.queryById({
        collection: config.collection,
        _id: {$lt: 2}
      });
      
      // id (array) + collection + fields
      multi.queryById({
        collection: config.collection,
        fields: {pass: 1},
        _id: [1, 2, '4de6abd5da558a49fc5eef29', oid, 99, '3de5abd4da447a40ab4dde18', new ObjectID('3de5abd4da447a40ab4dde18')]
      });
      
      // Missing id (error)
      multi.queryById({
        collection: config.collection
      });
      
      multi.exec(function(err, results) {
        promise.emit('success', [err, results]);
      });
      
      return promise;
    },
    
    "Returns valid results": function(topic) {
      var results = topic[1],
          r1 = results[0],
          r2 = results[1],
          r3 = results[2],
          r4 = results[3],
          r5 = results[4];
      assert.deepEqual(r1, [{_id: 1, user: 'user1', pass: 'pass1'}]);
      assert.equal(util.inspect(r2), util.inspect([{_id: oid, name: 'user3', pass: 'pass3'}]));
      assert.equal(util.inspect(r3), util.inspect([{_id: oid, name: 'user3', pass: 'pass3'}]));
      assert.deepEqual(r4, [{_id: 1, user: 'user1', pass: 'pass1'}]);
      assert.deepEqual(r5[0], {_id: 1, pass: 'pass1'});
      assert.deepEqual(r5[1], {_id: 2, pass: 'pass2'});
      assert.deepEqual(util.inspect(r5[2]), util.inspect({_id: oid, pass: 'pass3'}));
    },
    
    "Properly reports errors": function(topic) {
      var err = topic[0].pop();
      assert.instanceOf(err, Error);
      assert.equal(err.toString(), "Error: MongoDB::queryById: '_id' is missing");
    }

  }
  
}).addBatch({
  
  'MongoDB::count': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      multi.count({
        collection: config.collection
      });
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    "Returns correct count": function(results) {
      var r = results[0];
      assert.strictEqual(r, 3);
    }
    
  }
  
}).addBatch({
  
  'MongoDB::idExists': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      // MongoDB::idExists uses queryById, so we can pass an array of items,
      // the other data types have been tested in the previous test case
      
      multi.idExists({
        collection: config.collection,
        _id: [1, 2, 99, oid, '3de5abd4da447a40ab4dde18']
      });
      
      // Missing _id (error)
      multi.idExists({
        collection: config.collection
      });
      
      multi.exec(function(err, results) {
        promise.emit('success', [err, results]);
      });
      
      return promise;
    },
    
    "Returns valid results": function(topic) {
      var results = topic[1],
          r = results[0],
          expected = { 
            '1': { _id: 1, user: 'user1', pass: 'pass1' },
            '2': { _id: 2, user: 'user2', pass: 'pass2' },
            '99': null,
            '4de6abd5da558a49fc5eef29': { _id: oid, name: 'user3', pass: 'pass3' },
            '3de5abd4da447a40ab4dde18': null };
      
      assert.isTrue(r.constructor === Object);
      assert.equal(Object.keys(r).length, 5);
      assert.deepEqual(r['1'], expected['1']);
      assert.deepEqual(r['2'], expected['2']);
      assert.equal(r['99'], expected['99']);
      assert.equal(JSON.stringify(r['4de6abd5da558a49fc5eef29']), JSON.stringify(expected['4de6abd5da558a49fc5eef29']));
      assert.deepEqual(r['3de5abd4da447a40ab4dde18'], expected['3de5abd4da447a40ab4dde18']);
    },
    
    "Properly reports errors": function(topic) {
      var err = topic[0].pop();
      assert.instanceOf(err, Error);
      assert.equal(err.toString(), "Error: MongoDB::idExists: '_id' is missing");
    }
    
  }
  
}).addBatch({
  
  'MongoDB::updateWhere': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      // Update a single matched item, should only update id 1
      multi.updateWhere({
        collection: config.collection,
        condition: {_id: 1},
        values: {
          user: 'USER-1',
          pass: 'PASS-1',
          howdy: 99
        }
      });
      
      // Limit update to a single item, should only update id 2
      multi.updateWhere({
        collection: config.collection,
        condition: {_id: {$in: [2, oid]}},
        multi: false,
        values: {
          user: 'USER-2',
          pass: 'PASS-2',
        }
      });
      
      // Get all items, Should confirm that only id's 1 & 2 were updated 
      multi.queryAll({
        collection: config.collection,
      });
      
      // Update multiple items, should update id's 1 & 2
      multi.updateWhere({
        collection: config.collection,
        condition: {_id: {$in: [1,2]}},
        values: {
          user: 'USER',
          pass: 'PASS',
        }
      })
      
      // Get all items, Should confirm that id's 1 & 2 were updated
      multi.queryAll({
        collection: config.collection
      })
      
      // Should throw error if no condition is set
      multi.updateWhere({
        collection: config.collection
      });
      
      multi.exec(function(err, results) {
        promise.emit('success', [err, results]);
      });
      
      return promise;
    },
    
    "Updates values correctly": function(topic) {
      var results = topic[1],
          r1 = results[0],
          r2 = results[1],
          r3 = results[2],
          r4 = results[3],
          r5 = results[4],
          r6 = results[5];
          
      assert.deepEqual([r1, r2, r4, r6], ['OK', 'OK', 'OK', null]);
      
      var expected3 = JSON.stringify(r3);
      
      assert.equal(JSON.stringify(r3).length, expected3.length);
      assert.isTrue(expected3.indexOf(JSON.stringify(r3[0])) >= 0);
      assert.isTrue(expected3.indexOf(JSON.stringify(r3[1])) >= 0);
      assert.isTrue(expected3.indexOf(JSON.stringify(r3[2])) >= 0);
      
      var expected5 = JSON.stringify(r5);
      
      assert.equal(JSON.stringify(r5).length, expected5.length);
      assert.isTrue(expected5.indexOf(JSON.stringify(r5[0])) >= 0);
      assert.isTrue(expected5.indexOf(JSON.stringify(r5[1])) >= 0);
      assert.isTrue(expected5.indexOf(JSON.stringify(r5[2])) >= 0);
    },
    
    "Properly reports errors": function(topic) {
      var err = topic[0].pop();
      assert.instanceOf(err, Error);
      assert.equal(err.toString(), "Error: MongoDB::queryWhere: 'condition' is missing");
    }

  }
  
}).addBatch({
  
  'MongoDB::updateById': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      // Should update 1
      multi.updateById({
        collection: config.collection,
        _id: 1,
        multi: false,
        values: {
          user: '_USER_',
          pass: '_PASS_'
        }
      });
      
      // Verify that item 1 was updated
      multi.queryAll({
        collection: config.collection
      });
      
      // Should only update item 1
      multi.updateById({
        collection: config.collection,
        _id: [1, 2],
        multi: false,
        values: {
          user: 'USER***',
          pass: 'PASS***'
        }
      });
      
      // Should not update anything
      multi.updateById({
        collection: config.collection,
        _id: [99, 100, 101]
      });
      
      // Verify that a single item was updated
      multi.queryAll({
        collection: config.collection
      });
      
      // Missing _id (error)
      multi.updateById({
        collection: config.collection
      });
      
      multi.exec(function(err, results) {
        promise.emit('success', [err, results]);
      });
      
      return promise;
    },
    
    "Updates values correctly": function(topic) {
      var results = topic[1],
          r1 = results[0],
          r2 = results[1];
          
      // Should update 1
      assert.equal(r1, 'OK');
      
      // Verify that item 1 was updated
      var expected2 = JSON.stringify([{ _id: 1, howdy: 99, pass: '_PASS_', user: '_USER_' },
        { _id: 2, pass: 'PASS', user: 'USER' },
        { _id: oid, name: 'user3', pass: 'pass3' }]);
      
      assert.isArray(r2);
      assert.equal(r2.length, 3);
      assert.isTrue(expected2.indexOf(JSON.stringify(r2[0])) >= 0);
      assert.isTrue(expected2.indexOf(JSON.stringify(r2[1])) >= 0);
      assert.isTrue(expected2.indexOf(JSON.stringify(r2[2])) >= 0);
      
      var r3 = results[2],
          r4 = results[3];
      
      // Should only update item 1
      assert.equal(r3, 'OK');
      
      // Should not update anything
      assert.equal(r4, 'OK');
      
      var r5 = results[4];
      
      // Verify that a single item was updated
      var expected5 = JSON.stringify([{_id: 1, howdy: 99, pass: 'PASS***', user: 'USER***' },
        { _id: 2, pass: 'PASS', user: 'USER' },
        { _id: oid, name: 'user3', pass: 'pass3'}]);
      
      assert.equal(JSON.stringify(r5).length, expected5.length);
      assert.isTrue(expected5.indexOf(JSON.stringify(r5[0])) >= 0);
      assert.isTrue(expected5.indexOf(JSON.stringify(r5[1])) >= 0);
      assert.isTrue(expected5.indexOf(JSON.stringify(r5[2])) >= 0);
      
      var r6 = results[5];
      
      // Error, should be null
      assert.isNull(r6);
      
    },
    
    "Properly reports errors": function(topic) {
      var err = topic[0].pop();
      assert.instanceOf(err, Error);
      assert.equal(err.toString(), "Error: MongoDB::updateById: '_id' is missing");
    }
    
  }
  
}).addBatch({
  
  'MongoDB::deleteWhere': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      // Should delete item #1, but not 99 (does not exist)
      multi.deleteWhere({
        collection: config.collection,
        condition: {_id: {$in: [1, 99]}}
      });
      
      // An empty condition should remove all entries
      multi.deleteWhere({
        collection: config.collection,
        condition: {}
      });
      
      // Verify that all records were deleted
      multi.queryAll({
        collection: config.collection
      });
      
      // No condition (error)
      multi.deleteWhere({
        collection: config.collection,
      });
      
      
      multi.exec(function(err, results) {
        promise.emit('success', [err, results]);
      });
      
      return promise;
    },
    
    "Properly deletes values": function(topic) {
      var results = topic[1],
          r1 = results[0],
          r2 = results[1],
          r3 = results[2];
      assert.deepEqual([r1, r2], ['OK', 'OK']);
      assert.deepEqual(r3, []);
    },
    
    "Properly returns errors": function(topic) {
      var err = topic[0].pop();
      assert.instanceOf(err, Error);
      assert.equal(err.toString(), "Error: MongoDB::deleteWhere: 'condition' is missing");
    }
    
  }
  
}).addBatch({
  
  'MongoDB::deleteById': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      // Insert user 1
      multi.insertInto({
        collection: config.collection,
        values: {
          _id: 1,
          user: "user1",
          pass: "pass1"
        }
      });
      
      // Insert user 2
      multi.insertInto({
        collection: config.collection,
        values: {
          _id: 2,
          user: "user2",
          pass: "pass2"
        }
      });
      
      // Insert user 3
      multi.insertInto({
        collection: config.collection,
        values: {
          _id: 3,
          user: "user3",
          pass: "pass3"
        }
      });
      
      // Attempt to delete non-existent users
      multi.deleteById({
        collection: config.collection,
        _id: [99, 100, 101]
      });
      
      // Verify that no entries have been removed
      multi.queryAll({
        collection: config.collection
      });
      
      // Delete user 1
      multi.deleteById({
        collection: config.collection,
        _id: 1
      });
      
      // Delete users 2 & 3
      multi.deleteById({
        collection: config.collection,
        _id: [2, 3]
      });
      
      // Verify that entries 1, 2 and 3 have been removed
      multi.queryAll({
        collection: config.collection
      });
      
      // No id provided (error)
      multi.deleteById({
        collection: config.collection
      });
      
      multi.exec(function(err, results) {
        promise.emit('success', [err, results]);
      });
      
      return promise;
    },
    
    "Properly deletes values": function(topic) {
      var results = topic[1],
          r1 = results[0],
          r2 = results[1],
          r3 = results[2],
          r4 = results[3];
      assert.deepEqual(r1, [{_id: 1, user: 'user1', pass: 'pass1'}]);
      assert.deepEqual(r2, [{_id: 2, user: 'user2', pass: 'pass2'}]);
      assert.deepEqual(r3, [{_id: 3, user: 'user3', pass: 'pass3'}]);
      assert.equal(r4, 'OK');

      var r5 = results[4],
          expected5 = JSON.stringify([{ _id: 1, user: 'user1', pass: 'pass1' },
        { _id: 2, user: 'user2', pass: 'pass2' },
        { _id: 3, user: 'user3', pass: 'pass3' }]);

        assert.isArray(r5);
        assert.equal(r5.length, 3);
        assert.isTrue(expected5.indexOf(JSON.stringify(r5[0])) >= 0);
        assert.isTrue(expected5.indexOf(JSON.stringify(r5[1])) >= 0);
        assert.isTrue(expected5.indexOf(JSON.stringify(r5[2])) >= 0);
    },
    
    "Properly reports errors": function(topic) {
      var err = topic[0].pop();
      assert.instanceOf(err, Error);
      assert.equal(err.toString(), "Error: MongoDB::deleteById: '_id' is missing");
    }
    
  }
  
}).addBatch({
  
  'MongoDB::queryCached': {
    
    topic: function() {
      
      var promise = new EventEmitter();
      
      // ################### QUERY CACHING TESTS [DRIVER] #####################
      
      // Insert user1 + invalidate existing cache
      multi.queryCached({
        cacheInvalidate: 'test_user_query',
      }, 'insertInto', {
        collection: config.collection,
        values: { user: 'test_user1', pass: 'pass_user1', group: 'user_group' }
      });
      
      // Retrieve user 1 + store 'test_user_query' cache with only user1
      multi.queryCached({
        cacheID: 'test_user_query'
      }, 'queryWhere', {
        condition: {group: 'user_group'},
        collection: config.collection
      });
      
      // Insert user2
      multi.insertInto({
        collection: config.collection,
        values: { user: 'test_user2', pass: 'pass_user2', group: 'user_group' }
      });
      
      // Retrieve 'test_user_query' cache => Should return only user1, since it's returning from cache
      multi.queryCached({
        cacheID: 'test_user_query'
      }, 'queryWhere', {
        condition: {group: 'user_group'},
        collection: config.collection
      });
      
      // Insert user3 + invalidate 'test_user_query' cache
      multi.queryCached({
        cacheInvalidate: 'test_user_query',
      }, 'insertInto', {
        collection: config.collection,
        values: { user: 'test_user3', pass: 'pass_user3', group: 'user_group' }
      });
      
      // Retrieve 'test_user_query' cache => cache has been invalidated
      // New query should return test_user1, test_user2 and test_user3
      // Also, the query should set the timeout for 'test_user_query' to 3600 seconds
      multi.queryCached({
        cacheID: 'test_user_query',
        cacheTimeout: 3600
      }, 'queryWhere', {
        condition: {group: 'user_group'},
        collection: config.collection
      });
      
      // ################### QUERY CACHING TESTS [DRIVER] #####################
      
      multi.exec(function(err, results) {
        
        promise.emit('success', err || results);
        
      });
      
      return promise;
      
    },
    
    'Properly stores/retrieves/invalidates caches': function(results) {
      var r1 = results[0],
          r2 = results[1],
          r3 = results[2],
          r4 = results[3],
          r5 = results[4],
          r6 = results[5];
          
      // Insert user1 + invalidate existing cache
      assert.instanceOf(r1, Array);
      assert.equal(r1.length, 1);
      assert.isTrue(r1[0].user == 'test_user1' && r1[0].pass == 'pass_user1' && r1[0].group == 'user_group');
      
      // Retrieve user 1 + store 'test_user_query' cache with only user1
      assert.instanceOf(r2, Array);
      assert.equal(r2.length, 1);
      assert.isTrue(r2[0].user == 'test_user1' && r2[0].pass == 'pass_user1' && r2[0].group == 'user_group');
      
      // Insert user2
      assert.instanceOf(r3, Array);
      assert.equal(r3.length, 1);
      assert.isTrue(r3[0].user == 'test_user2' && r3[0].pass == 'pass_user2' && r3[0].group == 'user_group');
      
      // Retrieve 'test_user_query' cache => Should return only user1, since it's returning from cache
      assert.instanceOf(r4, Array);
      assert.equal(r4.length, 1);
      assert.isTrue(r4[0].user == 'test_user1' && r4[0].pass == 'pass_user1' && r4[0].group == 'user_group');
      
      // Insert user3 + invalidate 'test_user_query' cache
      assert.instanceOf(r5, Array);
      assert.equal(r5.length, 1);
      assert.isTrue(r5[0].user == 'test_user3' && r5[0].pass == 'pass_user3' && r5[0].group == 'user_group');
      
      // Retrieve 'test_user_query' cache => cache has been invalidated
      // New query should return test_user1, test_user2 and test_user3
      assert.instanceOf(r6, Array);
      assert.equal(r6.length, 3);
      assert.isTrue(r6[0].user == 'test_user1' && r6[0].pass == 'pass_user1' && r6[0].group == 'user_group');
      assert.isTrue(r6[1].user == 'test_user2' && r6[1].pass == 'pass_user2' && r6[1].group == 'user_group');
      assert.isTrue(r6[2].user == 'test_user3' && r6[2].pass == 'pass_user3' && r6[2].group == 'user_group');
    }
    
  }
  
}).addBatch({
  
  'Model API Compliance + Caching': {
    
    topic: function() {
      
      var promise = new EventEmitter();
      
      // Create model
      model = new TestModel();
      
      // Prepare model (initialize)
      model.prepare(app);
      
      // Override model context (not using className to detect context)
      model.context = config.collection;
      
      // Set modelBatch's closure vars (setter)
      modelBatch.model = model;
      
      // Cleanup collection
      mongodb.deleteWhere({
        collection: config.collection,
        condition: {}
      }, function(err, ok) {
        promise.emit('success', err || model);
      });
      
      return promise;
    },
    
    "Created testing model": function(model) {
      assert.instanceOf(model, TestModel);
    }
    
  }
  
});

// Model API Tests
modelBatch.forEach(function(test) {
  batch = batch.addBatch(test);
});

batch.export(module);
