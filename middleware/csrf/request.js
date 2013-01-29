
/* CSRF » Request enhancements */

var app = protos.app,
    http = require('http'),
    IncomingMessage = http.IncomingMessage;

/**
  Creates or retrieves a csrf Token
  
  @param {string} token
  @return {string} md5 hash
  @public
 */
    
IncomingMessage.prototype.csrfToken = function(token) {
  return app.csrf.getToken(this, token);
}
