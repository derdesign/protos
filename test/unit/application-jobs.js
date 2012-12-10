
var app =require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    EventEmitter = require('events').EventEmitter;

var storage;

var state = {
  myImmedJobCounter: 0,
  runTimes: 0
}

var events = {
  queue_job: [],
  remove_job: [],
  invalidate_cache_key: [],
  cache_key_invalidate_success: [],
  clear_cache_key_interval: []
}

app.on('queue_job', function(job) {
  events.queue_job.push(job);
});

app.on('remove_job', function(job) {
  events.remove_job.push(job);
});

app.on('invalidate_cache_key', function(job) {
  events.invalidate_cache_key.push(job);
});

app.on('cache_key_invalidate_success', function(job) {
  events.cache_key_invalidate_success.push(job);
});

app.on('clear_cache_key_interval', function(job) {
  events.clear_cache_key_interval.push(job);
});

vows.describe('lib/application.js').addBatch({
  
  'Application::addJob': {
    
    topic: function() {
      
      var promise = new EventEmitter();
      
      // Local immedJob
      var immedJob;
      
      // Add job, running task immediately
      app.addJob('my_immed_job', function() {
        immedJob = 1;
        state.myImmedJobCounter++;
      }, 100, true);
      
      // Assign immedJob after running addJob
      state.immedJob = immedJob;
      
      state.retval = app.addJob('my_job', function(first) {
        state.shouldBeTrue = true; // This should not call immediately
        state.runTimes++;
      }, 100);
      
      setTimeout(function() {
        promise.emit('success');
      }, 600);
      
      return promise;
      
    },
    
    'Successfully adds job and returns instance': function() {
      assert.strictEqual(app, state.retval); // Returns app instance
      assert.isUndefined(state.shouldBeTrue); // Callback never runs
      assert.isFalse(app.__jobExecutionState.my_immed_job); // Registers state
      assert.isFalse(app.__jobExecutionState.my_job); // Register state
      assert.equal(app.__jobIntervalIDs.my_immed_job.constructor.name, 'Timer'); // Sets interval
      assert.equal(app.__jobIntervalIDs.my_job.constructor.name, 'Timer'); // Sets interval
    },
    
    'Runs job callback when runImmed is true': function() {
      assert.equal(state.immedJob, true); // Runs callback
      assert.equal(state.myImmedJobCounter, 1); // Callback runs one time
    }
    
  }
  
}).addBatch({
  
  'Application::queueJob': {
    
    topic: function() {
      
      var promise = new EventEmitter();
      
      delete state.retval;
      
      app.queueJob('my_immed_job');
      app.queueJob('my_job');
      
      setTimeout(function() {
        
        app.queueJob('my_immed_job');
        app.queueJob('my_job');
        
        setTimeout(function() {
          
          promise.emit('success');
          
        }, 200);
        
      }, 200);
      
      return promise;
    },
    
    'Successfully queues jobs': function() {
      assert.equal(state.myImmedJobCounter, 3); // Should run 2 times (previous value: 1)
      assert.equal(state.runTimes, 2); // Should run 2 times (previous value: 0)
      assert.isTrue(state.shouldBeTrue); // Should be set to true when run
    },
    
    "Properly emits the 'queue_job' event": function() {
      assert.deepEqual(events.queue_job, ['my_immed_job', 'my_job', 'my_immed_job', 'my_job']); // Should catch 4 events
      assert.deepEqual(events.remove_job, []); // No queues have been removed yet, events have not fired
    }
    
  }
  
}).addBatch({
  
  'Application::removeJob + Events': {
    
    topic: function() {
      
      var promise = new EventEmitter();
      
      // Queueing jobs again
      app.queueJob('my_immed_job');
      app.queueJob('my_job');
      
      // Removing jobs afterwards
      app.removeJob('my_immed_job');
      app.removeJob('my_job');
      
      setTimeout(function() {
        
        // Queuing jobs (should have no effect and should'nt throw any exceptions)
        app.queueJob('my_immed_job');
        app.queueJob('my_job');
        
        setTimeout(function() {
          
          promise.emit('success');
          
        }, 200);
        
      }, 200);
      
      return promise;
      
    },
    
    'Successfully removes jobs': function() {
      assert.equal(state.myImmedJobCounter, 3); // Should be the same as previous test case
      assert.equal(state.runTimes, 2); // Should be the same as previous test case
      assert.isTrue(state.shouldBeTrue); // Should be the same as previous test case
      
    },
    
    "Properly emits the 'queue_job' event": function() {
      assert.deepEqual(events.queue_job, ['my_immed_job', 'my_job', 'my_immed_job', 'my_job', 'my_immed_job', 'my_job']); // Should catch 6 events
      assert.deepEqual(events.remove_job, ['my_immed_job', 'my_job']); // Should catch 2 events only (doesn't do nothing after removal)
    },
    
    "Properly removes job data": function() {
      var jobIntervalIDs = app.__jobIntervalIDs;
      var jobExecutionState = app.__jobExecutionState;
      
      assert.isFalse('my_job' in jobIntervalIDs);
      assert.isFalse('my_job' in jobExecutionState);
      
      assert.isFalse('my_immed_job' in jobIntervalIDs);
      assert.isFalse('my_immed_job' in jobExecutionState);
    }
    
  }
  
}).addBatch({
  
  'Application::invalidateCacheInterval \nApplication::invalidateCacheKey \nApplication::clearCacheKeyInterval': {
    
    topic: function() {
      
      storage = app.storages.redis;
      
      var out = {};
      var promise = new EventEmitter();
      var multi = storage.multi({parallel: true});
      
      multi.set('cache1', 1);
      multi.set('cache2', 2);
      multi.set('cache3', 3);
      multi.set('cache4', 4);
      
      multi.exec(function(err, results) {
        if (err) {
          
          // This means the values were set
          throw err;
          
        } else {
          
          // Set the cache
          app.invalidateCacheInterval({
            key: 'my_cache_key',
            cacheID: ['cache1', 'cache2', 'cache3', 'cache4'],
            storage: storage,
            interval: 100
          });
          
          // Invalidate the cache
          app.invalidateCacheKey('my_cache_key');
          
          setTimeout(function() {
            
            // Ok, cache should have been invalidated by now
            
            multi.get('cache1');
            multi.get('cache2');
            multi.get('cache3');
            multi.get('cache4');
            
            multi.exec(function(err, results) {
              
              if (err) {
                
                // This means no errors retrieving values
                throw err;
                
              } else {
                
                // Store first check
                out.firstCheck = results;
                
                // Set the values again
                
                multi.set('cache1', 1);
                multi.set('cache2', 2);
                multi.set('cache3', 3);
                multi.set('cache4', 4);
                
                multi.exec(function(err, results) {
                  
                  if (err) {
                    
                    // There were errors saving the values
                    throw err;
                    
                  } else {
                    
                    // Ok,  values set again, invalidate...
                    app.invalidateCacheKey('my_cache_key');
                    
                    // ... Immediately clear interval ...
                    app.clearCacheKeyInterval('my_cache_key');
                    
                    // Sleep for 200 ms again
                    
                    setTimeout(function() {
                      
                      // Get values again
                      
                      multi.get('cache1');
                      multi.get('cache2');
                      multi.get('cache3');
                      multi.get('cache4');
                      
                      multi.exec(function(err, results) {
                        
                        if (err) {
                          
                          // There were errors retrieving values
                          throw err;
                          
                        } else {
                          
                          // Set second check
                          out.secondCheck = results;
                          
                          // Test cache purge
                          
                          multi.set('cache1', 1);
                          multi.set('cache2', 2);
                          multi.set('cache3', 3);
                          multi.set('cache4', 4);
                          
                          multi.exec(function(err, results) {
                            
                            if (err) {
                              
                              // There were errors retrieving values
                              throw err;
                              
                            } else {
                              
                              app.purgeCacheKey('my_cache_key', function() {
                                
                                multi.get('cache1');
                                multi.get('cache2');
                                multi.get('cache3');
                                multi.get('cache4');
                                
                                multi.exec(function(err, results) {
                                  
                                  if (err) {
                                    
                                    // Error retrieving results
                                    throw err;
                                    
                                  } else {
                                    
                                    // Set third check
                                    out.thirdCheck = results;
                                    
                                    // Exit test case
                                    promise.emit('success', out);
                                    
                                  }
                                  
                                });
                                
                              });
                              
                            }
                            
                          });
                          
                        }
                        
                      });
                      
                    }, 200);
                    
                  }
                  
                });
                
              }
              
            });
            
          }, 200);
          
        }
      });
      
      return promise;
      
    },
    
    'Successfully add/queue/invalidate cache keys': function(out) {
      assert.deepEqual(out.firstCheck, [ null, null, null, null ]); // This means caches were invalidated
      assert.deepEqual(out.secondCheck, ['1', '2', '3', '4']); // This means interval was properly cleared (values are still there)
    },
    
    'Successfully purges cache keys': function(out) {
      assert.deepEqual(out.thirdCheck, [ null, null, null, null ]);
    },
    
    'Properly emit events': function() {
      // The cache key appears two times, the first is from the call to app.invalidateCacheKey, and the
      // second one, is from the app.purgeCacheKey call, which makes the cache to be invalidated two times, and the
      // even to be fired two times as well.
      assert.deepEqual(events.cache_key_invalidate_success, ['my_cache_key', 'my_cache_key']);
      
      // The cache key invalidation only occurs two times. When purging the cache key, the invalidation event is not fired.
      assert.deepEqual(events.invalidate_cache_key, ['my_cache_key', 'my_cache_key']);
      
      assert.deepEqual(events.clear_cache_key_interval, ['my_cache_key']);
    }
    
  }
  
}).export(module);
