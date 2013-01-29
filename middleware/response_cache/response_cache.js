
/**
  Response Cache
  
  Caches views into a specific storage backend.
  
  » Configuration Options:
  
    {string|object} storage: Resource string pointing to the storage backend to use, or Storage instance.
    
  » Examples:
  
    app.use('response_cache', {
      storage: 'redis'
    });
    
    In this example, the 'redis' resource string points to the storage configuration
    specified in `config/storage.js`.
    
  » Usage example:
  
    res.useCache('faq_cache');
    res.render('faq');
  
 */


var app = protos.app;

require('./response.js');

function ResponseCache(config, middleware) { var sto;
  
  if (!config.storage) {
    throw new Error('A storage is required.');
  } else if (typeof config.storage == 'string') {
    sto = app.getResource('storages/' + config.storage);
  } else {
    sto = config.storage;
  }
  
  app.resources[middleware] = {
    storage: sto
  };

  // Used to check response caches
  app[middleware] = {};
  
}

module.exports = ResponseCache;
