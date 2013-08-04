
/* lib/protos.js */
 
require('./extensions.js');

var app;
var _ = require('underscore'),
    events = require('events'),
    net = require('net'),
    inflect = require('./support/inflect.js'),
    child_process = require('child_process'),
    cluster = require('cluster'),
    fs = require('fs'),
    os = require('os'),
    http = require('http'),
    util = require('util'),
    pathModule = require('path'),
    EventEmitter = events.EventEmitter;

/**
  Protos class. Handles everything that needs to be done, to make sure that
  the Application(s) run as smoothly as possible.
  
  @class Protos
  @constructor
  @return {object} Protos instance
 */

function Protos() {
  
  var self = this;
  
  // Initialize `protos` global
  global.protos = this;

  // Inherit from constructor
  _.extend(this, this.constructor);
  
  // Set globals getter (for sandboxed environments)
  this.__defineGetter__('globals', function() {
    return global;
  });
  
  /**
    Cluster configuration
   */

  this.clusterConfig = {
    listenPort: null,
    multiProcess: 0,
    masterProcess: 'node [master]',
    singleProcess: 'node [single process]',
    workerProcess: 'node worker'
  };

  /**
    Extends a source object with a target object. (Alias of `underscore::extend`)
    
    @param {object} destination
    @param {object} sources*
   */
    
  this.extend = _.extend;

  // Internals
  
  /**
    Contains the driver constructors
   */

  this.drivers = {};
  
  /**
    Contains the engine constructors
   */

  this.engines = {};
  
  /**
    Contains the storage constructors
   */

  this.storages = {};
  
  /**
    Contains the constructors from lib/
   */

  this.lib = {};

  /**
    Regular expressions
   */

  this.regex = require('./regex');

  /**
    Exposes the `Inflection` class instance
   */

  this.inflect = inflect;

  /**
    Framework`s path. Directory where Protos is installed.
   */

  this.path = pathModule.resolve(__dirname, '../');
  
  /**
    Protos className
    
    @type string
   */

  this.className = this.constructor.name;
  
  /**
    Environment string
    
    @type string (getter)
   */

  Object.defineProperty(this, 'environment', {
    value: this.config.environment,
    writable: false,
    enumerable: true,
    configurable: false
  });
  
  /**
    Server options, provided by environment
    
    @type object
   */

  this.serverOptions = null;

  // Launch application
  this.launchApplication();

  // Only set important properties enumerable
  this.util.onlySetEnumerable(this, [
    'version', 
    'className', 
    'environment', 
    'path', 
    'config', 
    'apps', 
    'drivers', 
    'engines', 
    'storages'
  ]);

  // console.exit(this);

}

//  Protos Version
Protos.version = require('../package.json').version;

// Stores the configuration settings for Protos
Protos.config = {
  autoCurl: true
};

// Protos path
Protos.path = pathModule.resolve(__dirname, '../');

// Inherit from EventEmitter
Protos.__proto__ = new EventEmitter();

// NOTE: the static properties of the Protos constructor are passed
// to the protos instance on construction. This means, the methods and properties
// available in the Protos constructor will also be available in the instance.

/**
  Bootstraps an application
  
  @static
  @param {string} dir
  @param {object} config
  @return {object} Protos instance
 */
 
