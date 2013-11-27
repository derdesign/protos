
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

            // Insert second item. Ensures item is retrieved back and returned
            // NOTE: Using new, which uses insert under the hood
            multi.new(data.insert[1]);
            
            // Insert a few more records to test order of retrieval
            if (model.driver.className == 'MongoDB') {
              multi.create({id: 3, username: 'foo', password: 'bar'});
              multi.create({id: 4, username: 'foo1', password: 'bar'});
              multi.create({id: 5, username: 'foo2', password: 'bar'});
            } else {
              multi.create({username: 'foo', password: 'bar'});
              multi.create({username: 'foo1', password: 'bar'});
              multi.create({username: 'foo2', password: 'bar'});
            }
            

            // Attempt to insert data that does not validate => err is returned
            // Using create, which is an alias of new
            multi.create(data.insert[2]);

            multi.exec(function(err, results) {
              promise.emit('success', [err, results]);
            });
            
          });
          
          return promise;

        },

        'Inserts new models': function(args) {
          
          var err = args[0], results = args[1];
          
          // Assert proper errors returned
          assert.isArray(err);
          assert.equal(err.length, 6);
          assert.isNull(err[0]);
          assert.isNull(err[1]);
          assert.isNull(err[2]);
          assert.isNull(err[3]);
          assert.isNull(err[4]);
          assert.equal(err[5].toString(), "Error: TestModel: Unable to validate 'username': !@#$%");
          
          // Assert proper return values
          // NOTE: Tests if .new() returns created object
          assert.deepEqual(results, [ 1,
            { id: 2, username: 'user2', password: 'pass2' },
            { id: 3, username: 'foo', password: 'bar' },
            { id: 4, username: 'foo1', password: 'bar' },
            { id: 5, username: 'foo2', password: 'bar' },
            null ]);
          
        }

      }

    },
    
    get: {
      
      'Model API: get + cacheFilters': {

        topic: function() {
          var promise = new EventEmitter();

          multi.get([1,2], ['username']);

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
              found.filterValue = "OK2";
              return [err, found];
            }
          }, 'get', 1);
          
          // array
          multi.get([1,2]);
          
          // Returns null when id not found
          multi.get(99);
          
          // Returns empty array when group of id's not found
          multi.get([99, 100, 101]);
          
          // Returns empty array when custom query returns no results
          multi.get({
            id: 9999 // Querying by ID is valid because ID is an implicit property
          });

          // Returns multiple items ordered by id and descending
          multi.get({
            password: 'bar' 
          });
          
          multi.exec(function(err, results) {
            promise.emit('success', err || results);
          });
          
          return promise;
        },

        'Returns valid results': function(results) {
          
          // console.exit(results);
          
          var expected = [
            [ { id: 1, username: 'user'+process.pid }, { id: 2, username: 'user2' } ],
            [ { id: 1, username: 'user'+process.pid, password: 'pass1', filterValue: 'OK1' } ],
              { id: 1, username: 'user'+process.pid, password: 'pass1', filterValue: 'OK2' },
            [ { id: 1, username: 'user'+process.pid, password: 'pass1' }, { id: 2, username: 'user2', password: 'pass2' }],
            null,
            [],
            [],
            [ { id: 5, username: 'foo2', password: 'bar' }, // Gets items ordered by ID and in DESC order
              { id: 4, username: 'foo1', password: 'bar' },
              { id: 3, username: 'foo', password: 'bar' } ]
          ];
          
          assert.equal(results[0][0].className, 'TestModelObject');
          assert.equal(results[0][1].className, 'TestModelObject');
          assert.equal(results[2].className, 'TestModelObject');
          assert.equal(results[3][0].className, 'TestModelObject');
          assert.equal(results[3][1].className, 'TestModelObject');
          assert.equal(results[7][0].className, 'TestModelObject');
          assert.equal(results[7][1].className, 'TestModelObject');
          assert.equal(results[7][2].className, 'TestModelObject');
          
          assert.equal(results[0][0].constructor.name, 'ModelObject');
          assert.equal(results[0][1].constructor.name, 'ModelObject');
          assert.equal(results[2].constructor.name, 'ModelObject');
          assert.equal(results[3][0].constructor.name, 'ModelObject');
          assert.equal(results[3][1].constructor.name, 'ModelObject');
          assert.equal(results[7][0].constructor.name, 'ModelObject');
          assert.equal(results[7][1].constructor.name, 'ModelObject');
          assert.equal(results[7][2].constructor.name, 'ModelObject');
          
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

    }
    
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