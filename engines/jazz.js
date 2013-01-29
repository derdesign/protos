
/* engines/jazz.js */

var jazz = protos.requireDependency('jazz', 'Jazz Engine');
var util = require('util');

/**
  Jazz engine class
  
  https://github.com/shinetech/jazz
  
  @class Jazz
  @extends Engine
  @constructor
  @param {object} app Application Instance
 */

function Jazz(app) {
  this.app = app;
  this.module = jazz;
  this.async = true;
  this.multiPart = true;
  this.extensions = ['jazz', 'jazz.html'];
}

util.inherits(Jazz, protos.lib.engine);

Jazz.prototype.render = function(data) {
  data = this.app.applyFilters('jazz_template', data);
  var tpl, func = this.getCachedFunction(arguments);
  if (func === null) {
    tpl = jazz.compile(data);
    func = function(locals, callback) {
      /*jshint evil:true */
      tpl.eval(locals, callback);
    }
    this.cacheFunction(func, arguments);
  }
  return this.evaluate(func, arguments);
}

Jazz.prototype.asyncPartial = function(func) {
  return function(arg, callback) {
    func(arg, function(buf) {
      callback(buf);
    });
  }
}

Jazz.prototype.syncPartial = function(func) {
  return function(arg, callback) {
    callback(func(arg));
  }
}

module.exports = Jazz;
