
var app = require('../fixtures/bootstrap');

var vows = require('vows'),
    assert = require('assert'),
    EventEmitter = require('events').EventEmitter;

var onBeforeCreateCheck;

vows.describe('Message Queue (middleware)').addBatch({
  
  '': {
    
    topic: function() {
      
      var promise = new EventEmitter();
      
      app.use('mq', {
        server: 'amqp://',
        queues: ['my_queue', 'another_queue'],
        exchanges: {
          alpha: {type: 'fanout'},
          beta: {type: 'topic'}
        },
        onBeforeCreate: function(multi) {
          onBeforeCreateCheck = 
            (Object.keys(app.mq.queues).length === 0)         // There should be no queues set
            && (Object.keys(app.mq.exchanges).length === 0)   // There should be no exchanges set
            && (multi.constructor.name == 'Multi')            // The parameter should contain a multi instance
            && (multi.queue instanceof Function && multi.exchange instanceof Function);   // Is the correct multi
        },
        onInitialize: function(err, queues, exchanges) {
          app.log("MQ Initialized...");
          app.mq.queue('', function(err, q) {
            var counter = 0;
            q.bind(exchanges.alpha, '');
            q.subscribe(function(msg) {
              promise.emit('success', msg.data.toString('utf8'));
            });
            var intID = setInterval(function() {
              counter++;
              exchanges.alpha.publish('', "Hello World! " + counter);
              clearTimeout(intID);
            }, 500);
          });
        }
      });
      
      return promise;

    },
    
    'Passes Integrity Checks': function() {
      assert.equal(app.mq.constructor.name, 'MessageQueue');
      assert.equal(app.mq.connection.constructor.name, 'Connection');
    },
    
    'Properly sets queues': function(msg) {
      var queues = app.mq.queues;
      assert.isTrue(typeof queues == 'object');
      assert.deepEqual(Object.keys(queues), ['my_queue', 'another_queue']);
      assert.isTrue(queues.my_queue.name == 'my_queue');
      assert.isTrue(queues.my_queue.constructor.name == 'Queue');
      assert.isTrue(queues.another_queue.name == 'another_queue');
      assert.isTrue(queues.another_queue.constructor.name == 'Queue');
    },
    
    'Properly sets random queues': function() {
      assert.isArray(app.mq.randomQueues);
      assert.isTrue(app.mq.randomQueues.length == 1);
      assert.equal(app.mq.randomQueues[0].constructor.name, 'Queue');
    },
    
    'Runs the onBeforeCreate callback': function() {
      assert.isTrue(onBeforeCreateCheck);
    },
    
    'Properly configures exchanges': function(msg) {
      var exchanges = app.mq.exchanges;
      assert.isTrue(typeof exchanges == 'object');
      assert.deepEqual(Object.keys(exchanges), ['alpha', 'beta']);
      assert.isTrue(exchanges.alpha.name == 'alpha');
      assert.isTrue(exchanges.alpha.constructor.name == 'Exchange');
      assert.isTrue(exchanges.alpha.options.type == 'fanout');
      assert.isTrue(exchanges.beta.name == 'beta');
      assert.isTrue(exchanges.beta.constructor.name == 'Exchange');
      assert.isTrue(exchanges.beta.options.type == 'topic');
    },
    
    'Messages are sent/received properly': function(msg) {
      assert.strictEqual(msg, 'Hello World! 1');
    }
    
  }
  
}).export(module);
