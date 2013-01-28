
var eco = protos.requireDependency('eco', 'ECO Engine'),
    util = require('util');

/**
  Eco engine class
  
  https://github.com/sstephenson/eco
  
  @class Eco
  @extends Engine
  @constructor
  @param {object} app Application Instance
 */

function Eco(app) {
  this.app = app;
  this.module = eco;
  this.multiPart = true;
  this.extensions = ['eco', 'eco.html'];
}

util.inherits(Eco, protos.lib.engine);

Eco.prototype.render = function(data) {
  data = this.app.applyFilters('eco_template', data);
  var func = this.getCachedFunction(arguments);
  if (func === null) {
    func = eco.compile(data);
    this.cacheFunction(func, arguments);
  }
  return this.evaluate(func, arguments);
}

module.exports = Eco;
