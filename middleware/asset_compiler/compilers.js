
/* Asset compilers */

var less = protos.requireDependency('less', 'Asset Compiler Middleware', 'asset_compiler'),
    stylus = protos.requireDependency('stylus', 'Asset Compiler Middleware', 'asset_compiler'),
    nib = protos.requireDependency('nib', 'Asset Compiler Middleware', 'asset_compiler'),
    coffee = protos.requireDependency('coffee-script', 'Asset Compiler Middleware', 'asset_compiler'),
    pathModule = require('path');

// Asset compilers
module.exports = {
  
  less: function(source, file, callback) {
    less.render(source, {
      filename: pathModule.basename(file) + '/',
      paths: [pathModule.dirname(file)]
    }, callback);
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