
var app = require('../fixtures/bootstrap.js'),
    vows = require('vows'),
    assert = require('assert'),
    util = require('util'),
    Multi = require('multi'),
    EventEmitter = require('events').EventEmitter;
    
var multi = new Multi(app);

vows.describe('CSRF (middleware)').addBatch({
  
  '': {
    
    topic: function() {
      
    },
    

  }
  
}).export(module);