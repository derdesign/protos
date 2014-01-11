
/* Asset compilers */

var mw = {
  name: 'asset_compiler',
  desc: 'Asset Compiler Middleware',
}

var less = protos.requireDependency('less', mw.desc, mw.name);
var sass = protos.requireDependency('node-sass', mw.desc, mw.name);
var stylus = protos.requireDependency('stylus', mw.desc, mw.name);
var nib = protos.requireDependency('nib', mw.desc, mw.name);
var coffee = protos.requireDependency('coffee-script', mw.desc, mw.name);

var pathModule = require('path');

// Asset compilers
module.exports = {
  
  less: function(source, file, callback) {
    less.render(source, {
      filename: pathModule.basename(file),
      paths: [pathModule.dirname(file)]
    }, callback);
  },
  
  scss: function(source, file, callback) {
    sass.render({
      data: source,
      error: callback,
      success: function(css) {
        callback(null, css);
      },
      includePaths: [pathModule.dirname(file)]
    });
  },

  styl: function(source, file, callback) {
    stylus(source)
      .set('filename', file)
      .use(nib())
      .import('nib')
      .render(callback)
    ;
  },
  
  coffee: function(source, file, callback) {
    callback(null, coffee.compile(source));
  }
  
}