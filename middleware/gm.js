
/**
  Graphics Magick
  
  http://aheckmann.github.com/gm/
  http://www.graphicsmagick.org/
  
  Provides an interface with the GraphicsMagick Library
  
 */

var app = protos.app;
var gm = protos.requireDependency('gm', "GraphicsMagick Middleware");

function GraphicsMagick(config, middleware) {
  
  app[middleware] = gm;
  
}

module.exports = GraphicsMagick;
