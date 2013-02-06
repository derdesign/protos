
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    EventEmitter = require('events').EventEmitter;

vows.describe('Plain Rendering Engine').addBatch({
  
  '': {
    
    topic: function() {

      var promise = new EventEmitter();

      app.curl('/plain-view-engine', function(err, buffer) {
        
        promise.emit('success', err || buffer);
        
      });
      
      return promise;
      
    },
    
    "Returns valid view buffer": function(buffer) {
      var expected = '<!DOCTYPE html>\n<html lang="en-US">\n<head>\n<title>My Application</title>\n<meta charset="utf-8">\n\
</head>\n<body>\n  \n<h1>My Application</h1>\n\n<h1>This is the Plain View Engine</h1>\n\n</body>\n</html>';
      assert.strictEqual(buffer, expected);
    }
    
  }
  
}).export(module);