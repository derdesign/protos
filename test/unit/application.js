
var app =require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    fs = require('fs'),
    util = require('util'),
    http = require('http'),
    Multi = require('multi'),
    EventEmitter = require('events').EventEmitter;

app.logging = false;

var multi = new Multi(app);

multi.on('pre_exec', app.backupFilters);
multi.on('post_exec', app.restoreFilters);

var beforeInitCheck;

app.onInitialize(function() {
  beforeInitCheck = true;
});

vows.describe('lib/application.js').addBatch({

  'Integrity Checks': {
    
    'Sets environment': function() {
      app.environment = null; // Make sure it can't be overridden
      assert.isTrue(app.environment !== null);
      delete app.environment; // Make sure it can't be deleted
      assert.isTrue(/^(debug|development|travis)$/.test(app.environment));
    },
    
    'Sets domain': function() {
      assert.equal(app.hostname, 'localhost');
    },
    
    'Sets cluster': function() {
      assert.strictEqual(app.cluster, require('cluster'));
    },

    'Sets application path': function() {
      assert.equal(app.path, protos.constructor.path + '/test/fixtures/' + app.skelDir);
    },

    'Sets default controller': function() {
      assert.instanceOf(app.controller, protos.lib.controller);
    },

    'Inherits from EventEmitter': function() {
      assert.instanceOf(app, EventEmitter);
    },

    'Initializes models': function() {
      assert.instanceOf(app.models.users, protos.lib.model);
    },

    'Initializes helpers': function() {
      assert.equal(app.helpers.main.className, 'MainHelper');
    },

    'Initializes controllers': function() {
      assert.instanceOf(app.controllers.main, protos.lib.controller);
    },

    'Initializes protos engines': function() {
      assert.instanceOf(app.engines.eco, protos.lib.engine);
    },

    'Initializes application engines': function() {
      assert.instanceOf(app.engines.eco, protos.lib.engine);
    },
    
    'Properly registers inflection shortcut': function() {
      assert.deepEqual(app.inflect.constructor, protos.inflect.constructor);
    },
    
    'Properly registers helper aliases': function() {
      assert.deepEqual(app.mainHelper.constructor, app.helpers.main.constructor);
    },
    
    'Properly registers partials': function() {
      
      var expected = [
        'footer',
        'header',
        'widget',
        'mydir_mywidget',
        'main_coffeekup',
        'main_dot',
        'main_eco',
        'main_ejs',
        'main_haml',
        'main_hamlcoffee',
        'main_handlebars',
        'mailer_template',
        'main_hogan',
        'main_jade',
        'main_jazz',
        'main_jqtpl',
        'main_jshtml',
        'main_kernel',
        'main_liquor',
        'main_swig',
        'main_whiskers',
        '$link',
        '$jazz_link',
        '$kernel_link',
        '$sanitize',
        '$wrap',
        '$escape',
        '$safe_str' ];
        
      var partials = Object.keys(app.views.partials);
        
      expected.sort();
      partials.sort();
      
      // Ensure partials are registered correctly
      assert.deepEqual(partials, expected);
      
      // Ensure all partials are functions
      for (var key in app.views.partials) {
        assert.isFunction(app.views.partials[key]);
      }

    },
    
    'Properly runs application event hooks': function() {
      assert.isTrue(app.hooks.init.__loaded);
      assert.isTrue(app.hooks.pre_init.__loaded);
    }
    
  }

}).addBatch({

  'Application Bootstrap': {

   'Successfully emits bootstrap events': function() {
      assert.isTrue(app.__initBootstrapEvent);
    }

  }

}).addBatch({
  
  'Directory Structure Tests': {
    
    'Properly Loads API methods from include/': function() {
      
      var sampleMethod = app.require('api/sample-method.js');
      var otherMethods = app.require('api/other-methods.js');
      
      // This method (anotherMethod) is not added via the api/ directory, instead
      // it is loaded from the include/ directory. This demonstrates that the include/
      // directory is sourced before the api/ directory.
      // 
      // This is for testing purposes only, it is recommended to add API methods using
      // the api/ directory as per the original design.
      
      var anotherMethod = app.require('include/api.js');
      
      assert.deepEqual(Object.keys(anotherMethod).sort(), ['anotherMethod']);
      assert.deepEqual(Object.keys(sampleMethod).sort(), ['sampleMethod']);
      assert.deepEqual(Object.keys(otherMethods).sort(), ['methodOne', 'methodTwo']);
      assert.deepEqual(Object.keys(app.api).sort(), ['anotherMethod', 'methodOne', 'methodTwo', 'sampleMethod'].sort());
      
      assert.strictEqual(app.api.anotherMethod, anotherMethod.anotherMethod);
      assert.strictEqual(app.api.methodOne, otherMethods.methodOne);
      assert.strictEqual(app.api.methodTwo, otherMethods.methodTwo);
      assert.strictEqual(app.api.sampleMethod, sampleMethod.sampleMethod);
      
      assert.equal(app.api.anotherMethod(), 99);
      assert.equal(app.api.sampleMethod(), 100);
      assert.equal(app.api.methodOne(), 101);
      assert.equal(app.api.methodTwo(), 102);
    },
    
    'Properly Loads Extensions from ext/': function() {
      // Test constants
      assert.equal(app.TEST_CONSTANT_A, 103);
      assert.equal(app.TEST_CONSTANT_B, 104);
      
      // Test app extensions
      assert.isFunction(app.testMethodOne);
      assert.isFunction(app.testMethodTwo);
      
      // Test extension output values
      assert.equal(app.testMethodOne(), "Output for app.testMethodOne");
      assert.equal(app.testMethodTwo(), "Output for app.testMethodTwo");
    },
    
    'Properly loads & extends objects from include/': function() {
      
      // Test filters
      var libFilters = app.require('include/filters.js');
      assert.deepEqual(Object.keys(libFilters).sort(), ['testFilterOne', 'testFilterTwo'])
      assert.deepEqual(Object.keys(app.filters).sort(), ['testFilterOne', 'testFilterTwo']);
      assert.isFunction(app.filters.testFilterOne);
      assert.isFunction(app.filters.testFilterTwo);
      assert.strictEqual(app.filters.testFilterOne, libFilters.testFilterOne);
      assert.strictEqual(app.filters.testFilterTwo, libFilters.testFilterTwo);
      assert.equal(app.filters.testFilterOne(), "Output from app.filters.testFilterOne");
      assert.equal(app.filters.testFilterTwo(), "Output from app.filters.testFilterTwo");
      
      // Test globals
      var libGlobals = app.require('include/globals.js');
      assert.deepEqual(Object.keys(libGlobals).sort(), ['globalVarOne', 'globalVarTwo'].sort());
      assert.strictEqual(app.globals.globalVarOne, libGlobals.globalVarOne);
      assert.strictEqual(app.globals.globalVarTwo, libGlobals.globalVarTwo);
      assert.equal(app.globals.globalVarOne, 105);
      assert.equal(app.globals.globalVarTwo, 106);
      
      // Test inflection
      assert.deepEqual(app.someProp, {value: 99});
      
    }
    
  }
  
}).addBatch({
  
  'Application::onInitialize': {
    
    "Successfully runs callbacks before the 'init' event": function() {
      assert.isTrue(beforeInitCheck);
    },
    
    "Successfully runs callbacks after the 'init' event": function() {
      assert.isTrue(app.afterInitCheck);
    }
    
  },

  'Application::url': {

    'Returns proper url when no args provided': function() {
      assert.equal(app.url(), util.format('http://%s:%s', app.hostname, protos.config.server.listenPort));
    },

    'Returns proper url when run with path argument': function() {
      var q = '/item?id=25';
      assert.equal(app.url(q), util.format('http://%s:%s%s', app.hostname, protos.config.server.listenPort, q));
    }

  },

  'Application::relPath': {

    'Returns a relative application path': function() {
      var fullPath = app.path + '/views/main';
      assert.equal(app.relPath(fullPath), 'views/main');
    },

    'Works when passing offset argument': function() {
      var fullPath = app.path + '/views/main/main-index.html';
      assert.equal(app.relPath(fullPath, 'views/main'), 'main-index.html');
    },

    'Handles offset argument w/slashes correctly': function() {
      var fullPath = app.path + '/views/main/main-index.html',
          expected = 'main-index.html';
      assert.equal(app.relPath(fullPath, '/views/main'), expected);
      assert.equal(app.relPath(fullPath, '/views/main/'), expected);
      assert.equal(app.relPath(fullPath, 'views/main/'), expected);
    }

  },

  'Application::fullPath': {

    'Returns the full path of an application resource': function() {
      assert.equal(app.fullPath('views/main'), app.path + '/views/main');
    }

  },

  'Application::mkdir': {
    
    topic: function() {
      var promise = new EventEmitter();
      var exists, p = '__' + process.pid + '__';
      app.mkdir(p);
      process.nextTick(function() {
        p = app.fullPath(p);
        exists = fs.existsSync(p);
        fs.rmdirSync(p);
        promise.emit('success', exists);
      });
      return promise;
    },
    
    'Successfully creates directories': function(exists) {
      assert.isTrue(exists);
    }
    
  },

  'Application::addFilter': {

    topic: function() {
      app.addFilter('filter', function(data) {
        /* Filter 1 */
        data.push('>>');
        return data;
      });

      app.addFilter('filter', function(data) {
        /* Filter 2 */
        data.unshift('<<');
        return data;
      });
      
      app.addFilter('multiple_filter', function(counter, a, b, c) {
        return (counter + a + b + c);
      });

      return app.__filters;
    },

    'Properly registers filters': function(filters) {
      assert.isArray(filters.filter);
      assert.strictEqual(filters.filter.length, 2);
      assert.isTrue(filters.filter[0].toString().indexOf('/* Filter 1 */') >= 0);
      assert.isTrue(filters.filter[1].toString().indexOf('/* Filter 2 */') >= 0);
    }

  },
  
  'Application::applyFilters': {

    topic: function() {
      return [
        app.applyFilters('filter', ['data']),
        app.applyFilters('multiple_filter', 10, 1, 2, 3) // Sums 16
      ];
    },

    'Returns valid values': function(topic) {
      assert.deepEqual(topic[0], ['<<', 'data', '>>']);
    },
    
    'Accepts multiple arguments': function(topic) {
      assert.equal(topic[1], 16);
    }

  },
  
  'Application::removeFilter': {
    
    topic: function() {
      
      var backup = app.__filters;
      var cb = function() {};
      
      app.__filters = {};
      
      app.addFilter('my_filter', cb);
      app.addFilter('another_filter', function() {});
      
      return {backup: backup, cb: cb};
      
    },
    
    'Removes a single filter callback': function(data) {
      assert.deepEqual(app.__filters.my_filter, [data.cb]);
      app.removeFilter('my_filter', data.cb);
      assert.deepEqual(app.__filters.my_filter, []);
    },
    
    'Removes all callbacks in filter': function(data) {
      assert.isArray(app.__filters.another_filter);
      app.removeFilter('another_filter');
      assert.isTrue(typeof app.__filters.another_filter == 'undefined');
      
      // Restore filters
      app.__filters = data.backup;
    }
    
  },

  'Application::registerViewHelper': {

    topic: function() {
      var ob = {
        self: true,
        method: function() {
          if (this.self === true) return '{OK}';
          else return '{FAIL}';
        }
      }

      app.registerViewHelper('method', ob.method);
      app.registerViewHelper('method_with_context', ob.method, ob);

      return ob;
    },

    "Properly registers view helpers": function(ob) {
      var partials = app.views.partials,
          src = partials.$method_with_context.toString();
      assert.equal(partials.$method(), '{FAIL}');
      assert.equal(partials.$method_with_context(), '{OK}');
    }

  },

}).addBatch({

  'Application::getResource': {

    topic: function() {
      
      app.context = {
        alpha: {name: 'alpha'},
        beta: {
          gamma: {name: 'gamma'}
        }
      }

      app.resources.my_resource = '{RESOURCE}';

      return app.getResource('storages/redis');

    },

    'Gets {context}/{resource}': function() {
      var drv = app.getResource('context/alpha');
      assert.equal(drv.name, 'alpha');
    },

    'Gets {context}/{group}:{resource}': function() {
      var drv = app.getResource('context/beta:gamma');
      assert.equal(drv.name, 'gamma');
    },

    'Gets {resource}': function() {
      assert.equal(app.getResource('my_resource'), '{RESOURCE}');
    },

    'Works asynchronously if callback provided': function(storage) {
      assert.instanceOf(storage, protos.storages.redis);
    }

  }

}).addBatch({
  
  'Application::createHash': {
    
    topic: function() {

      var hashes = {
        md5: app.createHash('md5', "Hello World"),                              // Default md5 hash
        sha512: app.createHash('sha512:hex', "Hello World"),                    // sha512 hash, digested as hex (default)
        sha256_utf8: app.createHash('sha256:base64', "Café del Mar", 'utf8'),   // sha256 hash, digested as base64, utf8 input encoding
        sha256_ascii: app.createHash('sha256:base64', "Café del Mar", 'ascii')  // sha256 hash, digested as base64, ascii input encoding
      };
      
      return hashes;

    },
    
    "Calculates Hashes w/ multiple algorithms and input/digest encodings": function(hashes) {
      assert.strictEqual(hashes.md5, 'b10a8db164e0754105b7a99be72e3fe5');
      assert.strictEqual(hashes.sha512, '2c74fd17edafd80e8447b0d46741ee243b7eb74dd2149a0ab1b9246fb30382f27e853d8585719e0e67cbda0daa8f51671064615d645ae27acb15bfb1447f459b');
      assert.strictEqual(hashes.sha256_utf8, 'x5FUEkXkvqlBMk5j6L6drmhu/hRRWIOjosUEEp/hTMU=');
      assert.strictEqual(hashes.sha256_ascii, 'gPuwtRDXGV5hpZ+WbxIlOYKMVhPCztI1KTgKqE+vPPs=');
    },
    
  }
  
}).addBatch({
  
  'Application::md5': {
    
    topic: function() {
      var md5 = app.md5('Hello World');
      return md5;
    },
    
    "Returns valid md5 hashes (hex)": function(md5) {
      assert.equal(md5, 'b10a8db164e0754105b7a99be72e3fe5');
    }

  }
  
}).addBatch({
  
  'Application::uuid': {
    
    topic: function() {
      return [app.uuid(), app.uuid(), app.uuid()];
    },
    
    "Returns valid UUIDs": function(results) {
      var re = app.regex.uuid;
      var u1 = results[0],
          u2 = results[1],
          u3 = results[2];
      assert.isTrue(u1 !== u2 && u2 !== u3 && u1 !== u3);
      assert.isTrue(re.test(u1));
      assert.isTrue(re.test(u2));
      assert.isTrue(re.test(u3));
    }

  }
  
}).addBatch({
  
  'Application::escapeJson': {
    
    topic: function() {
      var json = app.escapeJson({name: "Ernie", age: 29, likes: ['hello', 'world']});
      return json;
    },
    
    "Returns html-escaped JSON string": function(json) {
      assert.equal(json, '{&#34;name&#34;:&#34;Ernie&#34;,&#34;age&#34;:29,&#34;likes&#34;:[&#34;hello&#34;,&#34;world&#34;]}');
    }

  }
  
}).addBatch({

  'Application::curl': {

    topic: function() {

      // Handle the upcoming requests manually (prevent conflicts with engine tests)
      app.on('request', function(req, res) {
        if (req.url == '/request-test') {
          req.stopRoute();
          res.sendHeaders();
          res.end('SUCCESS');
        } else if (req.url == '/request-headers-test') {
          req.stopRoute();
          res.sendHeaders();
          res.end('x-custom-header' in req.headers ? 'SUCCESS' : 'FAIL');
        } else if (req.method == 'PUT' && req.url == '/') {
          req.stopRoute();
          res.statusCode = 400;
          res.sendHeaders();
          res.end('BAD REQUEST');
        }
      });

      var promise = new EventEmitter();
      multi.curl('/request-test');
      multi.curl('-X PUT /');
      multi.curl('-i http://google.com');
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      return promise;
    },

    'Returns valid data': function(results) {
      var r1 = results[0],
          r2 = results[1];
      assert.isTrue(r1 == 'SUCCESS');
      assert.isTrue(r2 == 'BAD REQUEST');
    },

    'Can access external URLs': function(results) {
      var r = results[2];
      assert.isTrue(r.indexOf("HTTP/1.1 301 Moved Permanently") >= 0);
      assert.isTrue(r.indexOf("Location: http://www.google.com/") >= 0);
    }

  }

}).addBatch({

  'Application::clientRequest': {

    topic: function() {
      var promise = new EventEmitter();
      multi.clientRequest('/request-test');
      multi.clientRequest({path: '/', method: 'PUT'});
      multi.clientRequest({
        path: '/request-headers-test',
        method: 'GET',
        headers: { 'x-custom-header': 1 }
      });
      multi.exec(function(err, results) {
        app.removeAllListeners('request'); // Remove `request` listeners (set on previous test case)
        promise.emit('success', err || results);
      });
      return promise;
    },

    'Returns valid responses & data': function(results) {
      var r1 = results[0],
          r2 = results[1];
      assert.equal(r1[0], 'SUCCESS');
      assert.equal(r1[1].status, '200 OK');
      assert.equal(r1[2], 200);
      assert.isTrue(r1[3] instanceof http.IncomingMessage);
      assert.equal(r2[0], 'BAD REQUEST');
      assert.equal(r2[1].status, '400 Bad Request');
      assert.equal(r2[2], 400);
      assert.isTrue(r2[3] instanceof http.IncomingMessage);
    },

    'Allows sending custom headers': function(results) {
      var r = results[2];
      assert.equal(r[0], 'SUCCESS');
      assert.equal(r[1].status, '200 OK');
      assert.equal(r[2], 200);
    }

  }

}).addBatch({
  
  'HEAD Requests': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      app.curl('-I /', function(err, buffer) {
        promise.emit('success', err || buffer);
      });
      
      return promise;
    },
    
    "Responds properly to HEAD requests": function(buffer) {
      assert.isTrue(buffer.indexOf('HTTP/1.1 301 Moved Permanently') >= 0);
      assert.isTrue(buffer.indexOf('Location: ' + app.url('/')) >= 0);
    }
    
  }
  
}).addBatch({
  
   'Async Queue and "ready" event': {
     
     "The 'ready' event is fired after flushing all queues": function() {
       assert.isTrue(app.__readyEventFired);
     },
     
   }

}).addBatch({
  
  'Application::onReady': {
    
    topic: function() {
      
      var promise = new EventEmitter();
      
      var results = [app.__readyCallbackFired];

      app.onReady(function() {
        results.push(true);
        promise.emit('success', results);
      });

      return promise;
      
    },
    
    "Successfully runs callbacks before 'ready' event": function(results) {
      assert.isTrue(results[0]);
    },
    
    "Successfully runs callbacks after 'ready' event": function(results) {
      assert.isTrue(results[1]);
    }
    
  }
  
}).export(module);
