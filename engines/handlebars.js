
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

var context = {
  get partials() { return optionsContext.partials; },
  get helpers() { return optionsContext.helpers; }
}

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
    func = function(data) {
      return (fn(data, context) || '').toString(); // Ensure a string is returned (could be SafeString instance)
    }
    this.cacheFunction(func, arguments);
  }
  return this.evaluate(func, arguments, false); // Passing partials manually, hence false.
}

Handlebars.prototype.returnPartials = function() {
  // Returning empty partials object, because we are using handlebars optimized partials
  // If the partials object is passed, then these functions will be called by using the
  // double stashes {{}} (because handlebars runs functions inside these) which provides
  // undesired results. This is done so we can use the partials as helpers.
  return {}; 
}

function partialHelper() {
  var args = slice.call(arguments, 0);
  var options = args.pop();
  var params = options.hash;
  var partial = args[0] && args[0].replace(/\-+/g, '_'); // Allow dashes in partial names
  if (partial && partial in partials) { // Make sure we are always using the updated partials object
    if (this.locals !== this) {
      // Avoid cyclic __proto__ value by checking if
      // the 'this' object is indeed the locals object
      this.__proto__ = args[1] || params.locals || {};
    }
    if (options.fn instanceof Function) {
      // Add wrapped content into params.content
      params.content = new SafeString(options.fn(this));
    }
    params.__proto__ = this;
    return new SafeString(partials[partial].call(null, params));
  } else {
    return '';
  }
}

app.on('view_partials_loaded', function(ob) {
  
  // Initialize to support hot code loading
  
  partials = app.views.partials; // Used by the partial helper
  
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

  // Create handlebars helpers and partials

  Object.keys(ob).forEach(function(name) {
    if (name[0] == '$') { // Helpers
      optionsContext.helpers[name.slice(1)] = function() {
        var args = slice.call(arguments, 0);
        var options = args.pop();
        var params = options.hash;
        var content = options.fn instanceof Function ? new SafeString(options.fn(this)) : '';
        var out = ob[name].apply(null, [content].concat(args).concat([params]));
        return new SafeString(out);
      }
    } else { // Partials
      optionsContext.partials[name] = function() {
        var out = ob[name].apply(null, arguments);
        return new SafeString(out);
      };
    }
  });
  
  // Enable partials to be able to be run as helpers, by making
  // the necessary adjustments. The partials will only be registered
  // as helpers only if there is not a helper with the same name.
  
  Object.keys(optionsContext.partials).forEach(function(partial) {
    if ( !(partial in optionsContext.helpers) ) {
      optionsContext.helpers[partial] = function() {
        var args = slice.call(arguments, 0);
        args.unshift(partial);
        return partialHelper.apply(this, args);
      }
    }
  });
  
});

module.exports = Handlebars;
