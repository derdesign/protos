
/** 
  Markdown
  
  Provides markdown support for applications & views.
  
  » References:
    https://github.com/coreyti/showdown
    https://github.com/theSmaw/Caja-HTML-Sanitizer
    http://code.google.com/p/google-caja/source/browse/trunk/src/com/google/caja/plugin/html-sanitizer.js
    
  » Configuration Options:
  
    {array} extensions: Array containing extension names or functions for showdown
    {boolean} sanitize: If set to true, will sanitize the markdown output
    {function} sanitizeURIPolicy: Function used to sanitize urls

  » Example:
  
    app.use('markdown');

    app.markdown.parse("__Some Markdown__ to be **rendered**");
    
 */

var app = protos.app;
var _ = require('underscore');
var sanitizer = require('sanitizer');

var Showdown = protos.requireDependency('showdown', 'Markdown Middleware', 'markdown');

function Markdown(config, middleware) {
  
  // Attach to app singleton
  app[middleware] = this;
  
  // Configuration defaults
  config = protos.extend({
    extensions: ['github', 'table', this.customExtension],
    sanitize: true,
    sanitizeURIPolicy: function(url) {
      return url;
    }
  }, config || {});
  
  // Attach config
  this.config = config;
  
  // Set converter
  initializeConverter.call(this);
  
  // Expose markdown.parse as `$markdown` view helper
  app.registerViewHelper('markdown', this.parse, this);
  
}

/**
  Adds a showdown extension

  @param {function|string} func Function (or showdown extension name) to pass containing
  @public
 */

Markdown.prototype.addExtension = function(arg) {
  this.config.extensions.push(arg);
  initializeConverter.call(this);
}

/**
  Sets showdown extensions

  @param {array} arr Array containing showdown extension names or functions
  @public
 */

Markdown.prototype.setExtensions = function(arr) {
  this.config.extensions = arr;
  initializeConverter.call(this);
}

/**
  Custom showdown extensions

  @public
 */

Markdown.prototype.customExtension = function(converter) {
  return [
    {
      // Provide proper prettify class when language specified
      type: 'output',
      filter: function(source){
        return source.replace(/<pre><code class="([^"]+)">/gi, function(match, klass) {
          return '<pre><code class="prettyprint lang-'+ klass +'">';
        });
      }
    },
    {
      // Remove heading id's
      type: 'output',
      filter: function(source) {
        return source.replace(/<(h[123456]) id="[^"]+">/gi, function(match, tag) {
          return '<' + tag + '>';
        });
      }
    }
  ]
}

/**
  Parse a markdown string
  
  @param {string} str Markdown syntax to parse
  @param {boolean} sanitize Whether or not to sanitize output 
  @return {string} html
  @public
 */

Markdown.prototype.parse = function(str, options) {
  var html = this.converter.makeHtml(str);
  var config = options || {};
  config.__proto__ = this.config;
  if (config.sanitize) {
    html = sanitizer.sanitize(html, config.sanitizeURIPolicy);
  }
  return html;
}

/**
  Initializes the showdown converter
 
  @private
 */

function initializeConverter() {
  this.converter = new Showdown.converter({extensions: this.config.extensions});
}

module.exports = Markdown;
