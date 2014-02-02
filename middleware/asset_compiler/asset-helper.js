
/* Asset Helper */

var app = protos.app;
var instance = app.asset_compiler;
var config = instance.config;
var startSlash = app.regex.startsWithSlash;

var fs = require('fs');
var util = require('util');
var assetUtil = require('./asset-util.js');

var assetCache = {}, pathCache = {}, allowPath = {};

if (! config.assetSourceAccess) {

  app.on('static_file_request', function(req, res, path) {
    if ((assetUtil.EXT_REGEX.test(path) || config.ignore.indexOf(path) >= 0) && !(path in allowPath)) {
      req.stopRoute();
      app.notFound(res);
    }
  });

}

app.on('asset_compiler_reload_assets', function() {
  assetCache = {};
  pathCache = {};
  allowPath = {};
});

app.addFilter('static_file_path', function(path, relPath) {
  return pathCache[relPath] || path;
});

app.addFilter('static_file_mtime_hash', function(mtime) {
  var str = mtime.valueOf().toString().slice(0,-3);
  return app.md5(str);
});

app.mainHelper.asset = function(str, options) {
  var file = ((str && str.toString()) || options.src || '').replace(startSlash, '');
  return assetCache[file] || getAssetHash(file);
}

function getAssetHash(asset) {
  var file = app.fullPath(app.paths.public + asset.replace(startSlash, ''));
  if (fs.existsSync(file)) {
    var split = asset.split('.');
    var hash =app.applyFilters('static_file_mtime_hash', fs.statSync(file).mtime);
    var out = util.format('%s-%s.%s', split[0], hash, split.slice(1).join('.'));
    pathCache[out] = app.fullPath(app.paths.public + asset);
    allowPath[pathCache[out]] = true;
    return (assetCache[asset] = util.format('/%s', out));
  } else {
    return asset;
  }
}