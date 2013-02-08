
/* engines/markdown.js */

var app = protos.app;
var util = require('util');
var marked = protos.requireDependency('marked', "Markdown Engine", 'markdown');

/**
  Markdown engine class
  
  @class Markdown
  @extends Engine
  @constructor
  @param {object} app Application Instance
 */

function Markdown() {
  
  var opts = (app.config.engines && app.config.engines.markdown) || {};
  
  this.options = protos.extend({
    gfm: true,
    tables: true,
    breaks: false,
    pedantic: false,
    sanitize: false,
    smartLists: false,
    silent: true,
    highlight: null,
    langPrefix: 'lang-'
  }, opts);

  this.module = marked;
  this.multiPart = true;
  this.extensions = ['md', 'markdown'];

}

util.inherits(Markdown, protos.lib.engine);

Markdown.prototype.render = function(data) {
  var func = this.getCachedFunction(arguments);
  if (func === null) {
    var compiled = marked(data, this.options);
    func = function() { return compiled; }
    this.cacheFunction(func, arguments);
  }
  return this.evaluate(func, arguments);
}

module.exports = Markdown;
