
/* lib/helper.js */

var util = require('util'),
    sanitizer = require('sanitizer');
    
/**
  Helper class. The methods provided by this class are available within views, prefixed with `$`.
  
  For example, you can access the methods as `$sanitize`, `$escape`, etc.
  
  Additionally, any methods added to `MainHelper` will behave as if they were defined in the `Helper` class.
  
  @class Helper
  @constructor
 */

function Helper() {

}

/**
  Adds the properties from context into locals.
  
  This method is used to pass arguments to view partials, and also
  pass the current view locals, in a single argument.
  
  For example:
  
    <?- my_partial($wrap({name: 'john'}, locals)) ?>
    
  @param {object} locals Locals object
  @param {object} context Object to set as proto
  @return {object} Locals object
 */
 
Helper.prototype.wrap = function(locals, context) {
  locals.__proto__ = context;
  return locals;
}

/**
  Sanitizes input
  
  @param {string} text
  @param {function} uriPolicyCallback URI Filter callback
  @return {string} sanitized string
 */
 
Helper.prototype.sanitize = function(str, uriPolicyCallback) {
  str = (str.text || str) + ''; // Accept both objects and strings
  return sanitizer.sanitize(str, uriPolicyCallback);
}

/**
  Escapes input
  
  @param {string} text
  @return {string} escaped string
 */
 
Helper.prototype.escape = function(str) {
  str = (str.text || str) + ''; // Accept both objects and strings
  return sanitizer.escape(str);
}

/**
  Returns a safe string: Sanitized + Escaped
  
  @param {string} text
  @param {function} uriPolicyCallback URI Filter callback
  @return {string} escaped string
  */
  
Helper.prototype.safe_str = function(str, uriPolicyCallback) {
  str = (str.text || str) + ''; // Accept both objects and strings
  return sanitizer.escape(sanitizer.sanitize(str, uriPolicyCallback));
}


module.exports = Helper;
