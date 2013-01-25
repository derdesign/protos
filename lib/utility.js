
/**
  @module lib
*/

var _ = require('underscore'),
    _s = require('underscore.string'),
    net = require('net'),
    util = require('util'),
    fs = require('fs'),
    indexOf = Array.prototype.indexOf;

/**
  Utility class. Provides several utility methods to Protos.
  
  @private
  @class Utility
  @constructor
 */

function Utility() {
  this.className = this.constructor.name;
}


/**
  Performs type coercion of a string
  
  @method typecast
  @param {string} value
  @return {mixed} converted value in the detected type
 */

Utility.prototype.typecast = function(value) {
  if (protos.regex.integer.test(value)) {
    return parseInt(value, 10);
  } else if (protos.regex.float.test(value)) {
    return parseFloat(value);
  } else if (protos.regex["null"].test(value)) {
    return null;
  } else if (protos.regex.boolean.test(value)) {
    if (value.toLowerCase() == 'true') {
      return true;
    } else {
      return false;
    }
  } else {
    return value;
  }
}

/**
  Gets the files in a path, matching a regular expression.
  
  Defaults to .js files if regular expression is not provided.
  
  @method getFiles
  @param {string} path
  @param {regex} regex
  @return {array}
 */

Utility.prototype.getFiles = function(path, regex, callback) {
  var files, out = [];
  
  if (callback == null) {
    callback = regex;
    regex = null;
  }
  
  if (regex == null) {
    regex = protos.regex.jsFile;
  }
  
  try {
    files = fs.readdirSync(path);
  } catch(e) {
    return out;
  }
  
  for (var file,i=0; i < files.length; i++) {
    file = files[i];
    if ( regex.test(file) ) {
      if (callback) callback.call(this, file);
      out.push(file);
    }
  }
  return out;
}

/**
  Converts a dashed string to camel case
  
  @method toCamelCase
  @deprecated Should use the Inflection library instead
  @param {string} string
  @return {string} converted string
 */

Utility.prototype.toCamelCase = function(string) {
  return _s.titleize(_s.camelize(string.replace(/\_/, '-')));
}

/**
  Requires all classes found in path into destination, with optional filter
  
  @method requireAllTo
  @param {string} path
  @param {string} object
  @param {function} filterCb
 */

Utility.prototype.requireAllTo = function(path, destination, filterCb) {
  var classConstructor, files, replRegex,
      doFilter = (typeof filterCb == 'function');

  files = this.getFiles(path);
  
  replRegex = /(\..*)?$/;
  
  for (var key,file,instance,i=0; i < files.length; i++) {
    file = files[i];
    key = file.replace(replRegex, '');
    file = file.replace(protos.regex.jsFile, '');
    classConstructor = require(path + '/' + file);
    
    if (classConstructor instanceof Function) {
      if (doFilter) {
        instance = filterCb(classConstructor, file);
        if (instance) destination[key] = instance;
      } else {
        destination[key] = classConstructor;
      }
    } else if (doFilter) {
      instance = filterCb(classConstructor, file);
      if (instance) destination[key] = instance;
    }
  }
}

/**
 Gets the files in a path, matching a regular expression.
 
 @method ls
 @param {string} path
 @param {regex} regex
 @return {array}
*/

Utility.prototype.ls = function(path, regex) {
  var files = fs.readdirSync(path);
  if (regex != null) {
    for (var file,out=[],i=0; i < files.length; i++) {
      file = files[i];
      if ( regex.test(file) ) out.push(file);
    }
    return out.sort();
  } else {
    return files.sort();
  }
}

/**
  Repeats a string n times defined by multiplier
  
  @method strRepeat
  @param {string} input
  @param {int} multiplier
  @return {string} repeated string
 */
  
Utility.prototype.strRepeat = function(input, multiplier) {
  return new Array(multiplier + 1).join(input);
}

/**
   Parses an HTTP Range header
   
   Uses code from Connect`s [util.js](https://github.com/senchalabs/connect/blob/master/lib/utils.js) 
   
   @private
   @method parseRange
   @param {int} size
   @param {string} str
   @return {object} containing start, end ranges
  */

Utility.prototype.parseRange = function(size, str) {
  var valid = true,
    arr = str.substr(6).split(',').map(function(range) {
    var start, end;
    range = range.split('-');
    start = parseInt(range[0], 10);
    end = parseInt(range[1], 10);
    if (isNaN(start)) {
      start = size - end;
      end = size - 1;
    } else if (isNaN(end)) {
      end = size - 1;
    }
    if (isNaN(start) || isNaN(end) || start > end) valid = false;
    return {
      start: start,
      end: end
    };
  });
  if (valid) {
    return arr;
  } else {
    return null;
  }
}

/**
  Sets the properties of an object as non enumerable
  
  @method setNonEnumerable
  @param {object} context
  @param {array} properties
 */

Utility.prototype.setNonEnumerable = function(context, properties) {
  for (var descriptor,prop,val,i=0; i < properties.length; i++) {
    prop = properties[i];
    descriptor = Object.getOwnPropertyDescriptor(context, prop);
    if (context.propertyIsEnumerable(prop) && !descriptor) { // Don't reset property if descriptor available
      val = context[prop];
      delete context[prop]
      Object.defineProperty(context, prop, {
        value: val,
        writable: true,
        enumerable: false,
        configurable: true
      });
    }
  }
}

