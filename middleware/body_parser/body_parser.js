
/**
  Body Parser
  
  » Configuration Options
  
    {int} maxFieldSize: Max amount of bytes to allow for each field
    {int} maxUploadSize: Max number of bytes to allow for uploads
    {boolean} keepUploadExtensions: If set to true (default) will keep extensions for uploaded files
  
 */

var app = protos.app;

require('./request.js');

function BodyParser(config, middleware) {
  
  // Middleware configuration
  config = protos.extend({
    maxFieldSize: 2 * 1024 * 1024,
    maxUploadSize: 2 * 1024 * 1024,
    keepUploadExtensions: true
  }, config);
  
  // Attach config to application
  app.config.uploads = config;
  
  // Register middleware resources
  app.resources[middleware] = {
    file_manager: require('./file_manager.js')
  }
  
}

module.exports = BodyParser;