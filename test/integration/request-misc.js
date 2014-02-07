
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    Multi = require('multi'),
    EventEmitter = require('events').EventEmitter;
    
var multi = new Multi(app);

multi.on('pre_exec', app.backupFilters);
multi.on('post_exec', app.restoreFilters);

vows.describe('Request Misc').addBatch({

  'AJAX Detection': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      multi.curl('-i /detect-ajax');
      multi.curl('-i -H "X-Requested-With: XMLHttpRequest" /detect-ajax');
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    "Detects AJAX requests properly": function(results) {
      var r1 = results[0],
          r2 = results[1];
      assert.isTrue(r1.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r1.indexOf('X-Ajax-Request: true') === -1); // Should not contain the header, it's not an ajax request
      assert.isTrue(r2.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r2.indexOf('X-Ajax-Request: true') >= 0);   // Should contain the header, it's an ajax request
    }
    
  }

}).addBatch({
  
  'Headers': {
    
    topic: function() {
      
      var promise = new EventEmitter();
      
      multi.curl('-i -H "X-Another-Header:1234" /get-header/X-Another-Header');
      multi.curl('-i -H "X-Another-Header:5678" /get-header/X-ANOTHER-HEADER');
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
      
    },
    
    "IncomingMessage:header(k) retrieves a header value": function(results) {
      var r1 = results[0],
          r2 = results[1];
      assert.isTrue(r1.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r1.indexOf('{"header":"X-Another-Header","value":"1234"}') >= 0);
      assert.isTrue(r2.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r2.indexOf('{"header":"X-ANOTHER-HEADER","value":"5678"}') >= 0);
    }

  }
  
}).addBatch({
  
  'Remote Address': {
    
    topic: function() {
      
      var promise = new EventEmitter();
      
      multi.curl('-i /get-ip');
      multi.curl('-i -H "X-Real-IP: 1.2.3.4" /get-ip');
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
      
    },
    
    "Returns valid remote address on presence of the X-Real-IP header": function(results) {
      var r = results[0];
      assert.isTrue(r.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r.indexOf('{"ip":"127.0.0.1"}') >= 0);
    },
    
    "Returns valid remote address": function(results) {
      var r = results[1];
      assert.isTrue(r.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r.indexOf('{"ip":"1.2.3.4"}') >= 0);
    }
    
  }
  
}).addBatch({
  
  'Referer URI': {
    
    topic: function() {
      
      var promise = new EventEmitter();
      
      app.curl('-e "http://domain.com?search= some bad @ url" /request/referer-test', function(err, buf) {
        promise.emit('success', err || buf);
      });
      
      return promise;
      
    },
    
    'Is auto encoded when available': function(ref) {
      assert.equal(ref, 'http://domain.com?search=%20some%20bad%20@%20url');
    }
    
  }
  
}).addBatch({
  
  'Query Data': {
    
    topic: function() {
      
      var promise = new EventEmitter();
      
      multi.curl('-i -X GET -G -d "name=der" -d "age=29" /request/query-data');
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
      
    },
    
    'Properly handles GET Query Fields': function(results) {
      var r = results[0];
      var expected = '{"name":"der","age":"29"}';
      assert.isTrue(r.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r.indexOf(expected) >= 0);
    }
    
  }
  
}).addBatch({
  
  'Page Title': {
    
    topic: function() {
      
      var promise = new EventEmitter();
      var oldTitle = app.config.title;
      
      app.config.title = "<"+ oldTitle +">";
      
      // Page title, default
      multi.curl("/request/title");
      
      // Specific Page Title
      multi.curl('-G -d "msg=<strong>Hello%20World</strong>" /request/title');
      
      // Request metadata
      multi.curl('/request/metadata');
      
      // Request metadata object
      multi.curl('/request/metadata/values');
      
      multi.exec(function(err, results) {
        app.config.title = oldTitle;
        promise.emit('success', err || results);
      });
      
      return promise;
    },

    "Sets default page title": function(results) {
      var r = results[0];
      assert.equal(r, '#&lt;My Application&gt;#');
    },
    
    "Sets custom page title": function(results) {
      var r = results[1];
      assert.equal(r, '#&lt;My Application&gt; &raquo; &lt;strong&gt;Hello World&lt;/strong&gt;#');
    },
    
    "Gets & Sets metadata/view locals": function(results) {
      var r = results[2];
      assert.equal(r, 'View local: [HELLO WORLD!]\nPassed: [HELLO WORLD!]');
    },
    
    "Ensures metadata set/get works properly": function(results) {
      var r = results[3].trim();
      var expected = '{"metadata":{"hello":"world","awesome":44,"coolio":true,"testing":null},"hello":"world","awesome":44,"coolio":true,"testing":null}';
      assert.equal(r, expected);
    }
    
  }
  
}).export(module);
