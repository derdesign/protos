
/**
  Graphics Magick
  
  http://aheckmann.github.com/gm/
  http://www.graphicsmagick.org/
  
 */

var app = protos.app;
var gm = protos.requireDependency('gm', "GraphicsMagick Middleware");

var Multi = protos.require('multi');

function GraphicsMagick(config, middleware) {
  
  app[middleware] = this;
  
}

/**
  Processes an image and stores into a target image
  
  The 'operations' object receives the method names
  that the gm() object receives. There are special 
  considerations when it comes to how the properties
  map to the methods and how are arguments interpreted:
  
  Example:

    app.gm.process({
      in: 'rachel.jpg',
      out: 'out.jpg',
      operations: {
        resize: [200, 0],
        autoOrient: true,
        sepia: true,
        quality: 80
      }
    }, function(err) {
      console.exit(err || 'success');
    });

  The example above does exactly the same as this:
  
    gm('rachel.jpg')
      .resize(200, 0)
      .autoOrient()
      .sepia()
      .quality(80)
      .write('out.jpg', function(err) {
        console.exit(err || 'success!');
      });
  
  @param {object} ob Process Specification
 */
  

GraphicsMagick.prototype.process = function(ob, callback) {
  var inFile = ob.in;
  var outFile = ob.out;
  var operations = ob.operations || {};
  var img = gm(inFile);
  for (var cmd in operations) {
    var args = operations[cmd];
    img[cmd].apply(img, args instanceof Array ? args : (args === true) ? [] : [args]);
  }
  img.write(outFile, callback);
}

/**
  Returns a multi object
  
  Note: This is really powerful when you want to
  perform multiple image processing operations 
  on parallel or sequentially.
  
  For the Multi configuration, refer to the
  multi package at https://github.com/derdesign/multi
  
  @param {object} Multi Configuration
  @return {object} Multi Instance
 */

GraphicsMagick.prototype.multi = function(cfg) {
  return new Multi(this, cfg);
}

/**
  Alias of gm().thumb()
  
 */
 
GraphicsMagick.prototype.thumb = function(inputImg, width, height, outFile, quality, callback) {
  gm(inputImg).thumb(width, height, outFile, quality, callback);
}

module.exports = GraphicsMagick;
