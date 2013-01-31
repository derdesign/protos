
var app = require('../fixtures/bootstrap');

var fs = require('fs'),
    vows = require('vows'),
    assert = require('assert'),
    EventEmitter = require('events').EventEmitter;
    
var Multi = protos.require('multi');

var inFile = app.fullPath("priv/nodejs.png");
var outFile = app.fullPath("priv/out.png");

vows.describe('GraphicsMagick (middleware)').addBatch({
  
  "": {
    
    topic: function() {
      
      var promise = new EventEmitter();

      app.use('gm');
      
      app.gm.process({
        in: inFile,
        out: outFile,
        operations: {
          resize: [80, 0],      // Tests multiple arguments
          sepia: true,          // Tests no arguments
          quality: 80           // Tests single argument
        }
      }, function(err) {
        promise.emit('success', err || null);
      });
      
      return promise;
      
    },
    
    "Properly converts images": function(err) {
      assert.isNull(err);
      assert.isTrue(fs.existsSync(outFile));
      fs.unlink(outFile);
    },

    "Returns valid Multi object": function(err) {
      var multi = app.gm.multi();
      assert.isTrue(multi instanceof Multi);
      assert.isTrue(multi.process instanceof Function);
    }
    
  }
  
}).export(module);
