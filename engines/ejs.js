
/* engines/ejs.js */

var app = protos.app;
var ejs = protos.requireDependency('ejs', 'EJS Engine');
var util = require('util');

/**
  EJS engine class
  
  https://github.com/mde/ejs
 */

function EJS() {
  
  var opts = (app.config.engines && app.config.engines.ejs) || {};
  
  this.options = protos.extend({
    delimiter: '?'
  }, opts);
  
  this.module = ejs;
  this.multiPart = true;
  this.extensions = ['ejs', 'ejs.html'];

}

util.inherits(EJS, protos.lib.engine);

EJS.prototype.render = function(data) {
  data = app.applyFilters('ejs_template', data);
  var func = this.getCachedFunction(arguments);
  if (func === null) {
    func = ejs.compile(data, this.options);
    this.cacheFunction(func, arguments);
  }
  return this.evaluate(func, arguments);
}

module.exports = EJS;
