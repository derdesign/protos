
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert');

vows.describe('GraphicsMagick (middleware)').addBatch({
  
  '': {
    
    topic: function() {

      app.use('gm');
      
      return true;
      
    },
    
    "Binds the gm module to app.gm": function() {
      assert.isTrue(app.gm === protos.require('gm'));
    }
    
  }
  
}).export(module);