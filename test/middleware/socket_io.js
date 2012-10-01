
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    Manager = require('socket.io').Manager,
    EventEmitter = require('events').EventEmitter;

var envSuccess;

vows.describe('SocketIO (middleware)').addBatch({
  
  '': {
    
    topic: function() {

      var results = [],
          promise = new EventEmitter();
      
      var options = {
        sockets: {
          chat: '/chat',
          news: '/news'
        },
        environments: {}
      }

      // Test is environment-agnostic
      
      // In order for the test to run, environments have to work, so this
      // is actually a test. On failure, the test will not run.
      options.environments[protos.environment] = function(io) {
        io.__testVal = 99;
        promise.emit('success', io);
      }
      
      app.use('socket_io', options);
      
      return promise;
      
    },
    
    "Properly registers into 'app.io'": function(io) {
      assert.equal(app.io.__testVal, io.__testVal); // check for same object
      assert.instanceOf(app.io, Manager); // check for valid instance
    },
    
    "Properly registers socket namespaces in 'app.sockets'": function() {
      assert.deepEqual(Object.keys(app.sockets), ['main', 'chat', 'news']);
      assert.equal(app.sockets.main.constructor.name, 'SocketNamespace');
      assert.equal(app.sockets.chat.constructor.name, 'SocketNamespace');
      assert.equal(app.sockets.news.constructor.name, 'SocketNamespace');
    }
    
  }
  
}).export(module);