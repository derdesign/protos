
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    fs = require('fs'),
    assert = require('assert'),
    Multi = require('multi'),
    EventEmitter = require('events').EventEmitter;

vows.describe('View Rendering').addBatch({
  
  'View Messages (#msg template not present)': {
    
    topic: function() {
      
      var promise = new EventEmitter();

      var msgTemplate = app.fullPath('app/views/__restricted/msg.mustache');
      
      fs.renameSync(msgTemplate, msgTemplate + '1');
      
      app.clientRequest('/raw-message', function(err, buf, headers) {
        
        fs.renameSync(msgTemplate + 1, msgTemplate);
        
        promise.emit('success', [err, buf, headers]);
        
      });
      
      return promise;
      
    }, 
    
    'Sends responses in plain text with no template': function(data) {
      var err = data[0], buf = data[1], headers = data[2];
      assert.strictEqual(buf, "This is a raw message");
      assert.strictEqual(headers['content-type'], 'text/plain');
      assert.strictEqual(headers['status'], '200 OK');
    }
    
  },
  
  'Plain View Engine': {
    
    'Returns valid view buffer': function() {
      var buf = "<h1>HELLO WORLD</h1>";
      var tpl = app.engines.plain.render(buf);
      assert.strictEqual(buf, tpl(buf));
    }
    
  }

}).export(module);




























