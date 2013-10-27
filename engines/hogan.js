
/* engines/hogan.js */

var app = protos.app;
var hogan = protos.requireDependency('hogan.js', 'Hogan.js Engine', 'hogan.js');
var util = require('util');
    
/**
  Hogan engine class
  
  https://github.com/twitter/hogan.js
 */

var partials = {};

function Hogan() {
  
  /*jshint noempty:false */
  
  this.module = hogan;
  this.multiPart = true;
  this.extensions = ['mustache'];

  app.once('after_init', function() {
    // App partials
    for (var p in app.views.partials) {
      var func = app.views.partials[p];
      if (func.tpl) partials[p] = func.tpl;
      else {
        /*
          Converting regular functions as hogan template objects is possible, 
          and enables the function to be used as a partial inside hogan templates.
        
          There is one problem: even though the functions can be used as 
          hogan templates, the hogan engine provides one argument, and that 
          is the `locals` object passed as template data.
          
          This represents an inconvenience, since helper methods might/can
          receive multiple arguments, depending on the action they are 
          designed to perform.
          
          Hogan is a logicless template engine. This means you can't run regular
          functions inside hogan templates. You can only run hogan partials.
          
          This is the reason why in hogan templates, only hogan-compatible
          partials are available. Helper methods are not present, since they are
          not compatible with the engine.
        */
      }
    }
  });
  
}

util.inherits(Hogan, protos.lib.engine);

Hogan.prototype.render = function(data, vars) {
  data = app.applyFilters('hogan_template', data);
  var tpl, func = this.getCachedFunction(arguments);
  if (func === null) {
    tpl = hogan.compile(data);
    func = function(data, partials) {
      return tpl.render(data, partials); 
    }
    func.tpl = tpl;
    this.cacheFunction(func, arguments);
  }
  return this.evaluate(func, arguments, true);
}

Hogan.prototype.returnPartials = function() {
  return partials;
}

module.exports = Hogan;