/**
  Makes the specified properties of an object enumerable. The rest are non-enumerable
  
  Additionally, methods from an extra object can be set as enumerable
  
  @method onlySetEnumerable
  @param {object} context
  @param {array} properties
  @param {object} extraProto
 */
 
Utility.prototype.onlySetEnumerable = function(context, properties, extraProto) {
  this.setNonEnumerable(context, Object.keys(context));

  if (extraProto) {
    properties = properties.concat(_.methods(extraProto));
  }

  for (var descriptor,prop,val,i=0; i < properties.length; i++) {
    prop = properties[i];
    descriptor = Object.getOwnPropertyDescriptor(context, prop);
    if (prop in context && !descriptor) { // Don't reset property if descriptor available
      val = context[prop];
      delete context[prop];
      context[prop] = val;
    }
  }
}
 
/**
  Searches for a given pattern within a string

  @method searchPattern
  @param {string} buffer
  @param {string} s
  */

Utility.prototype.searchPattern = function(buffer, s) {
  var indices = {};
  if (! util.isArray(s) ) s = [s];
  for (var pat,found,idx,i=0; i < s.length; i++) {
    pat = s[i];
    found = indices[pat] = [];
    idx = buffer.indexOf(pat);
    while (idx != -1) {
      found.push(idx);
      idx = buffer.indexOf(pat, idx + 1);
    }
  }
  return indices;
}
 
 /**
  Extracts keys from object
  
  @method extract
  @param {object} object
  @param {array} keys
  @return {object}
 */
 
Utility.prototype.extract = function(object, keys, nullOut) {
  var key, i, c = 0, out = {};
  for (i=0; i < keys.length; i++) {
    key = keys[i];
    out[key] = object[key] || null;
    if (out[key] === null) c++;
  }
  return (nullOut && c == keys.length) ? null : out;
}
 
 /**
  Checks if a port is open
  
  Provides `[err]`
  
  @method checkPort
  @param {int} port
  @param {function} callback
  */
  
Utility.prototype.checkPort = function(port, callback) {
  var self = this;
  var conn = net.createConnection(port, function() {
    callback.call(self, null);
  });
  conn.on('error', function(err) {
    callback.call(self, err);
  });
}

/**
  Colorizes a string to be used in the CLI
  
  References:
  
  - http://paste.pocoo.org/show/467676/
  - http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
  
  @method colorize
  @param {string} str
  @param {string} color
  @return {string}
 */
 
Utility.prototype.colorize = function(str, color) {
  return util.format('\u001b[%sm%s\u001b[0m', color, str);
}

/**
  Creates a regex used to match a string pattern.

  Patterns are created using regexp-like syntax. For example:
  
    hello/world/asset-*.css
    files/with/extension.*
    css/(bootstrap|skeleton)/[a-z]{1}*.(css|js)
  
  These are used for matching string patterns.
  
  @method createRegexPattern
  @param {string|array} str Pattern String or Array of pattern strings
  @return {RegExp} regex matching the provided pattern
 */

var patternRe1, patternRe2, __patternCache = {};

Utility.prototype.createRegexPattern = function(str) {
  var out;
  if (str instanceof Array) {
    out = [];
    var arr = str;
    for (var item,i=0; i < arr.length; i++) {
      str = arr[i];
      if (str in __patternCache) out.push(__patternCache[str]);  // Use pattern cache
      else out.push(this.createRegexPattern(arr[i]));            // Recursive
    }
    return out;
  } else {
    if (str in __patternCache) return __patternCache[str];       // Use pattern cache
    else {
      out = str
        .replace(patternRe1 || (patternRe1 = /(\.|\\)/g), '\\$1')
        .replace(patternRe2 || (patternRe2 = /\*/g), '(.+)')
        .replace('\\\\+', '\\+');
      out = '^' + out + '$';
      return (__patternCache[str] = new RegExp(out));
    }
  }
}

/**
  Filters strings based on provided pattern(s)

  @method filterWithPattern
  @param {string|array} string String(s) to process
  @param {string|array} pattern Pattern(s) to match against
  @param {boolean} invert If set to true, will invert the match results
 */

Utility.prototype.filterWithPattern = function(string, pattern, invert) {
  
  pattern = this.createRegexPattern(pattern);

  var patterns = (pattern instanceof Array) ? pattern : [pattern];
  var out = [], arr = string;

  for (var str,match=false,i=0,j=0; i < arr.length; i++) {
    str = arr[i];
    for (j=0; j < patterns.length; j++) {
      match = patterns[j].test(str);
      if (match) { 
        // Normal filter, successful if match and not inverted
        if (!invert) out.push(str);
        break;
      }
    }
    // Inverted filter, successful if no match
    if (invert && !match) out.push(str);
  }
  return out;
}

/**
  Excludes strings based on provided pattern(s)

  @method excludeWithPattern
  @param {string|array} string String(s) to process
  @param {string|array} pattern Pattern(s) to match against
 */

Utility.prototype.excludeWithPattern = function(string, pattern) {
  // Return inverted filter
  return this.filterWithPattern(string, pattern, true);
}


module.exports = Utility;
