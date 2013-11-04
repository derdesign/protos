
/* engines/handlebars.js */

var app = protos.app;
var handlebars = protos.requireDependency('handlebars', 'Handlebars Engine');
var util = require('util');
var slice = Array.prototype.slice;

var SafeString = handlebars.SafeString;
    
/**
  Handlebars engine class
  
  https://github.com/wycats/handlebars.js
 */

var partials, optionsContext = {};

function Handlebars() {

  this.module = handlebars;
  this.multiPart = true;
  this.extensions = ['hbs', 'handlebars'];
  partials = {partials: app.views.partials};

}

util.inherits(Handlebars, protos.lib.engine);

Handlebars.prototype.render = function(data) {
  data = app.applyFilters('handlebars_template', data);
  var tpl, func = this.getCachedFunction(arguments);
  if (func === null) {
    var fn = handlebars.compile(data);
    var context = optionsContext;
    func = function(data) {
      return fn(data, context);
    }
    this.cacheFunction(func, arguments);
  }
  return this.evaluate(func, arguments, true);
}

Handlebars.prototype.returnPartials = function() {
  return partials;
}

function partialHelper() {
  var args = slice.call(arguments, 0);
  var options = args.pop();
  var params = options.hash;
  var partial = args[0];
  if (partial && partial in partials) {
    if (this.locals !== this) {
      // Avoid cyclic __proto__ value by checking if
      // the 'this' object is indeed the locals object
      this.__proto__ = args[1] || params.locals || {};
    }
    if (options.fn instanceof Function) {
      // Add wrapped content into params.content
      params.content = options.fn(this);
    }
    params.__proto__ = this;
    return new SafeString(partials[partial](params));
  } else {
    return '';
  }
}

app.on('view_partials_loaded', function(ob) {
  
  // Initialize to support hot code loading
  
  partials = app.views.partials;
  
  optionsContext = {
    helpers: {
      partial: partialHelper
    },
    partials: {}
  }
  
  if (ob.$partial instanceof Function) {
    throw new Error("The 'partial' helper is reserved by the Handlebars Engine.");
  }

  var slice = Array.prototype.slice;
  
  Object.keys(ob).forEach(function(name) {
    var func = ob[name];
    if (name[0] == '$') { // Helpers
      optionsContext.helpers[name.slice(1)] = function() {
        var args = slice.call(arguments, 0);
        var options = args.pop();
        var params = options.hash;
        var content = options.fn instanceof Function ? options.fn(this) : '';
        var out = func.apply(null, [content].concat(args).concat([params]));
        return new SafeString(out);
      }
    } else { // Partials
      optionsContext.partials[name] = ob[name]; // Can be passed as-is
    }
  });
  
});

module.exports = Handlebars;
