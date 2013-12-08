
/* Production */

function Production(app) {
  
  // Create pidfile
  app.use('pid');
  
  // Enable view caching
  app.viewCaching = true;
  
}

module.exports = Production;