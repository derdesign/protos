
/**
  @module lib
  @namespace http
*/
 
/**
  @private
  @class IncomingMessage
  @constructor
 */

var http = require('http'),
    util = require('util'),
    inflect = protos.inflect,
    IncomingMessage = http.IncomingMessage;

// Detect if it's an HTTPS request

IncomingMessage.prototype.__defineGetter__('isSecure', function() {
  return typeof this.connection.encrypted !== 'undefined';
});

// Detect if it's an AJAX Request

IncomingMessage.prototype.__defineGetter__('isAjax', function() {
  return (this.headers['x-requested-with'] == 'XMLHttpRequest');
});

/**
  Stores a value to the request metadata

  @method set
  @param {string} key Key to set
  @param {mixed} val Value to set
  @return {mixed} value that has been set
 */
  
IncomingMessage.prototype.set = function(key, val) {
  return this.__metadata[key] = val;
}

/**
  Retrieves a value from the request metadata

  @method get
  @param {string} key Key to set
  @return {mixed} value
 */

IncomingMessage.prototype.get = function(key) {
  return this.__metadata[key];
}

/**
  Stops the controller from performing any subsequent route resolutions. If this function
  is used, a response **must** be sent manually.

  @method stopRoute
 */

IncomingMessage.prototype.stopRoute = function() {
  this.__stopRoute = true;
}

/**
  Runs the next route function in chain. This is a stub method, and is overridden when multiple
  route functions are specified for one route.
  
  @method next
 */
 
IncomingMessage.prototype.next = function() {
  // Interface method: verridden dynamically. Do nothing by default.
}

/**
  Sets the page title
  
  @method setPageTitle
  @param {string} title
 */

IncomingMessage.prototype.setPageTitle = function(title) {
  this.__pageTitle = util.format('%s &raquo; %s', this.app.config.title, inflect.capitalize(title));
}

/**
  Gets the page title
  
  @method pageTitle
  @param {string} title
  @return {string} Page title (if set). Defaults to app.config.title
 */

IncomingMessage.prototype.pageTitle = function() {
  return this.__pageTitle || this.app.config.title;
}

/**
  Retrieves GET data & Optionally checks for CSRF Token
  
  @public
  @method getQueryData
  @param {string} token
  @param {function} callback
*/

IncomingMessage.prototype.getQueryData = function(token, callback) {
  
  var fields = this.queryData,
      app = this.app;
  
  if (typeof callback == 'undefined') {
    callback = token;
    token = null;
  }
  
  if (token) {
    if (app.supports.csrf) {
      if (app.csrf.checkToken(this, token, fields)) {
        // Token verified, proceed
        callback.call(this, fields);
      } else {
        // Token can't be verified, send 400
        this.response.httpMessage(400);
      }
    } else {
      throw new Error("Trying to validate token when CSRF middleware not loaded.");
    }
  } else {
    // No token available, proceed
    callback.call(this, fields);
  }
  
}
