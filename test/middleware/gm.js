
var app = require('../fixtures/bootstrap');

if (app.environment === 'travis') return;

var fs = require('fs'),
    vows = require('vows'),
    assert = require('assert'),
    EventEmitter = require('events').EventEmitter;
    
var inFile = app.fullPath("priv/nodejs.png");
var outFile1 = app.fullPath("priv/out1.png");
var outFile2 = app.fullPath("priv/out2.png");

function doTest(promise) {
  
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
  
}

function assertProcess(err) {
  assert.isNull(err);
  assert.isTrue(fs.existsSync(outFile1));
  fs.unlinkSync(outFile1);
}

function assertThumb(err) {
  assert.isNull(err);
  assert.isTrue(fs.existsSync(outFile2));
  fs.unlinkSync(outFile2);
}

vows.describe('GraphicsMagick (middleware)').addBatch({
  
  "Graphics Magick": {
    
    topic: function() {
      
      var promise = new EventEmitter();

      app.use('gm');
      
      doTest(promise);
      
      return promise;
      
    },
    
    "The app.gm.process() method works as expected": function(err) {
      assertProcess(err);
    },

    "The app.gm.thumb() method works as expected": function(err) {
      assertThumb(err);
    }

  }
  
}).addBatch({
  
  "ImageMagick": {
    
    topic: function() {
      
      app.use('gm');
      
      app.gm.useImageMagick();
      
      var promise = new EventEmitter();
      
      doTest(promise);
      
      return promise;
      
    }, 
    
    "The app.gm.process() method works as expected": function(err) {
      assertProcess(err);
    },
  
    "The app.gm.thumb() method works as expected": function(err) {
      assertThumb(err);
    }
    
  }
  
}).export(module);
