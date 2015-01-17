
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    util = require('util');
    
var Multi = protos.require('multi');
var EventEmitter = require('events').EventEmitter;

app.logging = false;

vows.describe('lib/controller.js').addBatch({
  
  'Integrity Checks': {
    
    'Routing functions are set': function() {
      
      var Controller = protos.lib.controller;
      var routeMethods = [ 
      
        'get', 
        'public_get', 
        'private_get', 
        'post', 
        'public_post', 
        'private_post', 
        'put', 
        'public_put', 
        'private_put', 
        '_delete', 
        'public_delete', 
        'private_delete', 
        'options', 
        'public_options', 
        'private_options', 
        'trace', 
        'public_trace', 
        'private_trace'
        
      ];
        
      assert.deepEqual(Controller.prototype.routeMethods, routeMethods);

      routeMethods.forEach(function(method) {
        assert.isFunction(Controller[method]);
      });

    }
    
  },
  
  'Controller::handler': {
    
    'Returns valid callbacks for each controller': function() {
      
      // Verify that handlerTests has valid functions
      var mainH, blogH;
      assert.isFunction(blogH = app.handlerTests.blog['some/handler/dir/file.js']);
      assert.isFunction(app.handlerTests.main['test.js']);
      assert.isFunction(app.handlerTests.main['test-dir/another.js']);
      assert.isFunction(mainH = app.handlerTests.main['blog:some/handler/dir/file.js']);
      assert.isFunction(app.handlerTests.test['handler.js']);
      
      // Test handler with multiple arguments
      var callback1 = app.controllers.main.handler('test.js', 1, 2, 3);
      var callback2 = app.controllers.main.handler('test.js');
      
      // Callback should be a function
      assert.isFunction(callback1);
      assert.isFunction(callback2);
      assert.isTrue(callback1 !== callback2); // a different callback is executed each time handler runs
      
      // Running callback, will have access to the arguments passed by the handler method
      assert.deepEqual(callback1(), [1, 2, 3]);
      assert.deepEqual(callback2(), [undefined, undefined, undefined]);
      
      // Foreign handlers should have same results as normal controller handlers
      assert.equal(mainH(), 44);
      assert.equal(blogH(), 44);
      
    }
    
  },
  
  'Controller::getControllerByAlias': {
    
    'Returns the correct controler': function() {
      var c1 = app.controller.getControllerByAlias('main'),
          c2 = app.controller.getControllerByAlias('test'),
          c3 = app.controller.getControllerByAlias('/test/hello');
      assert.instanceOf(c1, app.controller.constructor);
      assert.instanceOf(c2, app.controllers.test.constructor);
      assert.instanceOf(c3, app.controllers.test.constructor);
    },
    
    'Accepts start/end slashes in alias': function() {
      var ctor = protos.lib.controller;
      assert.instanceOf(app.controller.getControllerByAlias('/blog'), ctor);
      assert.instanceOf(app.controller.getControllerByAlias('blog/'), ctor);
      assert.instanceOf(app.controller.getControllerByAlias('/blog/'), ctor);
      delete app.controllers.blog;
    },
    
    'Returns undefined on unknown controller': function() {
      var returnedValue = app.controller.getControllerByAlias('/unknown');
      assert.isUndefined(returnedValue);
    },
    
  },
  
  'Controller::getAlias': {
    
    'Returns proper alias for a className': function() {
      var alias = app.controller.getAlias('BlogController');
      assert.equal(alias, 'blog');
    }
    
  },
  
  'Request State': {
    
    topic: function() {
      
      var promise = new EventEmitter();
      var multi = new Multi(app);
      
      multi.curl('-i /request-state');
      multi.curl('-i /request-state');
      multi.curl('-i /request-state');
      multi.curl('-i -G -d "check=true" /request-state');
      
      multi.exec(function(err, results) {
        if (err) {
          console.exit(err);
        } else {
          promise.emit('success', results);
        }
      });
      
      return promise;
      
    },
    
    'Is properly set for each request': function(results) {
      
      var r1 = results[0],
          r2 = results[1],
          r3 = results[2],
          r4 = results[3];
          
      assert.isTrue(r1.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r1.indexOf('{"a":1001,"b":101,"c":2}') >= 0);
      
      assert.isTrue(r2.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r2.indexOf('{"a":1002,"b":102,"c":3}') >= 0);
      
      assert.isTrue(r3.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r3.indexOf('{"a":1003,"b":103,"c":4}') >= 0);
      
      assert.isTrue(r4.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r4.indexOf('{"checksPassed":true,"length":3}') >= 0);
      
    }
    
  }
  
}).export(module);