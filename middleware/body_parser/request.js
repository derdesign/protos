
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
  @method getRequestData
  @param {string} token
  @param {function} callback
 */

IncomingMessage.prototype.getRequestData = function(token, callback) {
  
  var data = this.requestData,
      fields = data.fields,
      files = data.files;
  
  if (typeof callback == 'undefined') {
    callback = token;
    token = null;
  }
  
  if (token) {
    if (app.csrf.checkToken(this, token, fields)) {
      // Token verified, proceed
      callback.call(this, fields, files);
    } else {
      // Token can't be verified, remove files and send 400
      data.files.removeAll();
      this.response.httpMessage(400);
    }
  } else {
    // No token available, proceed
    callback.call(this, fields, files);
  }
  
}

/**
  Retrieves GET data & Optionally checks for CSRF Token

  @public
  @method getQueryData
  @param {string} token
  @param {function} callback
*/

IncomingMessage.prototype.getQueryData = function(token, callback) {
  
  var fields = this.queryData;
  
  if (typeof callback == 'undefined') {
    callback = token;
    token = null;
  }
  
  if (token) {
    if (app.csrf.checkToken(this, token, fields)) {
      // Token verified, proceed
      callback.call(this, fields);
    } else {
      // Token can't be verified, send 400
      this.response.httpMessage(400);
    }
  } else {
    // No token available, proceed
    callback.call(this, fields);
  }
  
}

/**
  Gets POST data & files

  @private
  @method parseBodyData
  @param {function} callback
 */

IncomingMessage.prototype.parseBodyData = function(callback) {
  var form, req = this,
      res = this.response;

  if (req.headers['content-type'] != null) {
    form = req.__incomingForm = new IncomingForm();
    form.uploadDir = app.path + '/' + app.paths.upload.replace(app.regex.startOrEndSlash, '') + '/';
    form.maxFieldsSize = app.config.uploads.maxFieldSize;
    form.encoding = 'utf-8';
    form.keepExtensions = app.config.uploads.keepUploadExtensions;
    form.parse(req, function(err, fields, files) {
      if (err) app.serverError(res, err);
      else callback.call(req, fields, new FileManager(files));
    });
  } else {
    callback.call(req, {}, new FileManager({}));
  }
}

/**
  Checks if the upload limit has exceeded

  @private
  @method exceededUploadLimit
  @returns {boolean}
  
 */

IncomingMessage.prototype.exceededUploadLimit = function() {
  var res = this.response;
  if (this.headers['content-length'] != null) {
    var bytesExpected = parseInt(this.headers['content-length'], 10),
      uploadSize = app.config.uploads.maxUploadSize;
    if (bytesExpected > uploadSize) {
      app.emit('upload_limit_exceeded', this, res);
      if (this.__stopRoute === true) return true;
      res.setHeaders({ Connection: 'close' });
      res.httpMessage({
        statusCode: 413, // HTTP/1.1 413 Request Entity Too Large
        message: "Upload limit exceeded: " + (uploadSize / (1024 * 1024)) + " MB",
        raw: true
      });
      return true;
    } else {
      return false;
    }
  } else {
    return false;
  }
}