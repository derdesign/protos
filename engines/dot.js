
/* engines/dot.js */

var app = protos.app;
var dot = protos.requireDependency('dot', 'DoT Engine');
var util = require('util');

/**
  DoT engine class
  
  https://github.com/olado/doT
 */

function Dot() {

  this.module = dot;
  this.multiPart = true;
  this.extensions = ['dot', 'dot.html'];
  this.withContext = true;
  
  // Override dot.templateSettings
  dot.templateSettings.varname = 'locals';
  dot.templateSettings.strip = false;
  dot.templateSettings.append = false;
  
  var opts = (app.config.engines && app.config.engines.dot) || {};
  
  dot.templateSettings = protos.extend(dot.templateSettings, opts);
  
}

util.inherits(Dot, protos.lib.engine);

Dot.prototype.render = function(data) {
  data = app.applyFilters('dot_template', data);
  var func = this.getCachedFunction(arguments);
  if (func === null) {
    func = dot.compile(data);
    this.cacheFunction(func, arguments);
  }
  return this.evaluate(func, arguments);
}

module.exports = Dot;
