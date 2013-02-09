/*jshint evil:true*/

var app = protos.app;
var fs = require('fs');
var cluster = app.cluster;

var evt = 'runtime_middleware_msg';
var IPC_TOKEN = app.IPC_TOKEN;
var runtimeFile = app.fullPath('runtime.js');

app.on('master_message', function(msg) {
  if (msg[0] === IPC_TOKEN && msg[1] === evt) {
    runLocally(msg[2]);
  }
});

function runLocally(code) {
  
  // The code will be run on each of the worker processes
  // So, make sure you test the code locally before using
  // the loadFile() method
  eval(code);

}

function Runtime(config, middleware) {
  
  app[middleware] = this;

  if (cluster.isMaster) {
    
    if (!app.supports.repl) {
      throw new Error("The 'runtime' middleware requires 'repl'");
    }
    
    if (!fs.existsSync(runtimeFile)) fs.writeFileSync(runtimeFile, '', 'utf8');

    app.log("Runtime middleware loaded");
    
  }
  
}

Runtime.prototype.loadFile = function() {
  
  var code = fs.readFileSync(runtimeFile, 'utf8');
  
  if (protos.config.server.multiProcess && cluster.isMaster) {
    
    // Master
    
    var workers = cluster.workers;
    
    for (var id in workers) {
      workers[id].send([IPC_TOKEN, evt, code]);
    }
    
  } else {
    
    // Workers / Master (single process)
    
    runLocally(code);
    
  }
}

module.exports = Runtime;