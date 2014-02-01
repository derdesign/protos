
/* asset-util.js */

var app = protos.app;
var fs = require('fs');
var path = require('path');
var util = require('util');

var config = app.asset_compiler;

function getExt(file) {
  return file.slice(file.lastIndexOf('.')+1).trim().toLowerCase();
}

function resolveCSSPaths(source, file, target) {
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

module.exports = {
  
  getExt: getExt,
  
  getSource: function(f, target, action, callback) {
    var file = app.fullPath(app.paths.public + f);
    var ext = getExt(file);
    var source = fs.readFileSync(file, 'utf8').toString();
    if (action == 'minify') source = app.applyFilters('asset_compiler_minify_source', source, ext, f);
    if (path.extname(target).slice(1) === 'css') source = resolveCSSPaths(source, f, target);
    if (ext in config.compilers) {
      config.compilers[ext](source, file, callback);
    } else {
      callback(null, source);
    }
  }
  
}