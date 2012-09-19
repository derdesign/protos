
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert');

app.logging = false;

vows.describe('Session (middleware) » Unit Tests').addBatch({
  
  'Session::createHash': {
    
    'Returns valid {sessId} for guest sessions': function() {
      var ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/535.7 (KHTML, like Gecko) Chrome/16.0.912.75',
          hash = app.session.createHash(ua, true)
      var props = Object.getOwnPropertyNames(hash);
      assert.isTrue(props.length === 1 && props[0] == 'sessId' && app.regex.uuid.test(hash.sessId));
    }
    
  },
  
  'Session::typecast': {
    
    topic: function() {
      app.session.config.typecastVars = ['vInt', 'vFloat', 'vNull', 'vBool']
      return app.session.typecast({
        vInt: '5',
        noConv: '5',
        vFloat: '2.3',
        vNull: 'null',
        vBool: 'true'
      });
    },
    
    'Converts integer': function(o) {
      assert.isTrue(o.vInt === 5);
    },
    
    'Converts float': function(o) {
      assert.isTrue(o.vFloat === 2.3);
    },
    
    'Converts null': function(o) {
      assert.isNull(o.vNull);
    },
    
    'Converts boolean': function(o) {
      assert.isTrue(o.vBool);
    },
    
    'Skips keys not in typecastVars': function(o) {
      assert.equal(o.noConv, '5');
    }
    
  }
  
}).export(module);