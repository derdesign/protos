
/* Production */

function Production(app) {

  // Enable view caching
  app.viewCaching = true;
  
  // Remove port number from baseUrl
  app.use('production_url');

}

module.exports = Production;