
var hamlCoffee = protos.requireDependency('haml-coffee', 'HAML-Coffee Engine'),
    util = require('util');

/**
  HamlCoffee engine class
  
  https://github.com/9elements/haml-coffee
  
  @class HamlCoffee
  @extends Engine
  @constructor
  @param {object} app Application Instance
 */

function HamlCoffee(app) {
  this.app = app;
  this.module = hamlCoffee;
  this.multiPart = false;
  this.extensions = ['hamlc', 'haml.coffee', 'hamlc.html'];
}

util.inherits(HamlCoffee, protos.lib.engine);

HamlCoffee.prototype.render = function(data) {
  data = this.app.applyFilters('hamlcoffee_template', data);
  var tpl, func = this.getCachedFunction(arguments);
  if (func === null) {
    func = hamlCoffee.compile(data);
    this.cacheFunction(func, arguments);
  }
  return this.evaluate(func, arguments);
}

module.exports = HamlCoffee;
