
/* engines/jqtpl.js */

var jqtpl = protos.requireDependency('jqtpl', 'jQuery Template Engine');
var util = require('util');

/**
  JqueryTemplate engine class
  
  https://github.com/kof/jqtpl
  
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
    jqtpl.compile(data, tplID);
    func = (function(tplID) {
      return function(locals) {
        return jqtpl.render(tplID, locals);
      }
    })(tplID);
    this.cacheFunction(func, arguments);
  }
  return this.evaluate(func, arguments);
}

module.exports = JqueryTemplate;
