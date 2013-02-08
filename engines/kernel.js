
/* engines/kernel */

var app = protos.app;
var kernel = protos.requireDependency('kernel', 'Kernel Engine'),
    util = require('util'),
    generator = kernel.generator,
    parser = kernel.parser,
    tokenizer = kernel.tokenizer,
    helpers = kernel.helpers;

/**
  Kernel engine class
  
  https://github.com/c9/kernel
 */

function Kernel() {

  this.module = kernel;
  this.async = true;
  this.multiPart = true;
  this.extensions = ['kernel', 'kernel.html', 'k.html', 'khtml'];

}

util.inherits(Kernel, protos.lib.engine);

Kernel.prototype.render = function(data) {
  data = app.applyFilters('kernel_template', data);
  var tpl, func = this.getCachedFunction(arguments);
  if (func === null) {
    tpl = this.compile.apply(this, arguments);
    if (typeof tpl == 'function') {
      func = function(locals, callback) {
        tpl(locals, function(err, html) {
          callback.call(null, html || err);
        });
      }
    } else {
      func = tpl; // Errors compiling template
    }
    this.cacheFunction(func, arguments);
  }
  return this.evaluate(func, arguments);
}

Kernel.prototype.compile = function(source, vars, relPath) {
  try {
    return kernel.compile(source, relPath)
  } catch(e) {
    return e;
  }
}

Kernel.prototype.asyncPartial = function(func) {
 return function(arg, callback) {
   func(arg, function(buf) {
     callback(null, buf);
   });
 }
}

module.exports = Kernel;
