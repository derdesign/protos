
/* Body Parser » Controller enhancements */

var app = protos.app,
    Controller = protos.lib.controller;

/**
  Retrieves POST fields & files, with validation & CSRF protection.

  If the CSRF token is specified, the request will be validated against it. On failure to
  validate, an HTTP/400 response will be sent.

  The request fields will be validated against the route's validation rules.

  The files uploaded are stored by default on /private/incoming.

  @param {object} req
  @param {string} CSRF token (optional)
  @param {function} callback
  @public
 */

Controller.prototype.getRequestData = function(req, token, callback) {
  var fields, files, requestData,
      self = this,
      res = req.response;
      
  if (typeof callback == 'undefined') { callback = token; token = null; }

  if (req.method == 'POST' || req.method == 'PUT') {
    requestData = req.__requestData;
    fields = requestData.fields;
    files = requestData.files;

    if (app.validate(req, fields)) {
      
      /*
      
        NOTE: There is no need to use `else` here, since app.validate will
        properly respond with an HTTP/400 Response, and will remove any
        uploaded files automatically if the body_parser is enabled.
        
       */
      
      // Check CSRF Token upon validation
      if (app.supports.csrf) app.emit('csrf_check', req, token, fields);
      
      // Route stop: allows `csrf_check` event to stop execution
      if (req.__stopRoute) {
        files.removeAll(); // Remove any uploaded files
        return;
      }
      
      callback.call(self, fields, files);
      
    }
    
  } else {
    
    res.httpMessage(400);

  }
}