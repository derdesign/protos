
/* engines/hamlcoffee.js */

var app = protos.app;
var hamlCoffee = protos.requireDependency('haml-coffee', 'HAML-Coffee Engine');
var util = require('util');

/**
  HamlCoffee engine class
  
  https://github.com/9elements/haml-coffee
 */

function HamlCoffee() {

  this.module = hamlCoffee;
  this.multiPart = false;
  this.extensions = ['hamlc', 'haml.coffee', 'hamlc.html'];

}

util.inherits(HamlCoffee, protos.lib.engine);

HamlCoffee.prototype.render = function(data) {
  data = app.applyFilters('hamlcoffee_template', data);
  var tpl, func = this.getCachedFunction(arguments);
  if (func === null) {
    func = hamlCoffee.compile(data);
    this.cacheFunction(func, arguments);
  }
  return this.evaluate(func, arguments);
}

module.exports = HamlCoffee;
