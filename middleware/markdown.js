
/** 
  Markdown
  
  Provides markdown support for applications & views.
  
  » References:
    https://github.com/chjj/marked
    https://github.com/theSmaw/Caja-HTML-Sanitizer
    http://code.google.com/p/google-caja/source/browse/trunk/src/com/google/caja/plugin/html-sanitizer.js
    
  » Configuration Options:
  
    {boolean} gfm: Enable github flavored markdown (enabled by default)
    {boolean} pedantic: onform to obscure parts of markdown.pl as much as possible
    {boolean} sanitize: Sanitize the output.
    {function} highlight: A callback to highlight code blocks.

  » Example:
  
    app.use('markdown');

    app.markdown.parse("__Some Markdown__ to be **rendered**");
    
 */

var app = protos.app,
    marked = protos.requireDependency('marked', 'Markdown Middleware', 'markdown'),
    sanitizer = require('sanitizer');

function Markdown(config, middleware) {
  
  // Attach to app singleton
  app[middleware] = this;
  
  // Configuration defaults
  config = protos.extend({
    gfm: true,
    tables: true,
    breaks: false,
    pedantic: false,
    sanitize: true,
    smartLists: false,
    silent: true,
    highlight: null,
    langPrefix: 'lang-'
  }, config);
  
  // Setup Caja sanitizer
  this.sanitize = config.sanitize;

  // Will use sanitizer module instead
  config.sanitize = false;

  // Define config property
  Object.defineProperty(this, 'config', {
    value: config,
    writable: true,
    enumerable: false,
    configurable: true
  });
  
  // Register Markdown view helpers
  registerViewHelpers(this);
  
}

/**
  Filter method that determines if a URL will be accepted by the sanitizer 
  
  @param {string} url URI to process
  @return {string} url The same value of the url argument if passed (otherwise null)
  @public
  */

Markdown.prototype.sanitizeURI = function(url) {
  return url;
}

/**
  Parse a markdown string
  
  @param {string} str Markdown syntax to parse
  @param {boolean} sanitize Whether or not to sanitize output 
  @return {string} html
  @public
 */

Markdown.prototype.parse = function(str, sanitize) {
  var html = marked(str, this.config), type = typeof sanitize;
  if ( (type == 'undefined' && this.sanitize) || (type == 'boolean' && sanitize) ) sanitize = true;
  return sanitize ? sanitizer.sanitize(html, this.sanitizeURI) : html;
}

/**
  Registers View Helpers
  
  @param {object} markdown
  @private
 */

function registerViewHelpers(markdown) {
  // Expose markdown.parse as `$markdown`
  app.registerViewHelper('markdown', markdown.parse, markdown);
}

module.exports = Markdown;
