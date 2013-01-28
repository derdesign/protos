
var app = protos.app,
    util = require('util');

/**
  Plain engine class
  
  @class Plain
  @extends Engine
  @constructor
  @param {object} app Application Instance
 */

function Plain(app) {
  this.app = app;
  this.module = null;
  this.multiPart = true;
  this.extensions = ['txt', 'plain'];
}

util.inherits(Plain, protos.lib.engine);

Plain.prototype.render = function(data) {
  data = this.app.applyFilters('plain_template', data);
  var func = this.getCachedFunction(arguments);
  if (func === null) {
    func = function() {
      return data; // plain, just return data received
    }
    this.cacheFunction(func, arguments);
  }
  return this.evaluate(func, arguments);
}

module.exports = Plain;
