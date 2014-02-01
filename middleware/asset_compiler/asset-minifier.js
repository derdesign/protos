
/* Asset Minifier */

var app = protos.app,
    fs = require('fs'),
    path = require('path'),
    util = require('util'),
    config = app.asset_compiler,
    Multi = require('multi');
    
var _ = require('underscore');

var assetUtil = require('./asset-util.js');

var CleanCSS = protos.requireDependency('clean-css', 'Asset Compiler', 'asset_compiler');
var UglifyJS = protos.requireDependency('uglify-js', 'Asset Compiler', 'asset_compiler');

var cleancss = new CleanCSS(config.cleanCSSOpts);

var minifyTargets = Object.keys(config.minify);

var compiler = new Multi(assetUtil);

// Recursive minification
function minification() {
  var sources, target = minifyTargets.shift();
  if (target) {
    sources = config.minify[target];
    if (!Array.isArray(sources)) sources = [sources];
    sources.forEach(function(item, i) {
      compiler.getSource(item, target, 'minify');
    });
    compiler.exec(function(err, compiled) {
      if (err) throw err;
      else {
        var ext = assetUtil.getExt(target);
        target = app.fullPath(app.paths.public + target);
        if (ext == 'css') {
          var source = cleancss.minify(compiled.join('\n'));
          fs.writeFileSync(target, source, 'utf8');
          app.debug("Asset Compiler: Minified CSS: " + app.relPath(target));
        } else if (ext == 'js') {
          var outSrc = minifyJS(compiled.join('\n'));
          fs.writeFileSync(target, outSrc, 'utf8');
          app.debug("Asset Compiler: Minified JavaScript: " + app.relPath(target));
        } else {
          throw new Error("Asset Compiler: Extension not supported: " + target);
        }
        minification();
      }
    });
  } else {
    app.emit('asset_compiler_minify_complete');
  }
}

function minifyJS(code) {
  return UglifyJS.minify(code, config.uglifyOpts).code;
}

// Run
minification();