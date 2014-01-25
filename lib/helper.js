
/* lib/helper.js */

var _ = require('underscore'),
    util = require('util'),
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
  return _.extend(locals, context);
}

/**
  Sanitizes input

  The uriRewriter provides as the first argument an object containig the parsed url data. If a URL is returned it will
  be considered as safe. Otherwise, a falsy value returned will ignore it.

  https://github.com/theSmaw/Caja-HTML-Sanitizer/blob/3066b7c33ed9530724af47f358667d7c35bc30e3/sanitizer.js#L800

  @param {string} text
  @param {function} uriRewriter URI Filter callback
  @return {string} sanitized string
 */
 
Helper.prototype.sanitize = function(str, uriRewriter) {
  str = (str) ? (str.text || str) + '' : '';
  return sanitizer.sanitize(str, uriRewriter);
}

/**
  Escapes input
  
  @param {string} text
  @return {string} escaped string
 */
 
Helper.prototype.escape = function(str) {
  str = (str) ? (str.text || str) + '' : '';
  str = sanitizer.escape(str)
  .replace(/\[/g, '&#91;')
  .replace(/\]/g, '&#93;')
  .replace(/\{/g, '&#123;')
  .replace(/\}/g, '&#125;');
  return str;
}

/**
  Returns a sanitized + escaped string
  
  @param {string} text
  @param {function} uriPolicyCallback URI Filter callback
  @return {string} escaped string
  */

Helper.prototype.sanitize_escape = function(str, uriPolicyCallback) {
  str = (str.text || str) + ''; // Accept both objects and strings
  return this.escape(this.sanitize(str, uriPolicyCallback));
}

module.exports = Helper;
