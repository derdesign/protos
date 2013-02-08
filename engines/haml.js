
/* engines/haml.js */

// require('hamljs') is broken
// https://github.com/isaacs/npm/issues/1903
// https://github.com/visionmedia/haml.js/issues/41

var app = protos.app;
var haml = protos.requireDependency('./node_modules/hamljs/lib/haml.js', 'HAML Engine', 'hamljs');
var util = require('util');
    
/**
  Haml engine class
  
  https://github.com/visionmedia/haml.js
 */

function Haml() {

  this.module = haml;
  this.multiPart = false;
  this.extensions = ['haml', 'haml.html'];

}

util.inherits(Haml, protos.lib.engine);

Haml.prototype.render = function(data) {
  data = app.applyFilters('haml_template', data);
  var tpl, func = this.getCachedFunction(arguments);
  if (func === null) {
    func = function(vars) { 
      return haml.render(data, {locals: vars}); 
    }
    this.cacheFunction(func, arguments);      
  }
  return this.evaluate(func, arguments);
}

module.exports = Haml;
