
/**
  Body Parser
  
  » Configuration Options
  
    {int} maxFieldSize: Max amount of bytes to allow for each field
    {int} maxUploadSize: Max number of bytes to allow for uploads
    {boolean} keepUploadExtensions: If set to true (default) will keep extensions for uploaded files
  
 */

var app = protos.app;

// Create upload directory if not present
app.mkdir(app.paths.upload);

require('./request.js');

function BodyParser(config, middleware) {
  
  // Attach to app
  app[middleware] = this;
  
  // Middleware configuration
  this.config = protos.extend({
    maxFieldSize: 2 * 1024 * 1024,
    maxUploadSize: 2 * 1024 * 1024,
    keepUploadExtensions: true
  }, config);
  
  this.FileManager = require('./file_manager.js');
  
}

module.exports = BodyParser;
