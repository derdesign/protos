
function CsrfController(app) {
  
  // Create csrf session data
  
  // Using a function stub to be able to register the extra callback on the
  // route, since app.session.load is not available at this point in time.
  var loadSession = function(req, res) {
    return app.session.load(req, res);
  }
  
}

module.exports = CsrfController;