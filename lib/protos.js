
/**
  @module lib
*/
 
require('./extensions.js');

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
  @param {boolean} noserver If set to true, will instantiate the framework, to be used standalone
  @return {object} Protos instance
 */

function Protos(noserver) {
  
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
    
    @property clusterConfig
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
    
    @method extend
    @param {object} destination
    @param {object} sources*
   */
    
  this.extend = _.extend;

  // Internals
  
  /**
    Contains the driver constructors
    
    @property drivers
   */
  this.drivers = {};
  
  /**
    Contains the engine constructors
    
    @property engines
   */
  this.engines = {};
  
  /**
    Contains the storage constructors
    
    @property storages
   */
  this.storages = {};
  
  /**
    Contains the constructors from lib/
    
    @property lib
   */
  this.lib = {};

  /**
    Regular expressions
    
    @property regex
   */
   
  this.regex = require('./regex');

  /**
    Exposes the `Inflection` class instance
    
    @property inflect
   */
  this.inflect = inflect;

  /**
    Framework`s path. Directory where Protos is installed.
    
    @property path
    @type string
   */
  this.path = pathModule.resolve(__dirname, '../');
  
  /**
    Protos className
    
    @property className
    @type string
    @default Protos
   */
  this.className = this.constructor.name;
  
  /**
    Environment string
    
    @property environment
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
    
    @property serverOptions
    @type object
   */
  this.serverOptions = null;

  // Preload Utility
  var Utility = require('./utility'),
      skipFromLibDir = ['request.js', 'response.js', 'protos.js', 'command.js', 'regex.js', 'client'];
  
  /**
    Instance of the `Utility` class
    
    @property util
   */
  this.util = new Utility();
  
  // Lib
  this.util.getFiles(this.path + '/lib', function(file) {
    var key = file.replace(self.regex.jsFile, '');
    if (skipFromLibDir.indexOf(file) >= 0) return;
    self.lib[key] = require(self.path + '/lib/' + file);
  });
  
  // Template engine prototype
  this.engineProto = new this.lib.engine();
  
  // Enhance request/response
  require('./response');
  require('./request');
  
  // Allow using protos standalone
  if (noserver) return;
  
  // Launch application
  this.launchApplication();

  // Only set important properties enumerable
  this.util.onlySetEnumerable(this, [
    'version', 
    'className', 
    'environment', 
    'path', 
    'config', 
    'vhosts', 
    'apps', 
    'drivers', 
    'engines', 
    'storages'
  ]);
    
  // console.exit(this);
}

/**
  Protos Version
  
  @property version
  @type string
 */
Protos.version = require('../package.json').version;

// Stores the configuration settings for Protos
Protos.config = {
  autoCurl: true
};

// Protos path
Protos.path = pathModule.resolve(__dirname, '../');

// Inherit from EventEmitter
Protos.__proto__ = new EventEmitter();

// Developers Note: the static properties of the Protos constructor are passed
// to the protos instance on construction. This means, the methods and properties
// available in the Protos constructor will also be available in the instance.

/**
  Bootstraps an application
  
  @static
  @method bootstrap
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
  
  var appEnv, envFunc, vhosts = {};

  // Get environment
  appEnv = process.env.NODE_ENV || config.environments.default || 'development';

  // Configure vhosts
  Protos.configure('bootstrap', config);
  
  // Ability to alter the bootstrap
  Protos.emit('bootstrap_config', config);
  
  Protos.configure('environment', appEnv);
  Protos.configure('hostname', config.server.host || 'localhost');
  Protos.configure('appPath', dir);


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
  
  @method production
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
  
  @method loadDriver
  @param {string} driver  Driver to load
 */

Protos.prototype.loadDriver = function(driver) {
  if (driver && this.drivers[driver] === undefined) {
    var modulePath = this.path + '/drivers/' + driver + '.js';
    this.drivers[driver] = this.require(modulePath);
    this.app.debug('Driver: ' + driver);
  }
}

/**
  Loads multiple driver components
  
  @method loadDrivers
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
  
  @method loadStorage
  @param {string} storage Storage to load
 */
 
Protos.prototype.loadStorage = function(storage) {
  if (storage && this.storages[storage] === undefined) {
    var modulePath = this.path + '/storages/' + storage + '.js';
    this.storages[storage] = this.require(modulePath);
    this.app.debug('Storage: ' + storage);
  }
}

/**
  Loads multiple storage components
  
  @method loadStorages
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
  
  @method loadEngine
  @param {string} engine
 */

Protos.prototype.loadEngine = function(engine) {
  if (engine && this.engines[engine] === undefined) {
    var modulePath = this.path + '/engines/' + engine + '.js';
    this.engines[engine] = this.require(modulePath);
    this.app.debug('Engine: ' + engine);
  }
}

/**
  Loads multiple engine components
  
  @method loadEngines
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
  @method configure
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
  
  @method require
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
  
  @method requireDependency
  @param {string} module
  @returns {mixed} Value returned from require
 */
 
