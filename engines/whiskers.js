
/* engines/whiskers.js */

var app = protos.app;
var whiskers = protos.requireDependency('whiskers', 'Whiskers Engine');
var util = require('util');

/**
  Whiskers engine class
  
  https://github.com/gsf/whiskers.js/tree
  
  @class Whiskers
  @extends Engine
  @constructor
  @param {object} app Application Instance
 */

function Whiskers() {

  this.module = whiskers;
  this.multiPart = true;
  this.extensions = ['whiskers', 'whiskers.html', 'wk.html'];

}

util.inherits(Whiskers, protos.lib.engine);

Whiskers.prototype.render = function(data) {
  data = app.applyFilters('whiskers_template', data);
  var tpl, func = this.getCachedFunction(arguments);
  if (func === null) {
    tpl = whiskers.compile(data);
    func = function(locals) {
      return tpl(locals, locals); // context + partials
    }
    this.cacheFunction(func, arguments);
  }
  return this.evaluate(func, arguments);
}

module.exports = Whiskers;
