
/* Asset Minifier */

var app = protos.app,
    fs = require('fs'),
    util = require('util'),
    config = app.asset_compiler,
    Multi = require('multi');
    
var cleancss = protos.requireDependency('clean-css', 'Asset Compiler', 'asset_compiler');
var uglifyjs = protos.requireDependency('uglify-js', 'Asset Compiler', 'asset_compiler');

var minifyTargets = Object.keys(config.minify);

var compiler = new Multi({
  getSource: function(file, callback) {
    file = app.fullPath('public/' + file);
    var ext = getExt(file);
    var source = fs.readFileSync(file, 'utf-8').toString();
    if (ext in config.compilers) {
      config.compilers[ext](source, file, callback);
    } else {
      callback(null, source);
    }
  }
});

// Recursive minification
function minification() {
  var sources, target = minifyTargets.shift();
  if (target) {
    sources = config.minify[target];
    if (!Array.isArray(sources)) sources = [sources];
    sources.forEach(function(item, i) {
      compiler.getSource(item);
    });
    compiler.exec(function(err, compiled) {
      if (err) throw err;
      else {
        var ext = getExt(target);
        target = app.fullPath('public/' + target);
        if (ext == 'css') {
          var source = cleancss.process(compiled.join('\n'));
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
  }
}

function minifyJS(code) {
  var ast, compressor, stream;
  ast = uglifyjs.parse(code, {});
  compressor = uglifyjs.Compressor();
  ast.figure_out_scope();
  ast = ast.transform(compressor);
  ast.figure_out_scope();
  ast.compute_char_frequency();
  ast.mangle_names();
  stream = uglifyjs.OutputStream();
  ast.print(stream);
  return stream.toString();
}

function getExt(file) {
  return file.slice(file.lastIndexOf('.')+1).trim().toLowerCase();
}

// Run
minification();