
/* engines/jqtpl.js */

var app = protos.app;
var jqtpl = protos.requireDependency('jqtpl', 'jQuery Template Engine');
var util = require('util');

/**
  JqueryTemplate engine class
  
  https://github.com/kof/jqtpl
 */

function JqueryTemplate() {

  this.module = jqtpl;
  this.multiPart = true;
  this.extensions = ['jqtpl', 'jqtpl.html', 'jq.html'];

}

util.inherits(JqueryTemplate, protos.lib.engine);

JqueryTemplate.prototype.render = function(data, vars, relPath) {
  data = app.applyFilters('jqtpl_template', data);
  var func = this.getCachedFunction(arguments);
  if (func === null) {
    var tplID = util.format('%s:%s', app.hostname, relPath);
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
