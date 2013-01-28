
var ejs = protos.requireDependency('ejs', 'EJS Engine'),
    util = require('util');

/**
  EJS engine class
  
  https://github.com/visionmedia/ejs
  
  @class EJS
  @extends Engine
  @constructor
  @param {object} app Application Instance
 */

function EJS(app) {
  this.app = app;
  
  var opts = (app.config.engines && app.config.engines.ejs) || {};
  
  this.options = protos.extend({open: '<?', close: '?>'}, opts);
  
  this.module = ejs;
  this.multiPart = true;
  this.extensions = ['ejs', 'ejs.html'];
}

util.inherits(EJS, protos.lib.engine);

EJS.prototype.render = function(data) {
  data = this.app.applyFilters('ejs_template', data);
  var func = this.getCachedFunction(arguments);
  if (func === null) {
    func = ejs.compile(data, this.options);
    this.cacheFunction(func, arguments);
  }
  return this.evaluate(func, arguments);
}

module.exports = EJS;
