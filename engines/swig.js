
/* engines/swig.js */

var app = protos.app;
var swig = protos.requireDependency('swig', 'Swig Engine');
var util = require('util');

/**
  Swig engine class
  
  To use template inheritance and the other features the engine provides,
  use paths relative to the application's `app/views` directory.

  https://github.com/paularmstrong/swig
 */

function Swig() {
  
  var opts = (app.config.engines && app.config.engines.swig) || {};
  
  this.options = protos.extend({
    allowErrors: true,
    autoescape: true,
    encoding: 'utf-8',
    tags: {},
    root: app.fullPath('app/views')
  }, opts);
  
  swig.init(this.options);
  
  this.module = swig;
  this.multiPart = true;
  this.extensions = ['swig', 'swig.html', 'sw.html'];

}

util.inherits(Swig, protos.lib.engine);

Swig.prototype.render = function(data) {
  data = app.applyFilters('swig_template', data);
  var tpl, func = this.getCachedFunction(arguments);
  if (func === null) {
    tpl = swig.compile(data);
    // Wrap compiler in a new function, to make it
    // compatible with other view engines
    func = function(locals) {
      return tpl(locals);
    }
    this.cacheFunction(func, arguments);
  }
  return this.evaluate(func, arguments);
}

module.exports = Swig;