Protos.bootstrap = function(dir, config) {
  
  // Emit exit on SIGINT
  process.on('SIGINT', process.exit);
  
  if (process.env.FAUX === '1') {
    console.log(JSON.stringify(config));
    process.exit();
  }

  if (typeof config == 'undefined') {
    throw new Error('Configuration parameter missing');
  }
  
  ['server', 'environments', 'events'].forEach(function(section) {
    if (!config[section]) config[section] = {};
  });
  
  // Get environment
  var appEnv = (process.env.NODE_ENV || config.environments.default || 'development');

  // Configure
  Protos.configure('bootstrap', config);
  
  // Ability to alter the bootstrap
  Protos.emit('bootstrap_config', config);
  
  Protos.configure('environment', appEnv);
  Protos.configure('hostname', config.server.host);
  Protos.configure('appPath', dir);
  Protos.configure('useSSL', config.server.useSSL);


  // Stay up setting
  if (typeof config.server.stayUp == 'undefined') {
    var stayUp = false;
  } else {
    switch (config.server.stayUp.constructor.name || false) {
      case 'Boolean':
        stayUp = config.server.stayUp;
        break;
      case 'String':
        stayUp = (appEnv === config.server.stayUp);
        break;
      case 'Array':
        stayUp = (config.server.stayUp.indexOf(appEnv) >= 0)
        break;
      default: break;
    }
  }
  
  // Configure server
  Protos.configure('server', {
    listenPort: process.env.PORT_OVERRIDE || config.server.port || 8080,
    multiProcess: config.server.multiProcess || false,
    stayUp: stayUp
  });
  
  var events = config.events || {};

  Protos.once('bootstrap', function(app) {
    
    // Setup 'environment' getter
    Object.defineProperty(app, 'environment', {
      value: protos.environment,
      writable: false,
      enumerable: false,
      configurable: false
    });
    
    // Run environment script
    var envFunc, envPath = app.paths.environment + appEnv + '.js';
    
    if (fs.existsSync(app.fullPath(envPath))) {
      envFunc = app.require(envPath);
      if (envFunc instanceof Function) envFunc(app);
    }
    
    // Run environment function from bootstrap
    var bootEnvFunc = config.environments[appEnv];
    if (bootEnvFunc instanceof Function) bootEnvFunc(app);

    // Attach bootstrap events
    for (var evt in events) {
      if (evt == 'components') continue; // Reserved by protos
      else app.on(evt, events[evt]);
    }
    
  });
  
  // Protos singleton
  return new Protos();

}

/**
  Returns value if on the production environment, null otherwise.
  
  @param {mixed} arg Argument to return if on production environment
  @param {mixed} val Argument to return if not on production environment
  @returns {mixed}
 */

Protos.prototype.production = function(arg, val) {
  if (arguments.length === 0) {
    return this.environment == 'production';
  } else {
    return (this.environment === 'production') ? arg : (typeof val == 'undefined' ? null : val);
  }
}

/**
  Loads a driver component
  
  @param {string} driver  Driver to load
 */

Protos.prototype.loadDriver = function(driver) {
  if (driver && this.drivers[driver] === undefined) {
    var modulePath = this.path + '/drivers/' + driver + '.js';
    this.drivers[driver] = this.require(modulePath);
    app.debug('Driver: ' + driver);
  }
}

/**
  Loads multiple driver components
  
  @param {string} *drivers Drivers to load
 */

Protos.prototype.loadDrivers = function() {
  for (var driver,i=0; i < arguments.length; i++) {
    driver = arguments[i];
    this.loadDriver(driver);
  }
}

/**
  Loads a storage component
  
  @param {string} storage Storage to load
 */
 
Protos.prototype.loadStorage = function(storage) {
  if (storage && this.storages[storage] === undefined) {
    var modulePath = this.path + '/storages/' + storage + '.js';
    this.storages[storage] = this.require(modulePath);
    app.debug('Storage: ' + storage);
  }
}

/**
  Loads multiple storage components
  
  @param {string} *storages Storages to load
 */

Protos.prototype.loadStorages = function() {
  for (var storage,i=0; i < arguments.length; i++) {
    storage = arguments[i];
    this.loadStorage(storage);
  }
}

/**
  Loads an engine component
  
  @param {string} engine
 */

Protos.prototype.loadEngine = function(engine) {
  if (engine && this.engines[engine] === undefined) {
    var modulePath = this.path + '/engines/' + engine + '.js';
    this.engines[engine] = this.require(modulePath);
    app.debug('Engine: ' + engine);
  }
}

/**
  Loads multiple engine components
  
  @param {string} *engines Engines to load
 */

Protos.prototype.loadEngines = function() {
  for (var engine,i=0; i < arguments.length; i++) {
    engine = arguments[i];
    this.loadEngine(engine);
  }
}

/**
  Sets a read-only property to config
  
  @static
  @private
  @param {string} context 
  @param {string|object} value
  @return {self} for chaining
 */

Protos.configure = function(context, value) {
  Object.defineProperty(this.config, context, {
    value: value,
    writable: false,
    enumerable: true,
    configurable: false
  });
  return this;
}

/**
  Requires a module relative to the protos's path
  
  @param {string} module
  @param {boolean} reload If set to true, will bypass the node modules cache and return a new module instance
  @return {object} module instance
 */

