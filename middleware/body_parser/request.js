
/* Body Parser » Request ennhancements */

var app = protos.app,
    http = require('http'),
    formidable = protos.requireDependency('formidable', 'Body Parser Middleware', 'body_parser'),
    IncomingForm = formidable.IncomingForm,
    IncomingMessage = http.IncomingMessage;

var FileManager = require('./file_manager.js');

/**
  Retrieves POST/PUT Data & Optionally checks for CSRF Token
  
  @public
  @param {string} token
  @param {function} callback
 */

IncomingMessage.prototype.getRequestData = function(token, callback) {
  
  var data = this.requestData,
      fields = data.fields,
      files = data.files,
      app = this.app;
      
  if (typeof callback == 'undefined') {
    callback = token;
    token = null;
  }
  
  if (token) {
    if (app.supports.csrf) {
      if (app.csrf.checkToken(this, token, fields)) {
        // Token verified, proceed
        callback.call(this, fields, files);
      } else {
        // Token can't be verified, remove files and send 400
        data.files.removeAll();
        this.response.httpMessage(400);
      }
    } else {
      throw new Error("Trying to validate token when CSRF middleware not loaded.");
    }
  } else {
    // No token available, proceed
    callback.call(this, fields, files);
  }

}

/**
  Gets POST data & files

  @private
  @param {function} callback
 */

IncomingMessage.prototype.parseBodyData = function(callback) {
  var form, req = this,
      res = this.response;

  if (req.headers['content-type'] != null) {
    form = req.__incomingForm = new IncomingForm();
    form.uploadDir = app.path + '/' + app.paths.upload.replace(app.regex.startOrEndSlash, '') + '/';
    form.maxFieldsSize = app.body_parser.config.maxFieldSize;
    form.encoding = 'utf-8';
    form.keepExtensions = app.body_parser.config.keepUploadExtensions;
    form.parse(req, function(err, fields, files) {
      if (err) {
        app.serverError(res, err);
      } else {
        // Run callback
        callback.call(req, fields, new FileManager(files));
      }
    });
  } else {
    callback.call(req, {}, new FileManager({}));
  }
}

/**
  Checks if the upload limit has exceeded

  @private
  @returns {boolean}
  
 */

IncomingMessage.prototype.exceededUploadLimit = function() {
  var res = this.response;
  if (this.headers['content-length'] != null) {
    var bytesExpected = parseInt(this.headers['content-length'], 10),
      uploadSize = app.body_parser.config.maxUploadSize;
    if (bytesExpected > uploadSize) {
      app.emit('upload_limit_exceeded', this, res);
      if (this.__stopRoute === true) return true;
      // HTTP/1.1 413 Request Entity Too Large
      // http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.4.14
      res.setHeader('Connection', 'close');
      res.httpMessage(413, true);
      return true;
    } else {
      return false;
    }
  } else {
    return false;
  }
}
