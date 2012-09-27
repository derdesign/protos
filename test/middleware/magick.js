
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert');

vows.describe('ImageMagick (middleware)').addBatch({
  
  '': {
    
    topic: function() {

      app.use('magick');
      
      return true;
      
    },
    
    "Binds the node-imagemagick module to app.magick": function() {
      assert.isTrue(app.magick === protos.require('node-imagemagick'));
    }
    
  }
  
}).export(module);