Protos.prototype.require = function(module, reload) {
  var Module, oldCache, outModule,
      modulePath = '../' + module;
  
  if (reload) {
    // Get node's Module
    Module = require('module').Module;
    
    // Backup original cache
    oldCache = Module._cache;
    
    // Temporarily empty cache         
    Module._cache = {};
    
    // Get the reloaded module
    try { outModule = require(modulePath); }
    catch(e) { outModule = require(module); }
    
    // Restore the module cache
    Module._cache = oldCache;  
    
    return outModule;
  } else {
    try { return require(modulePath); }
    catch(e) { return require(module); }
  }
}

/**
  Requires an application's dependency
  
  If the dependency is not present in the app's path,
  then protos tries to load it from its path instead.
  
  @param {string} module
  @returns {mixed} Value returned from require
 */
 
Protos.prototype.requireDependency = function(module, context, dependency) {
  var out = null;
  try {
    // Try loading the module from the app's path
    out = app.require(module);
  } catch(e) {
    // Try loading the module from protos path
    out = this.require(module);
  } finally {
    if (out) return out;
    else {
      if (!dependency) dependency = module;
      console.exit(util.format("\nThe %s requires the %s dependency. Install it with 'protos install %s'\n", 
      context, dependency, dependency));
    }
  }
}

/**
  Enables the debugger and inspector
 */
 
Protos.prototype.enableDebugger = function() {
  console.log('');
  require('child_process').spawn('kill', ['-s', 'SIGUSR1', process.pid]);
  this.checkInspectorStatus();
}

/**
  Deep extend, up to one level
  
  @param {object} source
  @param {object} destination
  @return {object}
 */
 
Protos.prototype.configExtend = function(base, source) {
  // Extend the base, 1 level deep
  for (var key in base) {
    if (key in source) {
      if (source[key] instanceof Array) {
        base[key] = source[key];
      } else if (typeof source[key] == 'object') {
        protos.extend(base[key], source[key]);
      } else {
        base[key] = source[key];
      }
    }
  }
  return base;
}

/**
  Shortcut for `util.inherits`
  
  @param {function} base
  @param {function} parent
 */

Protos.prototype.inherits = function(base, parent) {
  return util.inherits(base, this.lib[parent]);
}

/**
  Initializes applications, and configures virtual hosts
  
  @private
 */

Protos.prototype.loadSelf = function(host) {
  
  var self = this;
  var app = protos.app;
  
  // Preload Utility
  var Utility = require('./utility');
  var skipFromLibDir = ['application.js', 'request.js', 'response.js', 'protos.js', 'command.js', 'regex.js', 'client'];
  
  // Instance of the `Utility` class
  this.util = new Utility();
  
  // Lib
  this.util.getFiles(this.path + '/lib', function(file) {
    var key = file.replace(self.regex.jsFile, '');
    if (skipFromLibDir.indexOf(file) >= 0) return;
    self.lib[key] = require(self.path + '/lib/' + file);
  });
  
  // Enhance request/response
  require('./response');
  require('./request');
  
  // Load app
  app.loadSelf();
  
  // Remove loading method (attached to object)
  delete app.loadSelf;

}

Protos.prototype.launchApplication = function() {

  var enumerable = [
    'className', 
    'domain', 
    'path', 
    'debugLog', 
    'viewCaching',
    'storage', 
    'lib',
    'models', 
    'helpers', 
    'controllers', 
    'engines', 
    'initialized'
  ];
  
  var host = this.config.hostname || 'localhost',
      path = pathModule.resolve(this.path, this.config.appPath);

  // Enable inheritance within Application
  var Application = protos.lib.application = protos.require('lib/application.js');
  
  // Provide new app prototype
  app = this.app = new Application(host, path);
  
  // Load everything needed to continue
  protos.loadSelf(host);
  
  // Remove loading method (attached to prototype)
  delete Protos.loadSelf;
  
  // Only set important properties enumerable
  this.util.onlySetEnumerable(app, enumerable);

  // Start the server
  this.startServer();
}

/**
  Starts the application server
  
  @private
 */

