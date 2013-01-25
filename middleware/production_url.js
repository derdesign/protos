
/**
  Production URL 

  Removes the port suffix from the application's url. 
  
  This is useful if the application is running under a proxy, 
  or if there are kernel level redirection rules (iptables).

*/

var app = protos.app;

function ProductionUrl() {
  
  // Remove port number from baseUrl
  app.baseUrl = app.baseUrl.slice(0, app.baseUrl.lastIndexOf(':'));
  
  // Remove port number from baseUrl
  app.baseUrlSecure = app.baseUrlSecure.slice(0, app.baseUrlSecure.lastIndexOf(':'));
  
}

module.exports = ProductionUrl;