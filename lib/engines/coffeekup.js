
/* Coffeekup  */

var _ = require('underscore'),
    ck = require('coffeekup'),
    util = require('util');
    
// https://github.com/mauricemach/coffeekup

function CoffeeKup(app) {
  this.app = app;
  this.options = {
    locals: true,
    hardcode: {}
  };
  this.module = ck;
  this.multiPart = true;
  this.extensions = ['coffeekup', 'ck.html'];
}

util.inherits(CoffeeKup, framework.lib.engine);

CoffeeKup.prototype.render = function(data) {
  data = this.app.applyFilters('coffeekup_template', data);
  var tpl, func = this.getCachedFunction(arguments);
  if (func === null) {
    tpl = ck.compile(data, this.options);

    // Get boundary whitespace from template
    var ws = this.getBoundaryWhitespace(data),
        sw = ws[0],
        ew = ws[1];
    
    func = function(locals) {
      // CoffeeKup requires some reserved variables which need
      // to exist in the locals object. These are only if not present.
      if (locals.format == null) locals.format = true;
      if (locals.autoescape == null) locals.autoescape == false;
      
      // NOTE: Coffeekup uses the `locals` property in the context
      // object, as the context for the `with` statement when rendering
      // the templates. This allows the properties to be accessed via
      // `@property` as well as `property`. Have this in mind when 
      // creating your templates.
      
      // Account for whitespace on render
      return sw + tpl(locals) + ew;
    }
    
    this.cacheFunction(func, arguments);
  }
  
  return this.evaluate(func, arguments);
}

module.exports = CoffeeKup;