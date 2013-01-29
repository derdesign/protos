
/* Static Server » Response extensions */

var app = protos.app,
    http = require('http'),
    util = require('util'),
    OutgoingMessage = http.OutgoingMessage;

/**
  Serves a file, forcing download, using the `Content-Disposition` HTTP Header
  
  @param {string} path
  @param {string} filename
  @public
 */

OutgoingMessage.prototype.download = function(path, filename) {
  var header = 'attachment';
  if (filename) header += util.format('; filename="%s"', filename);
  this.setHeaders({'Content-Disposition': header});
  app._serveStaticFile(path, this.request, this);
}
