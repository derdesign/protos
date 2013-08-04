
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    util = require('util'),
    pathModule = require('path'),
    EventEmitter = require('events').EventEmitter;

app.logging = false;

vows.describe('lib/protos.js').addBatch({
  
  'Integrity Checks': {
    
    'Sets environment': function() {
      protos.environment = null; // Make sure it can't be overridden
      assert.isTrue(protos.environment !== null);
      delete protos.environment; // Make sure it can't be deleted
      assert.isTrue(/^(debug|development|travis)$/.test(protos.environment));
    },
    
    'Sets application': function() {
      assert.instanceOf(protos.app, protos.lib.application);
    },
    
    'Sets protos path': function() {
      var path = pathModule.resolve(__dirname, '../../');
      assert.equal(protos.path, protos.constructor.path + '/test/fixtures/test-protos');
    },
    
    'Inherits from EventEmitter': function() {
      // Framework inherits from EventEmitter indirectly
      assert.isFunction(protos.on);
      assert.isFunction(protos.emit);
    },
    
    'Detects drivers': function() {
      assert.isFunction(protos.drivers.mysql);
    },
    
    'Detects storages': function() {
      assert.isFunction(protos.storages.redis);
    },
    
    'Detects view engines': function() {
      assert.isFunction(protos.engines.ejs);
    }
    
  },
  
  'Protos::require': {
    
    'Returns the required module': function() {
      var module1 = protos.require('node_modules/multi'),
          module2 = protos.require('multi');
      assert.isFunction(module1);
      assert.isFunction(module2);
    },
    
    'Can require/reload modules without using module cache': function() {
      var h1 = protos.require('handlebars', true);
      var h2 = protos.require('handlebars', true);
      
      h1.a = 99;
      h2.a = 55;

      assert.equal(h1.a, 99);
      assert.equal(h2.a, 55);
    },
    
    'Accepts relative/absolute paths': function() {
      assert.isFunction(protos.require('./node_modules/multi'));
      assert.isFunction(protos.require('/node_modules/multi'));
    },
    
  },
  
  'Protos::production': {
    
    topic: function() {
      
      var out = {
        production: {  },
        other: {
          shouldbeString: protos.production('BAD VALUE', 'not-in-production'),
          shouldBeNull: protos.production('BAD VALUE'),
          shouldBeFalse: protos.production('BAD VALUE', false),
        }
      }
      
      // Simulate production by patching method
      var method = protos.production;
      var src = method.toString();
      var args = src.slice(0, src.indexOf('{')).match(/\((.*?)\)/)[1].split(', ').map(function(item) { return item.trim(); });
      
      // Replace production with current environment
      src = src.replace(/'production'/g, "'" + protos.environment + "'");
      src = src.slice(src.indexOf('{') + 1);
      src = src.slice(0, src.lastIndexOf('}'));
      
      // Test arguments
      out.args = args;
      
      // Temporarily use new method
      protos.production = new Function(args[0], args[1], src);
      
      // Test values as if it were the production environment
      out.production.shouldBeNumber = protos.production(99, 'BAD VALUE');
      out.production.shouldBeNull = protos.production(null, 'BAD VALUE');
      out.production.shouldBeFalse = protos.production(false, 'BAD VALUE');
      out.production.shouldBeTrue = protos.production();
      
      // Restore protos.production
      protos.production = method;
      
      return out;
      
    },
    
    'Returns expected values': function(results) {
      
      // Make sure that protos.production and app.production can't be deleted
      delete protos.production;
      delete app.production;
      
      var expected = {
        args: ['arg', 'val'],
        other: { 
          shouldbeString: 'not-in-production',
          shouldBeNull: null,
          shouldBeFalse: false 
        },
        production: { 
          shouldBeNumber: 99,
          shouldBeNull: null,
          shouldBeFalse: false,
          shouldBeTrue: true 
        }
      }
      
      assert.deepEqual(results, expected);
      assert.isFunction(protos.production);
      assert.isFunction(app.production);
      assert.strictEqual(protos.production, app.production);
    }
    
  }
  
}).export(module);