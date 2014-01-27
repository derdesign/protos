
/* Asset manager */

var _ = require('underscore');

var app = protos.app,
    fs = require('fs'),
    util = require('util'),
    chokidar = require('chokidar'),
    fileModule = require('file'),
    pathModule = require('path'),
    config = app.asset_compiler;

var ignores = [];

app.once('init', function() {
  // Remove any duplicate entries in ignores array to improve performance
  // and avoid unnecessary lookups
  ignores = _.unique(ignores);
});

var truthy = function(val) {
  return val; 
}

// Set ignores to be unique on startup

// Concatenation

if (config.concat) {
  
  var Multi = require('multi');
  
  var concat = config.concat;
  var concatFiles = Object.keys(concat);
  var concatCount = 0;
  
  concatFiles.forEach(function(target, index) {
    
    var files = concat[target];
    var multi = new Multi(fs, {interrupt: false});
    
    for (var file,i=0,len=files.length; i < len; i++) {
      file = app.fullPath(app.paths.public + files[i]);
      multi.readFile(file, 'utf8');
      ignores.push(file); // Prevent source files from being accessed
    }
    
    multi.exec(function(errors, results) {
      
      if (errors) {
        
        throw errors.filter(truthy);
        
      } else {
        
        var buf = results.filter(truthy).join('\n\n');
        
        fs.writeFile(app.fullPath(app.paths.public + target), buf, 'utf8', function(err) {
          if (err) {
            throw err;
          } else {
            app.debug(util.format('Asset Manager: Concatenated %s', target));
            if (++concatCount === concatFiles.length) {
              app.emit('asset_compiler_concat_complete');
            }
          }
        });
        
      }
      
    });
    
  });
  
}

// ===========================================================

// Handle compile_all event
app.on('compile_all', compileAll);
    
// Do nothing if no compilation is required
if (config.compile.length === 0) return;

var assets = {},
    extRegex = new RegExp('\\.(' + config.compile.join('|') + ')$');

// Prevent access to raw source files and compiled files
if (! config.assetSourceAccess) {
  app.on('static_file_request', function(req, res, path) {
    if (extRegex.test(path) || ignores.indexOf(path) >= 0) {
      req.stopRoute();
      app.notFound(res);
    }
  });
}

// Get ignores
var target, arr;

for (target in config.minify) {
  arr = config.minify[target];
  if (!Array.isArray(arr)) arr = [arr];
  for (var ext,file,i=0; i < arr.length; i++) {
    file = arr[i];
    ext = getExt(file);
    ignores.push(app.fullPath('public/' + file));
    if (extRegex.test(file)) {
      ignores.push(app.fullPath('public/' + file.replace(extRegex, '.' + config.compileExts[ext])));
    }
  }
}

// console.exit(ignores);

var sassPartial = /\/?_[^\/]+\.scss$/i;

// Scan for files to compile
fileModule.walkSync(app.fullPath(app.paths.public), function(dirPath, dirs, files) {
  for (var matches, path, ext, file, i=0; i < files.length; i++) {
    file = files[i].trim();
    path = dirPath.trim() + '/' + file;
    if (ignores.indexOf(path) >= 0) {
      continue;
    } else if (sassPartial.test(path)) {
      ignores.push(path);
      continue;
    }
    matches = path.match(extRegex);
    if (matches) {
      ext = matches[1];
      if (! assets[ext]) assets[ext] = [];
      assets[ext].push(path);
    }
  }
});

// Exclude assets ignored in config
// ignore: ['bootstrap/deny.(less|styl)', 'blueprint/(deny|forbid).less']

var filtered = {};

for (var key in assets) { 
  var relPaths = assets[key].map(function(f) { return app.relPath(f, 'public'); });
  filtered[key] = protos.util.excludeWithPattern(relPaths, config.ignore);
  if (filtered[key].length === 0) delete filtered[key];
  else filtered[key] = filtered[key].map(function(f) { return app.fullPath('public/' + f); });
}

assets = filtered;

// Cleanup ignores, only leave compiled sources that are not 
// allowed, since they're being minified. Asset sources are
// normally blocked. This improves performance on array index lookup.
ignores = ignores.filter(function(item) {
  return !extRegex.test(item);
});

var watch = (config.watchOn.indexOf(protos.environment) >= 0);
var assetExts = Object.keys(assets);
    
if (watch) {
  
  // Watch for changes and compile
  
  app.debug('Asset Manager: Watching files in ' + app.paths.public);
  
  var watcher = chokidar.watch(app.paths.public, {interval: config.watchInterval});
  
  watcher.on('add', watchCompile);
  watcher.on('change', watchCompile);
  
  watcher.on('unlink', function(file) {
    var matches, path = pathModule.dirname(file);
    if (ignores.indexOf(path) === -1 && (matches = file.match(extRegex))) {
      app.log(util.format("Asset Manager: Stopped watching '%s' (unlinked)", app.relPath(file)));
    }
  });
  
  watcher.on('error', function(err) {
    app.log(util.format("Asset Manager: ", err.stack));
  });
  
} else {

  // Loop over each file and compile
  compileAll();

}

function watchCompile(file) {
  
  var matches, path = pathModule.dirname(file);
  if (ignores.indexOf(path) === -1 && (matches = file.match(extRegex))) {
    // Only compile if path is not being ignored
    var ext = matches[1];
    var compiler = config.compilers[ext];
    compileSrc(file, compiler, ext);
  }
}

function compileAll() {
  for (var compiler, files, ext, i=0; i < assetExts.length; i++) {
    ext = assetExts[i];
    compiler = config.compilers[ext];
    files = assets[ext];
    for (var src, file, outSrc, outFile, j=0; j < files.length; j++) {
      compileSrc(files[j], compiler, ext);
    }
  }
}

function compileSrc(file, compiler, ext) {
  var src, outFile, relPath;
  src = fs.readFileSync(file, 'utf8');
  compiler(src, file, function(err, code) {
    if (err) {
      if (err.constructor.name) {
        err = new Error(util.inspect(err));
        err.stack = '';
      }
      app.log(err);
    }
    outFile = file.replace(extRegex, '.' + config.compileExts[ext]);
    relPath = app.relPath(outFile);
    fs.writeFileSync(outFile, code, 'utf8');
    app.debug('Asset Manager: Compiled %s (%s)', relPath, ext);
    if (app.environment != 'production') {
      app.emit('compile', relPath, err, code);
    }
  });
}

function getExt(file) {
  return file.slice(file.lastIndexOf('.')+1).trim().toLowerCase();
}