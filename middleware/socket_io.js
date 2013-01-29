
/**
  SocketIO
  
  Provides socket.io support for applications. The middleware acts as an automatic
  and convenient configuration of socket.io, supporting namespaces.
  
  » References:
  
    https://github.com/learnboost/socket.io
    https://github.com/LearnBoost/socket.io-spec
    https://github.com/LearnBoost/Socket.IO/wiki/Configuring-Socket.IO

  » Provides:
  
    {object} app.io: SocketIO server, listening on the application's port
    {object} app.sockets: Contains all the SocketIO namespaces, ready to use & configured
  
  » Configuration options:
  
    {object} settings: Settings to pass to the socket on initialization
    {object} sockets: Contains socket namespaces as {name: endpoint}
    {object} environments: Object containing callbacks that will run on each application environment
    
  » Example:
  
    app.use('socket_io', {
      settings: {
        log: true,
        heartbeats: true,
        'log level': 1
      },
      sockets: {
        chat: '/chat',
        news: '/news'
      },
      environments: {
        development: function(io) {
          // Code to run on development
        },
        production: function(io) {
          // Code to run on production
        }
      }
    });

 */

var app = protos.app,
    util = require('util');

function SocketIO(config, middleware) {
  
  // Default configuration
  var options = {
    settings: {
      log: false
    },
    sockets: {
      main: '',
    },
    environments: {
      development: function(io) {
        // Enable only websocket when on development
        io.set('transports', ['websocket']);
      },
      production: function(io) {
        // Enable log + reduce logging
        io.enable('log');
        io.set('log level', 1);
        
        // Send minified client
        io.enable('browser client minification');
        
        // Use eTag caching logic
        io.enable('browser client etag');
        
        // Gzip-encode the client script
        io.enable('browser client gzip');
        
        // Enable production transports
        io.set('transports', ['websocket', 'flashsocket', 'htmlfile', 'xhr-polling', 'jsonp-polling']);
      }
    },
    clientScript: '/socket.io/socket.io.js'
  }
  
  // Extend the options, 1 level deep
  protos.configExtend(options, config);
  
  // If no debug env specified, use development env
  if (config.environment && config.environment.debug == null) {
    options.environments.debug = options.environments.development;
  }
  
  // Defaults has been extended with config
  initSockets(options);
}

/**
  Initializes the socket configuration
  
  @param {object} config
  @private
 */

function initSockets(config) {
  var io = protos.requireDependency('socket.io', 'SocketIO Middleware', 'socket_io').listen(app.server, config.settings);
  
  // Run environment code
  var func = config.environments[protos.environment];
  if (func instanceof Function) func(io);
  
  // Set app.sockets
  app.sockets = {};
  
  // Attach namespaces to app.sockets
  var s, namespace;
  for (s in config.sockets) {
    namespace = config.sockets[s];
    app.sockets[s] = io.of(namespace);
  }
  
  // Attach io to app
  app.io = io;
}

module.exports = SocketIO;
