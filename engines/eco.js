
/* engines/eco.js */

var app = protos.app;
var eco = protos.requireDependency('eco', 'ECO Engine');
var util = require('util');

/**
  Eco engine class
  
  https://github.com/sstephenson/eco
 */

function Eco() {

  this.module = eco;
  this.multiPart = true;
  this.extensions = ['eco', 'eco.html'];

}

util.inherits(Eco, protos.lib.engine);

Eco.prototype.render = function(data) {
  data = app.applyFilters('eco_template', data);
  var func = this.getCachedFunction(arguments);
  if (func === null) {
    func = eco.compile(data);
    this.cacheFunction(func, arguments);
  }
  return this.evaluate(func, arguments);
}

module.exports = Eco;
