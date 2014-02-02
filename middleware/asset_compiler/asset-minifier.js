
/* Asset Minifier */

var app = protos.app,
    fs = require('fs'),
    path = require('path'),
    util = require('util'),
    Multi = require('multi');


//////////////////////////////////////////
// PREPARATION
//////////////////////////////////////////

var config = app.asset_compiler.config;
 
var _ = require('underscore');

var assetUtil = require('./asset-util.js');

var CleanCSS = protos.requireDependency('clean-css', 'Asset Compiler', 'asset_compiler');
var UglifyJS = protos.requireDependency('uglify-js', 'Asset Compiler', 'asset_compiler');

var cleancss = new CleanCSS(config.cleanCSSOpts);


//////////////////////////////////////////
// EVENTS
//////////////////////////////////////////

app.on('asset_compiler_minify', function(minifyConfig) {
  if (!minifyConfig) minifyConfig = config.minify;
  var compiler = new Multi(assetUtil);
  var minifyTargets = Object.keys(minifyConfig);
  for (var target in minifyConfig) {
    assetUtil.ignoreFiles(minifyConfig[target]);
  }
  minification(minifyConfig, minifyTargets, compiler);
});


//////////////////////////////////////////
// FUNCTIONS
//////////////////////////////////////////


function minification(minifyConfig, minifyTargets, compiler) {
  // NOTE: The minifyTargets array is used to handle recursion state,
  // therefore it is passed as an argument, otherwise it would be
  // reset each time the function is called, due to its recursion.
  var source, sources, target = minifyTargets.shift();
  if (target) {
    sources = minifyConfig[target];
    if (!Array.isArray(sources)) sources = [sources];
    sources.forEach(function(item) {
      compiler.getSource(item, target, 'minify');
    });
    compiler.exec(function(err, compiled) {
      if (err) throw err;
      else {
        var ext = assetUtil.getExt(target);
        target = app.fullPath(app.paths.public + target);
        switch (ext) {
          case 'css':
            source = cleancss.minify(compiled.join('\n'));
            fs.writeFileSync(target, source, 'utf8');
            app.debug("Asset Compiler: Minified CSS: " + app.relPath(target));
            break;
          case 'js':
            source = minifyJS(compiled.join('\n'));
            fs.writeFileSync(target, source, 'utf8');
            app.debug("Asset Compiler: Minified JavaScript: " + app.relPath(target));
            break;
          default:
            throw new Error("Asset Compiler: Extension not supported: " + target);
        }
        minification(minifyConfig, minifyTargets, compiler);
      }
    });
  } else {
    config.minify = minifyConfig; // Set new config once minification is done
    app.emit('asset_compiler_minify_complete');
  }
}

function minifyJS(code) {
  return UglifyJS.minify(code, config.uglifyOpts).code;
}