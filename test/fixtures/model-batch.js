
var assert = require('assert'),
    EventEmitter = require('events').EventEmitter;

var testData = {
  SQLite: { // pkey constraint, need auto_increment
    insert: [
      {username: 'user'+process.pid, password: 'pass1'},
      {username: 'user2', password: 'pass2'},
      {username: '!@#$%', password: 'pass3'}] // invalid
  },
  MySQL: { // pkey constraint, need auto_increment
    insert: [
      {username: 'user'+process.pid, password: 'pass1'},
      {username: 'user2', password: 'pass2'},
      {username: '!@#$%', password: 'pass3'}] // invalid
  },
  PostgreSQL: { // pkey constraint, need auto_increment
    insert: [
      {username: 'user'+process.pid, password: 'pass1'},
      {username: 'user2', password: 'pass2'},
      {username: '!@#$%', password: 'pass3'}] // invalid
  },
  MongoDB: {
    insert: [ // mongodb is more flexible when it comes to id's
      {id: 1, username: 'user'+process.pid, password: 'pass1'},
      {id: 2, username: 'user2', password: 'pass2'},
      {id: 3, username: '!@#$%', password: 'pass3'}] // invalid
  }
}

function ModelBatch() {
  
  var data, model, multi;
  
  var instance = {
    
    insert: {

      'Model API: insert': {

        topic: function() {
          
          var promise = new EventEmitter();
          
          // Need to make sure cache is working by flushing the redis cache
          model.driver.storage.client.flushall(function() {
            
            // Invalidate testmodel:user_cache

            // ################### QUERY CACHING TESTS [MODELS] #####################

            // Insert first item
            multi.queryCached({
             cacheInvalidate: 'user_cache'
            }, 'insert', data.insert[0]);

            // ################### QUERY CACHING TESTS [DRIVER] #####################

            // Insert second item
            multi.insert(data.insert[1]);

            // Attempt to insert data that does not validate => err is returned
            multi.insert(data.insert[2])

            multi.exec(function(err, results) {
              promise.emit('success', err || results);
            });
            
          });
          
          return promise;

        },

        'Inserts new models': function(results) {
          assert.isArray(results);
          assert.equal(results.length, 3);
          assert.isNull(results[0]);
          assert.isNull(results[1]);
          assert.equal(results[2].toString(), "Error: TestModel: Unable to validate 'username': !@#$%");
        }

      }

    },
    
    get: {

      'Model API: get + cacheFilters': {

        topic: function() {
          var promise = new EventEmitter();

          // object + model cache store
          multi.queryCached({
            cacheID: 'user_cache',
            cacheFilter: function(err, found) {
              found[0].filterValue = "OK1";
              return [err, found];
            }
          }, 'get', {
            username: 'user'+process.pid
          });
          
          // integer + model cache store w/ timeout
          multi.queryCached({
            cacheID: 'another_cache',
            cacheTimeout: 3600,
            cacheFilter: function(err, found) {
              found[0].filterValue = "OK2";
              return [err, found];
            }
          }, 'get', 1);
          
          // array
          multi.get([1,2]);

          multi.exec(function(err, results) {
            promise.emit('success', err || results);
          });

          return promise;
        },

        'Returns valid results': function(results) {
          var expected = [
            [{ username: 'user'+process.pid, password: 'pass1', id: 1, filterValue: "OK1"}], // Proves that filters work
            [{ username: 'user'+process.pid, password: 'pass1', id: 1, filterValue: "OK2"}], // Proves that filters work
            [ [{ username: 'user'+process.pid, password: 'pass1', id: 1 }],
              [{ username: 'user2', password: 'pass2', id: 2 }] ] ];

          // var util = require('util');
          // 
          // console.log(util.inspect(expected, false, 99));
          // 
          // console.exit(util.inspect(results, false, 99));
          
          assert.deepEqual(results, expected);
        }

      }

    },
    
    save: {

      'Model API: save': {

        topic: function() {
          var promise = new EventEmitter();

          // save => success
          multi.save({id: 1, username: '__user1', password: '__pass1'});

          // save + update => success
          multi.save({id: 1, username: '__user1__', password: '__pass1__'});

          // partial save => success
          multi.save({id: 1, username: '__user1__updated'});

          // save with data that does not validate => err is returned
          multi.save({id: 1, username: '!#$%^&*'});

          multi.exec(function(err, results) {
            promise.emit('success', err || results);
          });

          return promise;
        },

        'Updates model data': function(err, results) {
          assert.instanceOf(results, Array);
          assert.equal(results.length, 4);
          assert.isNull(results[0]);
          assert.isNull(results[1]);
          assert.isNull(results[2]);
          assert.equal(results[3].toString(), "Error: TestModel: Unable to validate 'username': !#$%^&*");
        }

      }

    },
    
    delete: {

      'Model API: delete': {

        topic: function() {
          var promise = new EventEmitter();

          // integer
          multi.delete(2);

          // array
          multi.delete([1, 2]);

          multi.exec(function(err, results) {
            promise.emit('success', err || results);
          });

          return promise;
        },

        'Properly deletes from database': function(results) {
          assert.deepEqual(results, ['OK', 'OK']);
        }

      }

    },
    
  }
  
  // Defining a `model` setter, to prevent conflicts with vows
  instance.__defineSetter__('model', function(m) {
    model = m;
    multi = model.multi();
    data = testData[model.driver.className];
  });
  
  // Attach to current batch
  instance.forEach = function(callback) {
    var keys = Object.keys(this);
    for (var test, i=0; i < keys.length; i++) {
      var key = keys[i],
          item = this[key];
      if (typeof item == 'object') callback(item);
    }
  }
  
  return instance;
}

module.exports = ModelBatch;