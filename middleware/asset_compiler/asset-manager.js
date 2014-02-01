
/* Asset manager */

var _ = require('underscore');

var app = protos.app,
    fs = require('fs'),
    util = require('util'),
    chokidar = require('chokidar'),
    fileModule = require('file'),
    pathModule = require('path'),
    Multi = require('multi'),
    config = app.asset_compiler.config;
    
//////////////////////////////////////////
// PREPARATION
//////////////////////////////////////////

var assetUtil = require('./asset-util.js');

var ignores = config.ignore.map(function(file) {
  return app.fullPath(app.paths.public + file);
});

app.once('init', function() {
  ignores = _.unique(ignores); // Improve performance by removing duplicate entries
});

var truthy = function(val) {
  return val; 
}

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
    ignores.push(app.fullPath(app.paths.public + file));
    if (extRegex.test(file)) {
      ignores.push(app.fullPath(app.paths.public + file.replace(extRegex, '.' + config.compileExts[ext])));
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


//////////////////////////////////////////
// EVENTS
//////////////////////////////////////////


// Compile all assets on demand
app.on('asset_compiler_compile_all', compileAll);

app.on('asset_compiler_concat', function(concatConfig) {
  if (!concatConfig) concatConfig = config.concat;
  var compiler = new Multi(assetUtil);
  var concatTargets = Object.keys(concatConfig);
  concatenation(concatConfig, concatTargets, compiler);
});


//////////////////////////////////////////
// FUNCTIONS
//////////////////////////////////////////


function concatenation(concatConfig, concatTargets, compiler) {
  var sources, target = concatTargets.shift();
  if (target) {
    sources = concatConfig[target];
    if (!Array.isArray(sources)) sources = [sources];
    sources.forEach(function(item) {
      var file = app.fullPath(app.paths.public + item);
      var ext = assetUtil.getExt(file);
      ignores.push(file);
      if (ext in config.compileExts) {
        var cfile = file.replace(new RegExp(util.format('\\.%s$', ext)), '.' + config.compileExts[ext]);
        ignores.push(cfile);
      }
      compiler.getSource(item, target, 'concat');
    });
    compiler.exec(function(err, compiled) {
      if (err) {
        throw err;
      } else {
        var ext = assetUtil.getExt(target);
        switch (ext) {
          case 'css':
          case 'js':
            var source = compiled.join('\n\n');
            target = app.fullPath(app.paths.public + target);
            fs.writeFileSync(target, source, 'utf8');
            break;
          default:
            throw new Error("Asset Compiler: Extension not supported: " + target);
        }
        concatenation(concatConfig, concatTargets, compiler);
      }
    });
  } else {
    app.asset_compiler.config.concat = concatConfig; // Set new config once concatenation is done
    app.emit('asset_compiler_concat_complete');
  }
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