
/* Asset manager */

var app = protos.app,
    fs = require('fs'),
    util = require('util'),
    chokidar = require('chokidar'),
    fileModule = require('file'),
    pathModule = require('path'),
    Multi = require('multi');
    
    
//////////////////////////////////////////
// PREPARATION
//////////////////////////////////////////

var instance = app.asset_compiler;

var assetUtil = require('./asset-util.js');

instance.config.ignore = instance.config.ignore.map(function(file) {
  return app.fullPath(app.paths.public + file);
});

var truthy = function(val) {
  return val; 
}

var assets, assetExts, compileCounter = 0;

scanForFiles();

var watch = (instance.config.watchOn.indexOf(protos.environment) >= 0);

if (watch) {
  
  // Watch for changes and compile
  
  app.debug('Asset Manager: Watching files in ' + app.paths.public);
  
  var watcher = chokidar.watch(app.paths.public, {interval: instance.config.watchInterval});
  
  watcher.on('change', watchCompile);
  
  watcher.on('unlink', function(file) {
    var matches, path = pathModule.dirname(file);
    if (instance.config.ignore.indexOf(path) === -1 && (matches = file.match(assetUtil.EXT_REGEX))) {
      app.log(util.format("Asset Manager: Stopped watching '%s' (unlinked)", app.relPath(file)));
    }
  });
  
  watcher.on('error', function(err) {
    app.log(util.format("Asset Manager: ", err.stack));
  });
  
}


//////////////////////////////////////////
// EVENTS
//////////////////////////////////////////

app.on('asset_compiler_compile_all', compileAll);

app.on('asset_compiler_scan_files', scanForFiles);

app.on('asset_compiler_concat', function(concatConfig) {
  if (!concatConfig) concatConfig = instance.config.concat;
  var compiler = new Multi(assetUtil);
  var concatTargets = Object.keys(concatConfig);
  for (var target in concatConfig) {
    assetUtil.ignoreFiles(concatConfig[target]);
  }
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
            instance.writeFile(target, source);
            break;
          default:
            throw new Error("Asset Compiler: Extension not supported: " + target);
        }
        concatenation(concatConfig, concatTargets, compiler);
      }
    });
  } else {
    instance.config.concat = concatConfig; // Set new config once concatenation is done
    app.emit('asset_compiler_concat_complete'); // Runs even without targets to concat
  }
}

function watchCompile(file) {
  var matches, path = pathModule.dirname(file);
  if (instance.config.ignore.indexOf(path) === -1 && (matches = file.match(assetUtil.EXT_REGEX))) {
    // Only compile if path is not being ignored
    var ext = matches[1];
    var compiler = instance.config.compilers[ext];
    compileSrc(file, compiler, ext);
  }
}

function scanForFiles() {
  assets = {}; // Reset again when running
  fileModule.walkSync(app.fullPath(app.paths.public), function(dirPath, dirs, files) {
    for (var matches, path, ext, file, i=0; i < files.length; i++) {
      file = files[i].trim();
      path = dirPath.trim() + '/' + file;
      matches = path.match(assetUtil.EXT_REGEX);
      if (matches) {
        ext = matches[1];
        if (! assets[ext]) assets[ext] = [];
        assets[ext].push(path);
      }
    }
  });
  assetExts = Object.keys(assets); // Sets asset extensions
}


function compilationDone() {
  if (--compileCounter === 0) {
    app.emit('asset_compiler_compile_all_complete');
  }
}

function compileAll() {
  
  // NOTE: Using for loops is very messy due to the fact that
  // one has to keep track of multiple loop variables,
  // Using forEach to iterate instead.
  
  assetExts.forEach(function(ext) {
    compileCounter += assets[ext].length;
  });

  if (compileCounter > 0) {
    
    assetExts.forEach(function(ext) {
      var compiler = instance.config.compilers[ext];
      var files = assets[ext];
      for (var i=0,len=files.length; i < len; i++) {
        compileSrc(files[i], compiler, ext, compilationDone);
      }
    });
    
  } else {
    
    app.emit('asset_compiler_compile_all_complete');
    
  }
  
}

function compileSrc(file, compiler, ext, done) {
  var src, outFile, relPath;
  src = fs.readFileSync(file, 'utf8');
  compiler(src, file, function(err, code) {
    if (err) {
      if (err instanceof Error) {
        err = new Error(util.inspect(err));
        err.stack = '';
      }
      assetUtil.logErr(err);
    }
    outFile = file.replace(assetUtil.EXT_REGEX, '.' + instance.config.compileExts[ext]);
    relPath = app.relPath(outFile);
    instance.writeFile(outFile, code);
    if (done instanceof Function) done();
    app.debug('Asset Manager: Compiled %s (%s)', relPath, ext);
    if (app.environment != 'production') {
      app.emit('compile', relPath, err, code);
    }
  });
}