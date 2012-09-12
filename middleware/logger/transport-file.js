
/* Logger » File Transport */

var app = protos.app;

function FileTransport(evt, config, level, noAttach) {
  
  this.className = this.constructor.name;
  
  if (typeof config == 'string') {
    config = {filename: config};
  } else if (config.constructor !== Object) {
    return;
  }
  
  // Set config
  this.config = config;
  
  // Get file stream
  var stream = app.logger.getFileStream(config.filename);
  
  // Set write method
  this.write = function(log) {
    stream.write(log+'\n', 'utf8');
  }
  
  if (!noAttach) app.on(evt, this.write);
  
}

FileTransport.prototype.write = function(log, data) {
  // Interface
}

module.exports = FileTransport;