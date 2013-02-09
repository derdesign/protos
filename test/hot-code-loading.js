
var app = require('./fixtures/bootstrap'),
    vows = require('vows'),
    fs = require('fs'),
    assert = require('assert'),
    Multi = require('multi'),
    EventEmitter = require('events').EventEmitter;

var spec;

app.on('reload', function(__spec) {
  spec = __spec;
});
    
vows.describe('Hot Code Loading').addBatch({
  
  'Modifying runtime before reload...': function() {
    
    // include
    app.filters.testFilterOne = null;
    assert.isNull(app.filters.testFilterOne);
    
    // exts
    app.TEST_CONSTANT_A = null;
    assert.isNull(app.TEST_CONSTANT_A);
    
    // models
    app.usersModel.blah = 99;
    assert.equal(app.usersModel.blah, 99);
    
    // helpers
    app.mainHelper.blah = 100;
    assert.equal(app.mainHelper.blah, 100);
    
    // views
    app.views.callbacks.blah = 101;
    assert.equal(app.views.callbacks.blah, 101);
    
    // partials
    app.views.partials.main_jade = 102;
    assert.equal(app.views.partials.main_jade, 102);
    
    // handlers
    app.handlers.blog = null;
    assert.isNull(app.handlers.blog);
    
    // controllers
    app.controllers.main.blah = 103;
    assert.equal(app.controllers.main.blah, 103);
    
    // api
    app.api.methodOne = null;
    assert.isNull(app.api.methodOne);
    
  }
  
}).addBatch({
  
  'Reloading Components...': function() {
    
    app.reload({
      include: true,
      exts: true,
      models: true,
      helpers: true,
      views: true,
      partials: true,
      handlers: true,
      controllers: true,
      api: true
    });
    
  }

}).addBatch({
  
  'Verifying runtime after reload...': function() {

    // include
    assert.isFunction(app.filters.testFilterOne);
    
    // exts
    assert.isNotNull(app.TEST_CONSTANT_A);
    
    // models
    assert.isUndefined(app.usersModel.blah);
    
    // helpers
    assert.isUndefined(app.mainHelper.blah);
    
    // views
    assert.isUndefined(app.views.callbacks.blah);
    
    // partials
    assert.isFunction(app.views.partials.main_jade);
    
    // handlers
    assert.isNotNull(app.handlers.blog);
    
    // controllers
    assert.isUndefined(app.controllers.main.blah);
    
    // api
    assert.isFunction(app.api.methodOne);
    
  },
  
 "The 'reload' event is emitted with spec": function() {
   assert.deepEqual(spec, { include: true,
     exts: true,
     models: true,
     helpers: true,
     views: true,
     partials: true,
     handlers: true,
     controllers: true,
     api: true });
 }
  
}).export(module);
