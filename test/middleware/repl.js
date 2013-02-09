
var app = require('../fixtures/bootstrap.js'),
    vows = require('vows'),
    assert = require('assert'),
    fs = require('fs');
    
vows.describe('REPL (middleware)').addBatch({
  
  '': {
    
    topic: function() {
      app.use('repl');
      return app.repl;
    },
    
    "Properly attaches to application": function() {
      assert.equal(app.repl.constructor.name, 'ProtosRepl');
      assert.equal(app.repl.server.constructor.name, 'Server');
    },
    
    "Successfully creates UNIX Socket": function() {
      assert.isTrue(fs.existsSync(app.fullPath('tmp/repl.sock')));
    },
    
    "Successfully creates REPL Script": function() {
      var socket = app.fullPath('tmp/repl.sock');
      var script = app.fullPath('repl.sh');
      var buf = fs.readFileSync(script, 'utf8').trim();
      var expected = '#!/bin/sh\n\
\n\
socat READLINE UNIX-CONNECT:' + socket;
      assert.isTrue(fs.existsSync(script));
      assert.equal(buf, expected);
    },
    
    "Sets active connections getter": function() {
      app.repl.connections = 99; // If it's a getter, value won't change
      assert.equal(app.repl.connections, 0);
    }

  }
  
}).export(module);