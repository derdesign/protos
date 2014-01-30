
// Prevent timezone conflicts

process.env.TZ = '';

// Make sure test errors are shown, otherwise there
// will be a "Callback not fired" error in vows

process.on('uncaughtException', function(err) {
  console.log(err.stack);
});

var env,
    _ = require('underscore'),
    fs = require('fs'),
    path = require('path'),
    vows = require('vows'),
    assert = require('assert'),
    rootPath = path.resolve(__dirname, '../../'),
    testConfig = require(rootPath + '/test/fixtures/dbconfig.json'),
    Protos = require(rootPath),
    EventEmitter = require('events').EventEmitter;

if (module.parent.id == '.') {
  // Running test directly
  env = path.basename(path.dirname(module.parent.filename));
} else {
  // Running test from makefile
  env = path.basename(path.dirname(module.parent.id));
}

Protos.configure('autoCurl', false);

Protos.on('bootstrap_config', function(bootstrap) {
  // For debugging purposes
  // console.log(bootstrap);
});

// Automatically detect test skeleton: Allows to test the app with different names
// Just make sure the name ends with 'skeleton', and it'll be fine...

var skelDir, testSkeleton;

fs.readdirSync('test/fixtures').forEach(function(dir) {
  if (/skeleton$/.test(dir)) {
    skelDir = dir;
    testSkeleton = Protos.path + '/test/fixtures/' + dir;
  }
});

// Create temporary test directory

var tmpDir = "test/fixtures/tmp";

if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

// console.exit(testSkeleton);

var protos = Protos.bootstrap(testSkeleton, {
      server: {
        port: 8000
      },
      envData: {
        development: 'deploy.json',
        travis: 'deploy.json'
      },
      events: {
        components: function(protos) {
          // Load framework components
          protos.loadDrivers('mongodb', 'mysql', 'postgres', 'sqlite');
          protos.loadStorages('mongodb', 'redis', 'sqlite');
          protos.loadEngines('ejs', 'handlebars', 'hogan', 'jade', 'plain', 'swig');
        },
        middleware: function(app) {
          app.__middlewareEventEmitted = true;
        },
        pre_init: function(app) {
          
          // Partials watching
          app.watchPartials = true;
          
          // Handler tests
          app.handlerTests = {};
          
          // View Partial and Shortcode Events
          
          app.on('view_partials_loaded', function(partials) {
            app.__viewPartialsEventParam = partials;
          });
          
          app.on('view_shortcodes_loaded', function(shortcodes) {
            app.__viewShortcodesEventParam = shortcodes;
          });
          
          // Test skeleton properties
          app.skelDir = skelDir;
          app.__initBootstrapEvent = true;
          
          app.onInitialize(function() {
            this.afterInitCheck = true;
          });
          
          // #### Database Configuration ####
          
          app.config.drivers.default = 'mysql';
          
          // Convert port to int, otherwise mongodb client complains...
          testConfig.mongodb.port = parseInt(testConfig.mongodb.port, 10);

          // Attach storages
          testConfig.sqlite.storage = 'redis';
          testConfig.mysql.storage = 'redis';
          testConfig.postgres.storage = 'redis';
          testConfig.mongodb.storage = 'redis';
          
          app.config.drivers.sqlite = testConfig.sqlite;
          app.config.drivers.mysql = testConfig.mysql;
          app.config.drivers.postgres = testConfig.postgres;
          app.config.drivers.mongodb = testConfig.mongodb;

          app.config.storages.redis = testConfig.redis;
          app.config.storages.mongodb = testConfig.mongodb;
          
          var sqliteStorageFile = "test/fixtures/tmp/storages.sqlite";
          
          fs.writeFileSync(sqliteStorageFile, '', 'binary');
          
          app.config.storages.sqlite = {
            filename: sqliteStorageFile
          }
          
          // #### Travis Database Configuration #### 
          
          if (app.environment == 'travis') {
            
            // http://about.travis-ci.org/docs/user/database-setup/

            var mysql = app.config.drivers.mysql;
                
            // Override mysql configuration on travis

            mysql.host = '127.0.0.1 ';
            mysql.user = 'root';
            mysql.password = '';
            
            var postgres = app.config.drivers.postgres;

            postgres.host = '127.0.0.1';
            postgres.user = 'postgres';
            postgres.password = '';

            // Note: Redis uses default settings, no need to configure

          }
          
        }
      }
    });

var app = protos.app;

app.logging = false;
app.config.json.pretty = false;

// -- Async tasks --

app.addReadyTask();

setTimeout(function() {
  app.flushReadyTask();
}, 100);

app.onReady(function() {
  app.__readyCallbackFired = true;
});

app.on('ready', function() {
  app.__readyEventFired = true;
});

// -- Async tasks --

protos.path = Protos.path + '/test/fixtures/test-protos';

// Extend assert to check view engine compatibility

var engines = Object.keys(app.engines).filter(function(val) { return val !== 'plain' && val !== 'markdown'; }),
    colorize = protos.util.colorize;

/* Prevent conflicts with template engine test filters */

var filterBackup;

app.backupFilters = function() {
  filterBackup = app.__filters;
  app.__filters = {};
}

app.restoreFilters = function() {
  app.__filters = filterBackup;
}

/* Test Engine Automation */

// Automate engine compatibility checks

function engineCompatibility(buffer, __engine__) {
  var pass, checks = [], failed = [], notCompatible = [],
      helperPropertyRegex = /<p>99(\s+)?<\/p>/;

  for (var engine,i=0; i < engines.length; i++) {
    engine = engines[i];
    pass = buffer.indexOf('Rendered Partial: ' + engine.toUpperCase()) >= 0;
    checks.push(pass);
    if (pass) console.log('    ✓ ' + colorize('Compatible with ' + engine, '0;32'));
    else {
      failed.push(engine);
      console.log('    ✗ ' + colorize('Not Compatible with ' + engine, '0;33'));
    }
  }

  if (app.engines[__engine__].async === false && failed.length > 0) {
    for (i=0; i < failed.length; i++) {
      engine = failed[i];
      if (app.engines[engine].async === true) {
        // Async engines can't work on sync engines
        notCompatible.push(engines.indexOf(engine));
      }
    }
  }

}

// Automate engine tests

app.addEnginePartials = function(current, data, repl) {
  app.logging = true;
  var buf = engines.map(function(engine) {
    if (app.engines[current].async === false && app.engines[engine].async) return '';
    else {
      return repl.replace(/%s/g, engine) + '\n';
    }
  });
  data += '\n' + buf.join('');
  return data;
}

// Automate vows batches for test engines

app.createEngineBatch = function(className, engine, testUrl, __module__) {

  testUrl = testUrl.replace(/\./g, '/');
  
  vows.describe(className + ' Rendering Engine').addBatch({

    '': {

      topic: function() {
        var promise = new EventEmitter();
        app.request(app.url(testUrl)  , function(err, res, buffer) {
          // console.exit(buffer);
          promise.emit('success', err || buffer);
        });
        return promise;
      },

      'Returns valid view buffer': function(buffer) {
        // console.exit(buffer);
        assert.isTrue(buffer.indexOf(className + ' Template Engine') >= 0);
        engineCompatibility(buffer, engine);
      }

    }

  }).export(__module__);

}

// Common model properties
app.locals.commonModelProps = {
  username  : {type: 'string', required: true, validates: 'alnum_underscores'},
  password  : {type: 'string', required: true, validates: 'alnum_underscores'},
}

module.exports = app;