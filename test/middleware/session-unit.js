
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert');

app.logging = false;

vows.describe('Session (middleware) » Unit Tests').addBatch({
  
  'Session::config': {
    
    'Properly parses time duration strings': function() {
    
      assert.deepEqual(app.session.config, {
        guestSessions: false,
        regenInterval: 300,
        permanentExpires: 2592000,
        defaultExpires: 86400,
        temporaryExpires: 86400,
        guestExpires: 604800,
        typecastVars: [ 'vInt', 'vFloat', 'vNull', 'vBool' ],
        autoTypecast: true,
        sessCookie: '_sess',
        hashCookie: '_shash',
        salt: 'abc1234',
        storage: 'redis'
      });

    }
    
  },
  
  'Session::createHash': {
    
    'Returns valid {sessId} for guest sessions': function() {
      var hash = app.session.createHash(true);
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