
/* Response Cache » Response extensions */

var app = protos.app,
    http = require('http'),
    OutgoingMessage = http.OutgoingMessage;
    
/**
  Enables caching for the response. Will store the response buffer on the Redis CacheStore.

  Any subsequent requests will use the cached response instead of the default response.

  @param {string} cacheID
  @public
 */

OutgoingMessage.prototype.useCache = function(cacheID) {
  this.cacheID = "response_cache_" + cacheID;
}
