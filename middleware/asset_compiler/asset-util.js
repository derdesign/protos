
/* asset-util.js */

var app = protos.app;
var fs = require('fs');
var path = require('path');
var util = require('util');
var _ = require('underscore');

var instance = app.asset_compiler;

var EXT_REGEX = getExtRegex();

app.on('after_asset_compiler_reload_assets', getExtRegex);

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

function getExtRegex() {
  return new RegExp('\\.(' + instance.config.compile.join('|') + ')$');
}

module.exports = {

  EXT_REGEX: EXT_REGEX,
  
  getExt: getExt,
  
  compiledFile: function(file) {
    if (this.EXT_REGEX.test(file)) {
      var ext = this.getExt(file);
      var base = file.replace(this.EXT_REGEX, '');
      return util.format('%s.%s', base, instance.config.compileExts[ext]);
    } else {
      return file;
    }
  },
  
  ignoreFiles: function(files) {
    for (var file,i=0,len=files.length; i < len; i++) {
      file = app.fullPath(app.paths.public + files[i]);
      if (this.EXT_REGEX.test(file)) {
        instance.config.ignore.push(this.compiledFile(file));
      } else {
        instance.config.ignore.push(file);
      }
    }
    instance.config.ignore = _.unique(instance.config.ignore);
  },
  
  getSource: function(f, target, action, callback) {
    var file = app.fullPath(app.paths.public + f);
    var ext = getExt(file);
    var source = fs.readFileSync(file, 'utf8').toString();
    if (action == 'minify') source = app.applyFilters('asset_compiler_minify_source', source, ext, f);
    if (path.extname(target).slice(1) === 'css') source = resolveCSSPaths(source, f, target);
    if (ext in instance.config.compilers) {
      instance.config.compilers[ext](source, file, callback);
    } else {
      callback(null, source);
    }
  },
  
  logErr: function(err) {
    if (err) {
      if (app.supports.logger) {
        app.errorLog(err)
      } else {
        app.log(err);
      }
    }
  }
  
}