
/**
  REPL

  Provides a REPL to interact with the application's runtime.

*/

var app = protos.app,
    fs = require('fs'),
    net = require('net'),
    util = require('util'),
    repl = require('repl'),
    cluster = require('cluster');
    
var input, connections = 0;

function ProtosRepl(config, middleware) {
  
  if (cluster.isMaster || !cluster.isWorker) {
    
    // Attach to app
    app[middleware] = this;

    // Create tmp directory if it doesn't exist
    app.mkdir('tmp');

    // Define connections getter
    this.__defineGetter__('connections', function() {
      return connections;
    });

    config = protos.extend({
      socket: true,
      port: null,
      maxConnections: 1
    }, config);

    // Set config
    this.config = config;

    // Start REPL Servers
    if (config.port) startServer.call(this, config.port);
    else if (config.socket) startServer.call(this, config.socket);

    // Prepare shell script for repl
    createReplScript();
    
  }
  
}

function createReplScript() {
  var src = '#!/bin/sh\n\n',
      outFile = app.fullPath('repl.sh');
  
  switch (typeof input) {
    case 'string':
      src += util.format('socat READLINE UNIX-CONNECT:%s', input);
      break;
    case 'number':
      src += util.format('socat READLINE TCP:127.0.0.1:%d', input);
      break;
  }
  
  src += '\n';

  fs.writeFileSync(outFile, src, 'utf8');
  fs.chmodSync(outFile, parseInt('0755', 8));
}

function getActiveConnections() {
  return util.format('(%d active connection%s)', connections, (connections === 0 || connections > 1) ? 's' : '');
}

function startServer(arg) {
  var socketFile, port, self = this;

  switch (typeof arg) {
    case 'boolean':
      socketFile = app.fullPath('tmp/repl.sock');
      break;
    case 'string':
      socketFile = app.fullPath('tmp/' + arg);
      break;
    case 'number':
      port = arg;
      break;
  }
  
  // Set input
  input = socketFile || port;

  // Remove socket file before starting
  if (socketFile && fs.existsSync(socketFile)) fs.unlinkSync(socketFile);

  this.server = net.createServer(function (socket) {
    
    if (connections === self.config.maxConnections)  {
      app.log("REPL Connection Rejected: maximum connections reached (%d)", connections);
      socket.end("Access Denied\n");
      return;
    }
    
    connections++; // Increase connections counter
    app.log('REPL Client connected. %s', getActiveConnections());
    app.emit('repl_client_connected', socket);
    
    repl.start({
      prompt: util.format("%s> ", app.hostname),
      input: socket,
      output: socket,
      terminal: false,
      useColors: true,
      useGlobal: false
    }).on('exit', function() {
      connections--;
      app.log('REPL Client disconnected. %s', getActiveConnections());
      app.emit('repl_client_disconnected', socket);
      socket.end();
    });
    
  }).listen(socketFile || port);
  
  // Write repl.sh to connect to the server
  var replScript = app.fullPath('repl.sh');
  
  // Cleanup on exit
  process.on('exit', function() {
    if (fs.existsSync(replScript)) fs.unlinkSync(replScript); // Remove repl.sh
    if (socketFile && fs.existsSync(socketFile)) fs.unlinkSync(socketFile); // Remove socket file
    try { fs.rmdirSync(app.fullPath('tmp')); } catch(e) { } // Remove tmp dir if empty
  });
  
  if (socketFile) {
    app.log("Started REPL Server on %s", app.relPath(socketFile));
  } else {
    app.log("Started REPL Server on 127.0.0.1:%d", port);
  }

}

module.exports = ProtosRepl;
