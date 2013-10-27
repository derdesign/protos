
/* Asset Minifier */

var app = protos.app,
    fs = require('fs'),
    path = require('path'),
    util = require('util'),
    config = app.asset_compiler,
    Multi = require('multi');
    
var cleancss = protos.requireDependency('clean-css', 'Asset Compiler', 'asset_compiler');
var uglifyjs = protos.requireDependency('uglify-js', 'Asset Compiler', 'asset_compiler');

var minifyTargets = Object.keys(config.minify);

var compiler = new Multi({
  getSource: function(f, target, callback) {
    var file = app.fullPath('public/' + f);
    var ext = getExt(file);
    var source = fs.readFileSync(file, 'utf8').toString();
    source = app.applyFilters('asset_compiler_minify_source', source, ext, f);
    source = resolvePaths(source, f, target);
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
      compiler.getSource(item, target);
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
  } else {
    app.emit('asset_compiler_minify_complete');
  }
}

function resolvePaths(source, file, target) {
  var root = app.fullPath('public');
  var matches = source.match(/url\([^\)]+\)/g);
  var targetPath = util.format('%s/%s', root, path.dirname(target));
  if (matches) {
    matches.forEach(function(match) {
      var data = match.replace(/(^url\(|\)$)/g, '');
      if (/^['"]*(data|http):/.test(data) === false ) { // Ignore data:uris and http://
        var p = data.replace(/['"]+/g, '');
        var filePath = path.resolve(util.format('%s/%s/%s', root, path.dirname(file), p));
        p = path.relative(targetPath, filePath);
        var replStr = util.format('url("%s")', p);
        if (replStr != match) { // Avoid infinite loop
          while (source.indexOf(match) >= 0) {
            source = source.replace(match, replStr);
          }
        }
      }
    });
  }
  return source;
}

function minifyJS(code) {
  var ast, compressor, stream;
  ast = uglifyjs.parse(code, {});
  compressor = uglifyjs.Compressor({warnings: false});
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