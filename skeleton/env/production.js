
/* Production */

function Production(app) {

  // Enable view caching
  app.viewCaching = true;
  
  // Remove port number
  app.use('production_url');

}

module.exports = Production;