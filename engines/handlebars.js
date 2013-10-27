
/* engines/handlebars.js */

var app = protos.app;
var handlebars = protos.requireDependency('handlebars', 'Handlebars Engine');
var util = require('util');
    
/**
  Handlebars engine class
  
  https://github.com/wycats/handlebars.js
 */

var partials;

function Handlebars() {

  this.module = handlebars;
  this.multiPart = true;
  this.extensions = ['hb', 'hb.html'];
  partials = {partials: app.views.partials};

}

util.inherits(Handlebars, protos.lib.engine);

Handlebars.prototype.render = function(data) {
  data = app.applyFilters('handlebars_template', data);
  var tpl, func = this.getCachedFunction(arguments);
  if (func === null) {
    func = handlebars.compile(data);
    this.cacheFunction(func, arguments);
  }
  return this.evaluate(func, arguments, true);
}

Handlebars.prototype.registerHelper = function(alias, callback) {
  handlebars.registerHelper(alias, callback);
}

Handlebars.prototype.returnPartials = function() {
  return partials;
}

module.exports = Handlebars;
