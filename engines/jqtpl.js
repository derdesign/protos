
/**
  @module engines
  @namespace engine
 */

var jqtpl = protos.requireDependency('jqtpl', 'jQuery Template Engine'),
    util = require('util');

/**
  JqueryTemplate engine class
  
  https://github.com/kof/node-jqtpl
  
  @class JqueryTemplate
  @extends Engine
  @constructor
  @param {object} app Application Instance
 */

function JqueryTemplate(app) {
  this.app = app;
  this.module = jqtpl;
  this.multiPart = true;
  this.extensions = ['jqtpl', 'jqtpl.html', 'jq.html'];
}

util.inherits(JqueryTemplate, protos.lib.engine);

JqueryTemplate.prototype.render = function(data, vars, relPath) {
  data = this.app.applyFilters('jqtpl_template', data);
  var func = this.getCachedFunction(arguments);
  if (func === null) {
    var tplID = util.format('%s:%s', this.app.hostname, relPath);
    var tpl = jqtpl.compile(data, tplID);
    func = function(locals) {
      return tpl(locals);
    }
    this.cacheFunction(func, arguments);
  }
  return this.evaluate(func, arguments);
}

module.exports = JqueryTemplate;
