
var app = require('../fixtures/bootstrap');

if (app.environment === 'travis') return;

var fs = require('fs'),
    vows = require('vows'),
    assert = require('assert'),
    EventEmitter = require('events').EventEmitter;
    
var inFile = app.fullPath("priv/nodejs.png");
var outFile1 = app.fullPath("priv/out1.png");
var outFile2 = app.fullPath("priv/out2.png");

vows.describe('GraphicsMagick (middleware)').addBatch({
  
  "": {
    
    topic: function() {
      
      var promise = new EventEmitter();

      app.use('gm');
      
      // Test the multi method
      
      var multi = app.gm.multi();
      
      // Test the process method
      
      multi.process({
        in: inFile,
        out: outFile1,
        operations: {
          resize: [80, 0],    // Tests multiple arguments
          sepia: true,        // Tests no arguments
          edge: 3             // Tests single argument
        }
      });
      
      // Test the thumb method
      
      multi.thumb(inFile, 100, 100, outFile2, 85);
      
      // Run batch
      
      multi.exec(function(err, results) {
        promise.emit('success', err);
      });
      
      return promise;
      
    },
    
    "The app.gm.process() method works as expected": function(err) {
      assert.isNull(err);
      assert.isTrue(fs.existsSync(outFile1));
      fs.unlink(outFile1);
    },

    "The app.gm.thumb() method works as expected": function(err) {
      assert.isNull(err);
      assert.isTrue(fs.existsSync(outFile2));
      fs.unlink(outFile2);
    }

  }
  
}).export(module);
