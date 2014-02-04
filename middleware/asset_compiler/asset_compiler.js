
/**
  Asset Compiler
  
  Provides the application with asset compilation features.
  
  » References:
  
    http://lesscss.org/
    http://coffeescript.org/
    http://learnboost.github.com/stylus/
    
  » Configuration options:

    {object} concat: Assets to be concatenated. {target: [sources]}
    {object} minify: Assets to be minified. {target: [sources]}
    {array} watchOn: Array containing environments in which the assets will be automatically compiled on change
    {integer} watchInterval: Watch polling interval
    {array} compile: Extensions to compile and/or watch.
    {array} ignore: Files to ignore by the static server
    {object} compileExts: Object containing the target extensions of compiled assets. Contains {ext: outExt}
    {object} compilers: Object containing the functions that compile the target extensions.
    {boolean} assetSourceAccess: If set to true, will enable access to the asset sources (disabled by default)
    {boolean} allowReloadAll: If true, assets will be regenerated when doing app.reload({all: true})
    {object} uglifyOpts: UglifyJS options
    
    If the `compile` array is found in the middleware configuration object, then the default assets (such as
    less, coffee & stylus) will be disabled and replaced with your own extensions. This allow to only watch
    for .coffee files, for example.
    
  » Adding Custom Extensions & Compilers
  
    You can define your own extensions and compilers to be used by the application. Protos provides a solid
    platform in which you can extend upon, and integrate your own asset compilers. Here's how you do it:
    
    1) Add the custom extension in the `compile` array
    2) Add the target extension of the compiled file in the `compiledExts` object
    3) Add the Compiler function, receiving [source, callback] into the `compilers` object. 
       The function should run the callback with [err, code]
    
    These are the steps required to register your own extension to compile/watch. You will now be able to 
    compile and watch the files with your custom extension.
    
    You don't need to worry about preventing access to the source of your custom extension, since the middleware
    will automatically respond with HTTP/404 on access to the resource.
    
    Also, your custom compiler automatically has watch support. If you make any changes to your source file, the
    resource will be automatically compiled.
    
  » Debug Messages
  
    The middleware prints debugging information into the console. Set `app.debugLog` to true if you want to
    inspect the logs.
    
 */

var app = protos.app;

var fs = require('fs');
var util = require('util');

function AssetCompiler(config, middleware) {
  
  var self = this;
  
  // Check for dependencies
  
  if (!app.supports.static_server) {
    throw new Error("The 'asset_compiler' middleware requires 'static_server'");
  }
  
  // Extend configuration
  this.config = protos.configExtend({
    ignore: [], // Positioned first for fast lookups
    watchOn: ['development', 'debug'],
    watchInterval: app.config.watchInterval || 100,
    compile: ['less', 'scss', 'styl', 'coffee'],
    assetSourceAccess: false,
    assetHash: false,
    allowReloadAll: false,
    assetHashAlgorithm: 'sha1',
    compilers: {},
    compileExts: {
      coffee: 'js',
      styl: 'css',
      less: 'css',
      scss: 'css'
    },
    sourceMaps: [],
    concat: {},
    minify: {},
    lessOpts: {},
    stylusOpts: {},
    sassOpts: {},
    coffeeOpts: config.coffeeOpts || null, // Use provided config, or use null for defaults
    uglifyOpts: {
      mangle: true,
      fromString: true,
      warnings: false
    },
    cleanCSSOpts: {
      keepSpecialComments: 0,
      keepBreaks: false,
      benchmark: false,
      noAdvanced: false
    }
  }, config);
  
  // Expose config into app config
  app[middleware] = this;
  
  // Getting compilers (depend on config)
  var compilers = require('./compilers.js');
  
  // Extend compilers with user provided ones
  protos.extend(compilers, this.config.compilers);
  this.config.compilers = compilers;
  
  // Setup asset helper
  require('./asset-helper.js');

  // Run Assets manager
  require('./asset-manager.js');
  
  // Run Assets minifier
  require('./asset-minifier.js');
  
  // Run Source Maps
  require('./source-maps.js');
  
  // Minify & Concat event
  app.on('asset_compiler_minify_concat', function() {
    // NOTE: Using self.config ensures a new config is used
    // in case it is reloaded during runtime.
    app.emit('asset_compiler_minify', self.config.minify);
    app.emit('asset_compiler_concat', self.config.concat);
  });

  // Run compile all
  app.emit('asset_compiler_compile_all');
  
  // Run Minify & Concat
  app.emit('asset_compiler_minify_concat');

}

AssetCompiler.prototype.writeFile = function(target, source) {
  
  var exists, canWrite = ( this.config.watchOn.indexOf(app.environment) >= 0 ) // If Watching enabled -or-
  || ( (exists=fs.existsSync(target)) === false ) // File does not exist -or-
  || ( exists && fs.readFileSync(target, 'utf8') !== source ); // File exists -and- Source changed
  
  if (canWrite) {
    
    // All the checks above are performed to make sure that the file is not written to disk
    // if its source is the same or if it exists. This is of crucial importance because otherwise the file's
    // modification times would change, which in turn would make the asset hashes change,
    // which is something we definitely don't want (if all mtimes change, all will be re-downloaded).

    // If file watching is enabled in the environment, then the file is always written.
    
    // If the file does not exist, it will be always written as well.

    fs.writeFileSync(target, source, 'utf8');
    
  }

}

module.exports = AssetCompiler;