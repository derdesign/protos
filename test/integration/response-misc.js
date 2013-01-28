
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    util = require('util'),
    Multi = require('multi'),
    EventEmitter = require('events').EventEmitter;
    
var multi = new Multi(app);

multi.on('pre_exec', app.backupFilters);
multi.on('post_exec', app.restoreFilters);

var generalFilter, specificFilter;

app.locals.testval = 99;
app.locals.anotherVal = 101;

var testval, anotherVal;

app.once('view_locals', function(locals) {
  testval = locals.testval;
  anotherVal = locals.anotherVal;
});

vows.describe('Response Misc').addBatch({
  
  'Sending Headers': {
    
    topic: function() {
      
      var promise = new EventEmitter();
      
      app.config.rawViews = false;
      
      multi.clientRequest('/');
      multi.curl('-i -G -d "X-Custom-Header=1&X-Another-Header=2&x-lowercase-header=3" /setheaders');
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },

    'Headers are properly sent in the response': function(results) {
      var buf = results[0][0],
          headers = results[0][1];
      var expected = Object.keys(app.config.headers).map(function(elem) {
        return elem.toLowerCase();
      }).concat(['date', 'cache-control', 'connection', 'transfer-encoding']).sort();
      assert.deepEqual(Object.keys(headers).sort(), expected);
    },
    
    'Dynamic headers work according to function': function(results) {
      var buf = results[0][0],
          headers = results[0][1];
      assert.isFalse(isNaN(Date.parse(headers.date)));
      assert.equal(headers.status, '200 OK');
    },
    
    'Default Application headers can be overridden': function(results) {
      var headers = results[1].trim().split(/\r\n/);
      assert.isTrue(headers.indexOf('Content-Type: text/plain') >= 0);
      assert.isTrue(headers.indexOf('X-Powered-By: {PROTOS}') >= 0);
    },
    
    'OutgoingMessage::setHeaders works properly': function(results) {
      var headers = results[1].trim().split(/\r\n/);
      assert.isTrue(headers.indexOf('X-Custom-Header: 1') >= 0);
      assert.isTrue(headers.indexOf('X-Another-Header: 2') >= 0);
      assert.isTrue(headers.indexOf('x-lowercase-header: 3') >= 0);
    }
    
  }
  
}).addBatch({
  
  'Bad Requests': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      app.clientRequest({
        path: 'http://google.com',
        method: 'GET'
      }, function(err, buffer, headers, statusCode, response) {
        promise.emit('success', [err, buffer, headers, statusCode]);
      });
      
      return promise;
    },
    
    'Ignores malformed HTTP requests': function(results) {
      delete results[2].date; // Remove date from output
      assert.deepEqual(results, [ null, '', { connection: 'close', status: '400 Bad Request', 'transfer-encoding': 'chunked'}, 400 ]);
    }
    
  }
  
}).addBatch({
  
  'Cache Control': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      multi.curl('-i /'); // Dynamic
      multi.curl('-i /robots.txt'); // Static
      multi.curl('-i /404'); // Error
      
      multi.exec(function(err, results) {
        results = results.map(function(r) {
          r = r.trim().split(/\r\n/g);
          r = r.slice(0, r.indexOf(''))
          return r;
        });
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    'Properly set for dynamic resources': function(results) {
      var r = results[0];
      assert.isTrue(r.indexOf('Cache-Control: ' + app.config.cacheControl.dynamic) >= 0);
    },
    
    'Properly set for error pages': function(results) {
      var r = results[2];
      assert.isTrue(r.indexOf('Cache-Control: ' + app.config.cacheControl.error) >= 0);
    }
    
  }
  
}).addBatch({
  
  'Redirection': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      multi.curl('-i /redirect/test');
      multi.curl('-i /redirect/test?statusCode=301');
      multi.curl('-i /redirect/home');
      multi.curl('-i /redirect/login');
      
      multi.exec(function(err, results) {
        results = results.map(function(r) {
          return r.trim().split(/\r\n/);
        });
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    'OutgoingMessage::redirect works properly': function(results) {
      var r1 = results[0],
          r2 = results[1];
      assert.isTrue(r1.indexOf('HTTP/1.1 302 Moved Temporarily') >= 0);
      assert.isTrue(r1.indexOf('Location: ' + app.url('/test')) >= 0);
      assert.isTrue(r2.indexOf('HTTP/1.1 301 Moved Permanently') >= 0);
      assert.isTrue(r2.indexOf('Location: ' + app.url('/test')) >= 0);
    },
    
    'Application::home redirects properly': function(results) {
      var r = results[2];
      assert.isTrue(r.indexOf('HTTP/1.1 302 Moved Temporarily') >= 0);
      assert.isTrue(r.indexOf('Location: ' + app.url('/')) >= 0);
    },
    
    'Application::login redirects properly': function(results) {
      var r = results[3];
      assert.isTrue(r.indexOf('HTTP/1.1 302 Moved Temporarily') >= 0);
      assert.isTrue(r.indexOf('Location: ' + app.url(app.loginUrl)) >= 0);
    }
    
  }
  
}).addBatch({
  
  'Redirection (unauthorized)': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      var login = app.loginUrl;
      app.loginUrl = null;
      
      app.curl('-i /redirect/login', function(err, buf) {
        app.loginUrl = login;
        promise.emit('success', err || buf);
      });
      
      return promise;
    },
    
    'Application::login responds w/401 when app.loginUrl is null': function(results) {
      var r = results;
      // console.exit(r);
      assert.isTrue(r.indexOf('HTTP/1.1 401 Unauthorized') >= 0);
    }
    
  }
  
}).addBatch({
  
  'JSON Response': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      // NOTE: For testing purposes, JSON responses have pretty=false on the entire tests suite
      // This is set on text/fixtures/bootstrap.js. The tests below assume a non-pretty response.
      
      // Display a raw JSON response, to make assertions easier
      multi.curl('-i -G -d "name=ernie" -d "age=28" /hello.json');
      multi.curl('-i -G -d "name=ernie" -d "age=28" -d "jsoncallback=myCoolFunc" /hello.json');
      
      multi.exec(function(err, results) {
        
        if (err) promise.emit('success', err);
        
        // And now, pretty responses
        
        app.config.json.pretty = true;
        
        multi.curl('-i -G -d "name=ernie" -d "age=28" /hello.json');
        multi.curl('-i -G -d "name=ernie" -d "age=28" -d "jsoncallback=myCoolFunc" /hello.json');
        
        multi.exec(function(e, r) {
          promise.emit('success', e || results.concat(r));
          
          // NOTE: Setting JSON responses to non-pretty back again (for testing purposes)
          app.config.json = false;
          
        });
        
      });
      
      return promise;
    },
    
    'Are successfully sent with proper headers': function(results) {
      var r = results[0];
      assert.isTrue(r.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r.indexOf('Content-Type: ' + app.config.json.contentType) >= 0);
      assert.isTrue(r.indexOf('Connection: ' + app.config.json.connection) >= 0);
      assert.isTrue(r.indexOf('{"name":"ernie","age":"28","file":"hello.json"}') >= 0);
    },
    
    'Optionally displays JSON Callback': function(results) {
      var r = results[1];
      assert.isTrue(r.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r.indexOf('myCoolFunc({"name":"ernie","age":"28","jsoncallback":"myCoolFunc","file":"hello.json"})') >= 0);
    },
    
    'Are successfully sent with proper headers (pretty=true)': function(results) {
      var r = results[2];
      
      var expected = '{\n\
  "name": "ernie",\n\
  "age": "28",\n\
  "file": "hello.json"\n\
}';
      
      assert.isTrue(r.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r.indexOf('Content-Type: ' + app.config.json.contentType) >= 0);
      assert.isTrue(r.indexOf('Connection: ' + app.config.json.connection) >= 0);
      assert.isTrue(r.indexOf(expected) >= 0);
    },
    
    'Optionally displays JSON Callback (pretty=true)': function(results) {
      var r = results[3];
      
      var expected = 'myCoolFunc({\n\
  "name": "ernie",\n\
  "age": "28",\n\
  "jsoncallback": "myCoolFunc",\n\
  "file": "hello.json"\n\
})';
      
      assert.isTrue(r.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r.indexOf(expected) >= 0);
    }
    
  }
  
}).addBatch({
  
  'HTTP Message': {
    
    topic: function() {
      
      var promise = new EventEmitter();
      
      multi.curl('-i /response/http-message/scode-msg'); // 0
      multi.curl('-i -G -d "ob=1" /response/http-message/scode-msg'); // 1
      
      multi.curl('-i /response/http-message/scode-msg-raw'); // 2
      multi.curl('-i -G -d "raw=1&ob=1" /response/http-message/scode-msg-raw'); // 3
      
      multi.curl('-i /response/http-message/scode-raw'); // 4
      multi.curl('-i -G -d "raw=1&ob=1" /response/http-message/scode-raw'); // 5
      
      multi.curl('-i /response/http-message/scode'); // 6
      multi.curl('-i -G -d "ob=1" /response/http-message/scode'); // 7
      
      multi.curl('-i /response/http-message/msg'); // 8
      multi.curl('-i -G -d "ob=1" /response/http-message/msg'); // 9
       
      multi.curl('-i /response/http-message/msg-raw'); // 10
      multi.curl('-i -G -d "raw=1&ob=1" /response/http-message/msg-raw'); // 11
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
      
    },
    
    "Properly parses arguments and sends responses": function(results) {
      var r0 = results[0];
          r1 = results[1],
          r2 = results[2],
          r3 = results[3],
          r4 = results[4],
          r5 = results[5],
          r6 = results[6],
          r7 = results[7],
          r8 = results[8],
          r9 = results[9],
          r10 = results[10],
          r11 = results[11];

      // scode-msg
      assert.isTrue(r0.indexOf('HTTP/1.1 202 Accepted') >= 0);
      assert.isTrue(r0.indexOf('Content-Type: text/html') >= 0);
      assert.isTrue(r0.indexOf('\n<p>{{SUCCESS}}</p>\n') >= 0);

      // scode-msg [ob]
      assert.isTrue(r1.indexOf('HTTP/1.1 202 Accepted') >= 0);
      assert.isTrue(r1.indexOf('Content-Type: text/html') >= 0);
      assert.isTrue(r1.indexOf('\n<p>{{SUCCESS}}</p>\n') >= 0);
      
      // scode-msg-raw
      assert.isTrue(r2.indexOf('HTTP/1.1 202 Accepted') >= 0);
      assert.isTrue(r2.indexOf('Content-Type: text/html') >= 0);
      assert.isTrue(r2.indexOf('\n<p>{{SUCCESS}}</p>\n') >= 0);
      
      // scode-msg-raw [ob, raw]
      assert.isTrue(r3.indexOf('HTTP/1.1 202 Accepted') >= 0);
      assert.isTrue(r3.indexOf('Content-Type: text/plain') >= 0);
      assert.isTrue(r3.indexOf('\n{{SUCCESS}}') >= 0);
      
      // scode-raw
      assert.isTrue(r4.indexOf('HTTP/1.1 202 Accepted') >= 0);
      assert.isTrue(r4.indexOf('Content-Type: text/html') >= 0);
      assert.isTrue(r4.indexOf('\n<p>202 Accepted</p>\n') >= 0);
      
      // scode-raw [ob, raw]
      assert.isTrue(r5.indexOf('HTTP/1.1 202 Accepted') >= 0);
      assert.isTrue(r5.indexOf('Content-Type: text/plain') >= 0);
      assert.isTrue(r5.indexOf('\n202 Accepted\n') >= 0);
      
      // scode
      assert.isTrue(r6.indexOf('HTTP/1.1 202 Accepted') >= 0);
      assert.isTrue(r6.indexOf('Content-Type: text/html') >= 0);
      assert.isTrue(r6.indexOf('\n<p>202 Accepted</p>\n') >= 0);
      
      // scode [ob]
      assert.isTrue(r7.indexOf('HTTP/1.1 202 Accepted') >= 0);
      assert.isTrue(r7.indexOf('Content-Type: text/html') >= 0);
      assert.isTrue(r7.indexOf('\n<p>202 Accepted</p>\n') >= 0);
      
      // msg
      assert.isTrue(r8.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r8.indexOf('Content-Type: text/html') >= 0);
      assert.isTrue(r8.indexOf('\n<p>{{SUCCESS}}</p>\n') >= 0);
      
      // msg [ob]
      assert.isTrue(r9.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r9.indexOf('Content-Type: text/html') >= 0);
      assert.isTrue(r9.indexOf('\n<p>{{SUCCESS}}</p>\n') >= 0);
      
      // msg-raw
      assert.isTrue(r10.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r10.indexOf('Content-Type: text/html') >= 0);
      assert.isTrue(r10.indexOf('\n<p>{{SUCCESS}}</p>\n') >= 0);
      
      // msg-raw [ob, raw]
      assert.isTrue(r11.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r11.indexOf('Content-Type: text/plain') >= 0);
      assert.isTrue(r11.indexOf('\n{{SUCCESS}}') >= 0);
      
    },
    
  }
  
}).addBatch({
  
  'AJAX Response': {
    
    topic: function() {
      
      var promise = new EventEmitter();
      
      multi.curl('-i -H "X-Requested-With: XMLHttpRequest" /response/ajax-response?statusCode=202'); // Should ignore statusCode
      multi.curl('-i /response/ajax-response');
      multi.curl('-i /response/ajax-response?statusCode=202');
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
      
    },
    
    "Responds with plain text on AJAX Requests": function(results) {
      var r = results[0];
      assert.isTrue(r.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r.indexOf('Content-Type: text/plain; charset=utf-8') >= 0);
      assert.isTrue(r.indexOf('\r\nSUCCESS!') >= 0);
    },
    
    "Responds with the #msg template on non-AJAX Requests": function(results) {
      var r = results[1];
      assert.isTrue(r.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r.indexOf('Content-Type: text/html') >= 0);
      assert.isTrue(r.indexOf('<p>SUCCESS!</p>') >= 0);
    },
    
    "Accepts custom status codes to be sent on non-AJAX Requests": function(results) {
      var r = results[2];
      assert.isTrue(r.indexOf('HTTP/1.1 202 Accepted') >= 0);
      assert.isTrue(r.indexOf('Content-Type: text/html') >= 0);
      assert.isTrue(r.indexOf('<p>SUCCESS!</p>') >= 0);
    }
    
  }
  
}).addBatch({
  
  'Response Context & Filter': {

    topic: function() {

      // Note: this test also covers OutgoingMessage::setContext

      var promise = new EventEmitter();

      // Override multi, since filters are being restored on each exec
      var multi = new Multi(app);

      app.addFilter('context', function(buffer, locals) {
        return '-- ' + buffer + ' --';
      });
      
      // Note: specific_context is set by doing res.setContext('specific')

      app.addFilter('specific_context', function(buffer, locals) {
        return new Buffer(buffer).toString('base64');
      });
      
      app.addFilter('another_context', function(buffer, locals) {
        return buffer + ' <<ANOTHER CONTEXT>>';
      });
      
      app.addFilter('sweet_context', function(buffer, locals) {
        return buffer + ' <<SWEET CONTEXT>>';
      });

      multi.curl('/response/buffer/raw');
      multi.curl('/response/buffer');
      multi.curl('/response/buffer/specific');
      multi.curl('/response/buffer/multiple');

      multi.exec(function(err, results) {
        app.removeFilter('context');
        app.removeFilter('specific_context');
        app.removeFilter('another_context');
        app.removeFilter('sweet_context');
        promise.emit('success', err || results);
      });

      return promise;
    },

    "Does not apply on `res.end` calls": function(results) {
      var r1 = results[0];
      assert.equal(r1, 'THIS SHOULD NOT BE MODIFIED')
    },

    "Applies to the general context filter": function(results) {
      var r2= results[1];
      assert.equal(r2, "-- \n<p>HELLO</p>\n --");
    },

    "Applies to a specific filter": function(results) {
      var r3 = results[2];
      assert.equal(r3, "LS0gCjxwPldPUkxEPC9wPgogLS0=");
    },
    
    "Applies to multiple filters": function(results) {
      var r4 = results[3];
      assert.equal(r4, "LS0gCjxwPk1VTFRJUExFPC9wPgogLS0= <<ANOTHER CONTEXT>> <<SWEET CONTEXT>>");
    }

  }
  
}).addBatch({
  
  'Application Globals': {
    
    "Access app.locals as view locals": function() {
      assert.strictEqual(testval, app.locals.testval);
      assert.strictEqual(anotherVal, app.locals.anotherVal);
    }
    
  }
  
}).export(module);