Protos.prototype.startServer = function() {
  
  /*jshint loopfunc:true */
  
  var interProcess = this,
      host = this.config.hostname,
      options = this.config.server,
      allCPUS = os.cpus().length,
      bootstrap = protos.config.bootstrap;

  // Merge config with this.clusterConfig
  options = this.serverOptions = _.extend(this.clusterConfig, options);
    
  if (typeof options.multiProcess == 'number') {
    options.allCPUS = (options.multiProcess || 1);
    options.multiProcess = true;
  } else if (options.multiProcess) {
    options.multiProcess = true;
    options.allCPUS = os.cpus().length;
  }
  
  // Convenience function, to avoid repetition
  function commonStartupOperations() {
    if (options.stayUp) {
      process.on('uncaughtException', app.log); // prints stack trace
    }
    startupMessage.call(this, options);
  }
  
  function startServer() {
    if (cluster.isWorker) app.log("Worker server running");
    app.server.listen(options.listenPort, host);
    if (app.secureServer) {
      app.secureServer.listen(bootstrap.ssl.port, host);
    }
  }
  
  function spawnWorker() {
    (function(worker) {
      worker.on('message', function(msg) {
        app.emit('worker_message', msg, worker);
      });
    })(cluster.fork());
  }

  function workerMessage(msg) {
    if (msg === 'ping' && --remainingWorkers === 0) {
      app.removeListener('worker_message', workerMessage);
      app.emit('workers_up', cluster.workers);
    }
  }
  
  // Emit the workers up event
  var remainingWorkers = options.allCPUS;
  
  app.on('worker_message', workerMessage);

  // Master launches worker servers
  
  if (options.multiProcess && cluster.isMaster) {
    
    // Master
    
    process.title = options.masterProcess;
    
    cluster.on('death', function(worker) {
      app.log('Worker process %d died. Restarting...', worker.pid);
      spawnWorker();
    });
    
    for (var worker, i=0; i < options.allCPUS; i++) {
      spawnWorker();
    }
    
    commonStartupOperations.call(this);
    
    app.log('Master Process running');
    
  } else {
    
    // Worker or Master
    
    if (cluster.isMaster) {
      
      // Emit when running on single process mode
      app.emit('workers_up', cluster.workers);
      
    } else {
      
      // Send ping to master (used to emit the workers up event)
      process.send('ping');
      
      // Worker receiving message from master
      process.on('message', function(msg) {
        app.emit('master_message', msg);
      });

    }
    
    process.title = (options.multiProcess) ? options.workerProcess : options.singleProcess;
    
    // Start server
    startServer();
    
    if (cluster.isMaster) {
      
      // Run common startup operations when running on master
      commonStartupOperations.call(this);
      
      // Process curl request from argv when not running on production
      if (app.environment !== 'production') autoCurlRequest();
      
    }
    
  }

}

/**
  Checks the status of the node inspector
  
  @private
 */

Protos.prototype.checkInspectorStatus = function() {
  var port = 3000;
  this.util.checkLocalPort(port, function(err) {
    if (err) {
      console.log('Node Inspector is not running.\n\nStart it with `protos inspector start`\n');
      process.exit();
    } else {
      console.log('Node Inspector running on http://0.0.0.0:' + port);
    }
  });
}

function startupMessage(options) {
  
  if ((process.argv.length >= 3 && !options.multiProcess) || process.env.NODE_ENV == 'silent') {
    return; // Disable startup message on curl requests
  }
  
  app.log(util.format('%s Server running on %s', inflect.capitalize(protos.environment), app.baseUrl));
  
  if (app.secureServer) app.log(util.format('HTTPS Server listening on port %s', protos.config.bootstrap.ssl.port));
  
  if (options.multiProcess) app.log(util.format('Running a cluster of %d workers', options.allCPUS));
  
  app.emit('startup_message', options);

}

function autoCurlRequest() {
  if (process.argv.length >= 3 && protos.config.autoCurl) {
    var app = protos.app, 
        config = protos.config,
        args = process.argv.slice(2),
        url = args[args.length - 1],
        exec = require('child_process').exec,
        portStr = config.server.listenPort !== 80 ? ":" + config.server.listenPort : '';
    
    if (protos.regex.startsWithSlash.test(url)) {
      url = "http://" + app.hostname + portStr + url;
    }
    
    var switches = args.slice(0, (args.length - 1)).join(' ');
    var cmd = switches + ' ' + url;
    
    var cb = function() {
      app.curl(cmd, function(err, buf) {
        console.log(err || buf);
        process.exit(0);
      });
    }
    
    app.server.once('listening', cb);
    
  }
}
  
module.exports = Protos;
