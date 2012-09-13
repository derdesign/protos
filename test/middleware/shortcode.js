
var app = require('../fixtures/bootstrap'),
    fs = require('fs'),
    vows = require('vows'),
    assert = require('assert'),
    EventEmitter = require('events').EventEmitter;
    
vows.describe('Shortcode (middleware)').addBatch({
  
  '': {
    
    topic: function() {
      
      var promise = new EventEmitter();
      
      app.use('shortcode');
      
      app.shortcode.filterContext('numbers_test', {
        numbers: function(str) {
          return 123456789;
        }
      });
      
      app.curl('/shortcode-filter', function(err, buf) {
        promise.emit('success', err || buf);
      });
      
      return promise;
    },
    
    'Performs shortcode replacements successfully': function() {

      var buf = fs.readFileSync('test/fixtures/shortcode-source.txt').toString('utf8');
      var expected = fs.readFileSync('test/fixtures/shortcode-output.txt').toString('utf8');

      var upper = function(str) {
        return str.toUpperCase();
      }

      var output = app.shortcode.replace(buf, {
        short1: upper,
        short2: upper,
        short3: upper,
        short4: upper,
        '$short-5$^': upper
      });

      // Test all sorts of shortcode conditions
      assert.equal(output, expected);

      // Test single arguments + empty shortcodes
      buf = 'Hi there! this is [name][/name]';
      var out = app.shortcode.replace(buf, 'name', function(str) {
        return 'SPARTA!';
      });

      assert.equal(out, 'Hi there! this is SPARTA!');

    },

    'Properly parses shortcodes on given context': function(buf) {
      assert.equal(buf, 'These are some numbers: 123456789!!!');
    }
    
  }
  
}).export(module);
