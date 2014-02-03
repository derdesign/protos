
var app = require('./fixtures/bootstrap'),
    vows = require('vows'),
    fs = require('fs'),
    assert = require('assert'),
    Multi = require('multi'),
    EventEmitter = require('events').EventEmitter;

var before, after;

app.on('before_reload', function(spec) {
  before = spec;
});

app.on('after_reload', function(spec) {
  after = spec;
});

var __data, __templates;

var testHook = app.fullPath('hook/test_hook.js');
var testHookBuf = fs.readFileSync(testHook, 'utf8');
var otherHook = app.fullPath('hook/other_hook.js');
var otherHookDisabled = app.fullPath('other_hook.js');

var envFile = app.fullPath('deploy.json');
var envFile1 = app.fullPath('deploy1.json');
var envFileTmp = app.fullPath('deploy1.json.tmp');

vows.describe('Hot Code Loading').addBatch({
  
  'Modifying runtime before reload...': function() {
    
    // templates
    __templates = app.templates;
    app.templates = {};
    
    // data
    __data = app.__data;
    app.__data = {};
    
    // hooks
    assert.isUndefined(app.TEST_HOOK);
    app.emit('test_hook');
    assert.equal(app.TEST_HOOK, 'ABCD');
    
    assert.isUndefined(app.OTHER_HOOK);
    app.emit('other_hook');
    assert.equal(app.OTHER_HOOK, 'EFGH');
    
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
    
    fs.writeFileSync(testHook, testHookBuf.replace('ABCD', '1234'));
    
    fs.renameSync(otherHook, otherHookDisabled);
    
    fs.renameSync(envFile, envFileTmp);
    fs.renameSync(envFile1, envFile);
    
    assert.deepEqual(app.__data, {});
    
    assert.deepEqual(app.templates, {})
    
    app.reload({
      all: true
    });
    
  }

}).addBatch({
  
  "The reload events are emitted with spec": function() {
   
    var spec = {
      assets: false,
      env: true,
      data: true,
      hooks: true,
      controllers: true, 
      api: true,
      exts: true,
      static: true,
      helpers: true,
      models: true,
      partials: true, 
      templates: true,
      includes: true, 
      all: true, 
      views: true, 
      handlers: true
    };

    assert.deepEqual(before, spec);
    assert.deepEqual(after, spec);

  },
  
  'Verifying runtime after reload...': function() {
    
    // Templates should have changed
    assert.deepEqual(Object.keys(app.templates).sort(), ['sample-template', 'one/two/three', 'test/howdy'].sort());
    for (var tpl in app.templates) {
      assert.instanceOf(app.templates[tpl].engine, protos.lib.engine); // Make sure functions come from engines
    }
    app.templates = __templates; // Restore previous templates

    // Env data should have changed
    assert.deepEqual({TESTING: true}, protos.env());
    fs.renameSync(envFile, envFile1);
    fs.renameSync(envFileTmp, envFile);
    app.reload({env: true});
    
    // Data reloading
    var alphaBuf = fs.readFileSync(app.fullPath('data/alpha.json'), 'utf8');              // Get original contents of alpha
    assert.deepEqual(app.data(), { alpha: { alpha: true }, beta: { beta: true } });       // Compare with actual data
    fs.writeFileSync(app.fullPath('data/alpha.json'), '{\n  "alpha": false\n}', 'utf8');  // Modify alpha file
    app.reload({data: true});                                                             // Reload data
    assert.deepEqual(app.data(), { alpha: { alpha: false }, beta: { beta: true } });      // Ensure updated data is read
    fs.writeFileSync(app.fullPath('data/alpha.json'), alphaBuf, 'utf8');                  // Restore alpha file
    app.__data = __data;                                                                  // Restore previous data
    
    // Restore hook files
    fs.writeFileSync(testHook, testHookBuf, 'utf8');
    fs.renameSync(otherHookDisabled, otherHook);
    
    // hooks - The test_hook should have been modified in place
    app.emit('test_hook');
    assert.equal(app.TEST_HOOK, 1234);
    
    // hooks - The other_hook has been removed
    app.emit('other_hook');
    assert.isUndefined(app.hooks.other_hook);
    assert.isUndefined(app._events.other_hook);
    
    // includes
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
    
  }
  
}).export(module);
