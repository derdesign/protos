
/* engines/jshtml.js */

var app = protos.app;
var jshtml = protos.requireDependency('jshtml', 'JSHtml Engine');
var util = require('util');

/**
  JsHtml engine class
  
  https://github.com/LuvDaSun/jshtml
 */

function JsHtml() {

  this.module = jshtml;
  
  var opts = (app.config.engines && app.config.engines.jshtml) || {};

  this.options = protos.extend({with: false}, opts);
  
  this.multiPart = true;
  this.extensions = ['jshtml', 'js.html'];

}

util.inherits(JsHtml, protos.lib.engine);

JsHtml.prototype.render = function(data) {
  data = app.applyFilters('jshtml_template', data);
  var func = this.getCachedFunction(arguments);
  if (func === null) {
    func = jshtml.compile(data, this.options);
    this.cacheFunction(func, arguments);
  }
  return this.evaluate(func, arguments);
}

module.exports = JsHtml;
