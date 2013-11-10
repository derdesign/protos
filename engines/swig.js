
/* engines/swig.js */

var app = protos.app;
var swig = protos.requireDependency('swig', 'Swig Engine');
var util = require('util');

/**
  Swig engine class
  
  https://github.com/paularmstrong/swig
 */

function Swig() {
  
  var opts = (app.config.engines && app.config.engines.swig) || {};
  
  this.options = protos.extend({
    cache: app.viewCaching ? true : false
  }, opts);
  
  swig.setDefaults(this.options); // Set options for swig
  
  this.module = swig;
  this.multiPart = true;
  this.extensions = ['swig', 'swig.html'];

}

util.inherits(Swig, protos.lib.engine);

Swig.prototype.render = function(data, locals, path) {
  data = app.applyFilters('swig_template', data);
  var func = this.getCachedFunction(arguments);
  if (func === null) {
    func = swig.compile(data, {
      filename: path // Filename needed to ensure view extensions work
    });
    this.cacheFunction(func, arguments);
  }
  return this.evaluate(func, arguments);
}

module.exports = Swig;
