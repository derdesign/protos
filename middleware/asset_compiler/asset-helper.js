
/* Asset Helper */

var app = protos.app;
var instance = app.asset_compiler;
var startSlash = app.regex.startsWithSlash;

var fs = require('fs');
var util = require('util');
var assetUtil = require('./asset-util.js');

var config = instance.config; // Cached for performance
var assetHash = config.assetHash; // Cached for performance
var EXT_REGEX = assetUtil.EXT_REGEX; // Cached for performance

var assetCache = {}, pathCache = {}, allowPath = {};

if ( !instance.config.assetSourceAccess ) {
  
  app.on('static_file_request', function(req, res, path) {
    
    if ( EXT_REGEX.test(path) || (config.ignore.indexOf(path) >= 0) && ( ! (path in allowPath) ) ) {
      req.stopRoute();
      app.notFound(res);
    }

  });

}

instance.constructor.prototype.assetHelper = function(str, options) {
  str = (str && str.toString()) || options.src || '';
  if (assetHash) {
    var file = str.replace(startSlash, '');
    return assetCache[file] || getAssetHash(file);
  } else {
    return str;
  }
}

app.registerViewHelper('asset', instance.assetHelper);

app.on('asset_compiler_reload_assets', function() {
  
  var counter = 0;
  
  var done = function() {
    // Once all operations are complete (compile + minify + concat = 3)
    if (++counter === 3) {
      assetCache = {}; pathCache = {}; allowPath = {}; // Reset lookup caches only after everything is ready
      config = instance.config; // Update config if replaced
      assetHash = instance.config.assetHash; // Update asset hash boolean
      EXT_REGEX = assetUtil.EXT_REGEX; // Update extensions regex cache
      app.emit('after_asset_compiler_reload_assets'); // Do things after reload
    }
  }
  
  // Prepare things before reload
  app.emit('before_asset_compiler_reload_assets');
  
  // NOTE: The complete events must be bound before the events that emit them are fired
  
  app.once('asset_compiler_compile_all_complete', done); // After compilation is complete, increment counter
  app.once('asset_compiler_minify_complete', done); // After minification is complete, increment counter
  app.once('asset_compiler_concat_complete', done); // After concatenation is complete, increment counter
  
  app.emit('asset_compiler_scan_files'); // Scans for files in public/ to determine what to compile
  app.emit('asset_compiler_compile_all'); // Compile all assets (not required by minify/concat)
  app.emit('asset_compiler_minify_concat'); // Runs minify/concat
  
});

app.addFilter('static_file_path', function(path, relPath) {
  return pathCache[relPath] || path;
});

app.addFilter('static_file_mtime_hash', function(mtime, file) {
  var str = mtime.toGMTString();
  return app.createHash(util.format('%s:hex', instance.config.assetHashAlgorithm), str, 'utf8');
});

function getAssetHash(asset) {
  var file = app.fullPath(app.paths.public + asset.replace(startSlash, ''));
  if (fs.existsSync(file)) {
    var split = asset.split('.');
    var hash =app.applyFilters('static_file_mtime_hash', fs.statSync(file).mtime, asset);
    var out = util.format('%s-%s.%s', split[0], hash, split.slice(1).join('.'));
    pathCache[out] = app.fullPath(app.paths.public + asset);
    allowPath[pathCache[out]] = true;
    return (assetCache[asset] = util.format('/%s', out));
  } else {
    return asset;
  }
}