
/**
  Shortcode

  Allows applications to filter content using shortcodes.
  
  The reason behind this, is to overcome JavaScript's limitation to
  parse multiline strings.
  
  You can define shortcodes using any template engine. You bind functions
  to the shortcode labels to modify the content wrapped within such
  shortcode. Spaces and line feeds are preserved.
  
  Shortcodes keep your view code clean, by delegating string processing
  operations to separate functions, not related to the view.
  
  » TODO
  
    The following things might be useful, but I don't have the time to
    implement these features right now. In case you want to help out:
    
    * Ability to pass arguments to shortcodes
  
  » Use Cases:
  
    - Parse markdown strings within your views
    - Content Sanitization & Escaping, to protect against XSS Attacks
    - Include cached content into your views
  
  » Example:
  
    var buffer = "Lorem [uppercase]ipsum[/uppercase] dolor sit [base64]AMET[/base64] et sempis";
  
    buffer = app.shortcode.replace(buffer, {
      uppercase: function(str) {
        return str.toUpperCase();
      }, 
      base64: function(str) {
        return new Buffer(str).toString('base64');
      }
    });
  
    res.end(buffer); // returns: "Lorem IPSUM dolor sit QU1FVA== et sempis"
  
 */

var app = protos.app,
    util = require('util');

function Shortcode(config, middleware) {
  
  // Middleware configuration
  config = protos.extend({
    
  }, config);
  
  Object.defineProperty(this, 'config', {
    value: config,
    writable: true,
    enumerable: false,
    configurable: true
  });
  
  // Attach middleware to app singleton
  app[middleware] = this;
  
}

/**
  Add a filter to the response buffer of context
  
  @param {string} context Response context to filter
  @param {string|object} ob Object containing the shortcode methods
  @return {string} modified buffer
  @public
 */

Shortcode.prototype.filterContext = function(context, ob) {
  var filter = context + '_context';
  var self = this;
  app.addFilter(filter, function(data) {
    data.buffer = self.replace(data.buffer, ob);
    return data;
  });
}

/**
  Replaces shortcodes with output from the replacer functions
  
  @param {string} buffer
  @param {string|object} shortcode
  @param {function} callback (optional if shortcode is object)
  @return {string} modified buffer
  @public
 */

Shortcode.prototype.replace = function(buffer, shortcode, func) {
  if (func instanceof Function) {
    // `shortcode` is a string containing the shortcode
    return replaceShortcode(buffer, shortcode, func);
  } else if (shortcode.constructor && shortcode.constructor === Object) {
    // `shortcode` is an object containing {shortcode:func}
    var ob = shortcode;
    for (var key in ob) {
      func = ob[key];
      buffer = replaceShortcode(buffer, key, func);
    }
    return buffer;
  } else {
    return buffer;
  }
}

var regexChars = app.regex.regExpChars;

function replaceShortcode(buffer, shortcode, func) {
  var pat = shortcode.replace(regexChars, '\\$1'),
      open = util.format('[%s]', shortcode),
      close = util.format('[/%s]', shortcode);
      
  var regex = new RegExp(util.format("\\[%s\\](.|\\n|)+\\[\\/%s\\]", pat, pat), 'g');
  
  var matches = buffer.match(regex);
  
  if (matches) {
    matches = matches.pop().split(open);
    for (var repl,match,i=0; i < matches.length; i++) {
      match = matches[i];
      if (!match) continue;
      match = match.slice(0, match.indexOf(close));
      repl = open + match + close;
      // console.log([repl]);
      buffer = buffer.replace(repl, func(match));
    }
  }
  return buffer;
}

module.exports = Shortcode;