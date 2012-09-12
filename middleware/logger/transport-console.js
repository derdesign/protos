
/* Logger » Console Transport */

var app = protos.app;

function ConsoleTransport(evt, config, level, noAttach) {
  
  this.className = this.constructor.name;

  if (typeof config == 'boolean') {
    config = (config) ? {stdout: true} : {};
  } else if (typeof config != 'object') {
    return;
  }
  
  // Set config
  this.config = config;
  
  // Set write method
  this.write = function(log) {
    console.log(log);
  }
  
  // Only handle log if event specified
  if (!noAttach && config.stdout) app.on(evt, this.write);
  
}

ConsoleTransport.prototype.write = function(log) {
  // Interface
}

module.exports = ConsoleTransport;