
/* Asset compilers */

var app = protos.app;

var mw = {
  name: 'asset_compiler',
  desc: 'Asset Compiler Middleware',
}

var _ = require('underscore');
var config = config = app.asset_compiler;

var less = protos.requireDependency('less', mw.desc, mw.name);
var sass = protos.requireDependency('node-sass', mw.desc, mw.name);
var stylus = protos.requireDependency('stylus', mw.desc, mw.name);
var nib = protos.requireDependency('nib', mw.desc, mw.name);
var coffee = protos.requireDependency('coffee-script', mw.desc, mw.name);

var pathModule = require('path');

// Asset compilers
module.exports = {
  
  less: function(source, file, callback) {
    less.render(source, _.extend({ // Using underscore's extend instead of protos.extend for performance
      filename: pathModule.basename(file),
      paths: [pathModule.dirname(file)]
    }, config.lessOpts), callback);
  },

  scss: function(source, file, callback) {
    sass.render(_.extend({
      data: source,
      error: callback,
      success: function(css) {
        callback(null, css);
      },
      includePaths: [pathModule.dirname(file)]
    }, config.sassOpts));
  },

  styl: function(source, file, callback) {
    stylus(source, config.stylusOpts)
      .set('filename', file)
      .use(nib())
      .import('nib')
      .render(callback)
    ;
  },
  
  coffee: function(source, file, callback) {
    // console.exit(coffee);
    callback(null, coffee.compile(source, config.coffeeOpts));
  }
  
}