Protos.prototype.requireDependency = function(module, context, dependency) {
  var out = null;
  try {
    // Try loading the module from the app's path
    out = this.app.require(module);
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
  
  @method enableDebugger
 */
 
Protos.prototype.enableDebugger = function() {
  console.log('');
  require('child_process').spawn('kill', ['-s', 'SIGUSR1', process.pid]);
  this.checkInspectorStatus();
}

/**
  Deep extend, up to one level
  
  @method configExtend
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
  
  @method inherits
  @param {function} base
  @param {function} parent
 */

Protos.prototype.inherits = function(base, parent) {
  return util.inherits(base, this.lib[parent]);
}

/**
  Initializes applications, and configures virtual hosts
  
  @private
  @method launchApplication
 */

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
  
  var host = this.config.hostname,
      path = pathModule.resolve(this.path, this.config.appPath);

  // Enable inheritance within Application
  var Application = protos.lib.application;
  
  // Initialize app routes
  this.lib.controller.prototype.queuedRoutes[host] = [];

  // Provide new app prototype
  var app = new Application(host, path);
  
  // Only set important properties enumerable
  this.util.onlySetEnumerable(app, enumerable);

  // Start the server
  this.startServer();
}

/**
  Starts the application server
  
  @private
  @method startServer
 */

Protos.prototype.startServer = function() {
  
  /*jshint loopfunc:true */
  
  var app = this.app,
      interProcess = this,
      options = this.config.server,
      allCPUS = os.cpus().length,
      bootstrap = protos.config.bootstrap;
      
  // Merge config with this.clusterConfig
  options = this.serverOptions = _.extend(this.clusterConfig, options);
    
  if (typeof options.multiProcess == 'number') {
    allCPUS = (options.multiProcess || 1);
    options.multiProcess = true;
    options.allCPUS = allCPUS;
  } else if (typeof options.multiProcess == 'boolean') {
    options.allCPUS = allCPUS;
  } else {
    throw new Error("The multiProcess option accepts {int|boolean}. Check your boot.js file");
  }
  
  // Convenience function, to avoid repetition
  function commonStartupOperations() {
    if (options.stayUp) {
      process.on('uncaughtException', app.log); // prints stack trace
    }
    startupMessage.call(this, options);
  }
  
  function startServer() {
    app.server.listen(options.listenPort, app.hostname, function() {
      app.emit('server_init', app.server); // Server init event
    });
  }
  
  function spawnWorker() {
    var worker = cluster.fork();
    (function(worker) {
      worker.on('message', function(msg) {
        app.emit('worker_message', msg, worker);
      });
    })(worker);
    worker.send('start_server');
  }
  
  // Master launches worker servers
  
  var remainingWorkers = allCPUS;
  
  function workerMessage(msg, worker) {
    if (msg == 'ack') { // Worker started server (tests worker -> master communication)
      worker.send('unbind'); // Tells the worker to unbind the [master_message] event, since it's no longer needed
      if (--remainingWorkers === 0) { // If there are no more workers to spawn, cleanup
        app.debug("Removed internal [worker_message] listener from master");
        app.removeListener('worker_message', workerMessage); // Removes the [worker_message] listener on master
      }
    }
  }
  
  function masterMessage(msg) {
    switch (msg) {
      case 'start_server':
        // Master tells the worker to start its server
        startServer();
        app.log('Worker server running');
        process.send('ack'); // Tell master server has been started
        break;
      case 'unbind':
        // Master tells the worker to unbind the [master_message] event
        app.debug("Removed internal [master_message] listener from worker");
        app.removeListener('master_message', masterMessage);
        break;
    }
  }
  
  // Establish master/worker communication
  
  app.on('master_message', masterMessage);
  app.on('worker_message', workerMessage);
  
  if (options.multiProcess && cluster.isMaster) {
    
    // Master
    
    process.title = options.masterProcess;
    
    for (var worker, i=0; i < allCPUS; i++) {
      spawnWorker();
    }
    
    cluster.on('death', function(worker) {
      app.log('Worker process %d died. Restarting...', worker.pid);
      spawnWorker();
    });
    
    commonStartupOperations.call(this);
    app.log('Master Process running');
    
  } else {
    
    // app.server already available on `pre_init` event
    
    // Worker
    
    process.on('message', function(msg) {
      app.emit('master_message', msg);
    });
    
    if (options.multiProcess) {
      process.title = options.workerProcess;
    } else {
      startServer();
      process.title = options.singleProcess;
      commonStartupOperations.call(this);
      autoCurlRequest();
    }
    
  }

}

/**
  Checks the status of the node inspector
  
  @private
  @method checkInspectorStatus
 */

Protos.prototype.checkInspectorStatus = function() {
  var port = 3000;
  this.util.checkPort(port, function(err) {
    if (err) {
      console.log('Node Inspector is not running.\n\nStart it with `protos inspector start`\n');
      process.exit();
    } else {
      console.log('Node Inspector running on http://0.0.0.0:' + port);
    }
  });
}
  
  
/*
  Prints the startup message
  
  @private
  @param {object} options
 */

function startupMessage(options) {
  var app = this.app;
  if ((process.argv.length >= 3 && !options.multiProcess) || process.env.NODE_ENV == 'silent') {
    return; // Disable startup message on curl requests
  }
  
  app.log(util.format('%s Server running on %s', inflect.capitalize(protos.environment), app.baseUrl));
  
  if (options.multiProcess) app.log(util.format('Running a cluster of %d workers', options.allCPUS));
  
  app.emit('startup_message', options);
}

/*
  Handles automatic curl requests on environments, by passing its command line options for a new request.
  
  If a relative path is used, the default application`s (the first you have defined on the environment) url
  will be used, and the path attached to it.
  
  An URL can also be used.
  
  @private
 */

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
    
    app.on('server_init', cb);
    
  }
}
  
module.exports = Protos;
