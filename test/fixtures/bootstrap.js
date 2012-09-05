
// Sample test case:
// https://gist.github.com/1738905

// Prevent timezone conflicts
// process.env.TZ = '';

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

// console.exit(testSkeleton);

var protos = Protos.bootstrap(testSkeleton, {
      server: {
        port: 8000
      },
      events: {
        components: function(protos) {
          // Load framework components
          protos.loadDrivers('mongodb', 'mysql');
          protos.loadStorages('mongodb', 'redis');
          protos.loadEngines('coffeekup', 'dot', 'eco', 'ejs', 'haml', 'hamlcoffee', 'handlebars', 'hogan', 'jade',
          'jazz', 'jqtpl', 'jshtml', 'kernel', 'liquor', 'swig', 'whiskers');
        },
        pre_init: function(app) {
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
          testConfig.mysql.storage = 'redis';
          testConfig.mongodb.storage = 'redis';
          
          app.config.drivers.mysql = testConfig.mysql;
          app.config.drivers.mongodb = testConfig.mongodb;

          app.config.storages.redis = testConfig.redis;
          app.config.storages.mongodb = testConfig.mongodb;
          
          // #### Travis Database Configuration #### 
          
          if (app.environment == 'travis') {
            
            // http://about.travis-ci.org/docs/user/database-setup/

            var mysql = app.config.drivers.mysql;
                
            // Override mysql configuration on travis

            mysql.host = '0.0.0.0';
            mysql.user = 'root';
            mysql.password = '';

            // Note: Redis uses default settings, no need to configure

          }
          
        }
      }
    });

var app = protos.app;

app.logging = false;

protos.path = Protos.path + '/test/fixtures/test-protos';

// Extend assert to check view engine compatibility

var engines = Object.keys(app.engines),
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

  vows.describe(className + ' Rendering Engine').addBatch({

    '': {

      topic: function() {
        var promise = new EventEmitter();
        app.clientRequest(testUrl  , function(err, buffer, headers) {
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
app.globals.commonModelProps = {
  id    : {type: 'integer'},
  user  : {type: 'string', required: true, validates: 'alnum_underscores'},
  pass  : {type: 'string', required: true, validates: 'alnum_underscores'},
}

module.exports = app;