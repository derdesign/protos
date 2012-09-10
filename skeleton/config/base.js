
/* Main Configuration */

module.exports = {
  
  title: 'My Application',
  language: 'en-US',
  encoding: 'utf-8',
  rawViews: false,
  
  headers: {
    'Content-Type': function(req, res) { return "text/html; charset=" + this.config.encoding; },
    'Status': function(req, res) {  return res.statusCode + " " + this.httpStatusCodes[res.statusCode]; },
    'X-Powered-By': 'protos'
  },
  
  cli: {
    viewExt: 'html',
    partialExt: 'html'
  },
  
  server: {
    strictRouting: true,
  },
  
  cacheControl: {
    maxAge: 10 * 365 * 24 * 60 * 60,
    static: 'public',
    dynamic: 'private, must-revalidate, max-age=0',
    error: 'no-cache',
    json: 'private'
  },
  
  json: {
    pretty: true,
    replacer: null,
    contentType: 'application/json;charset=utf-8',
    connection: 'close'
  },
  
  engines: {
    ejs: {open: '<?', close: '?>'}
  },
  
  viewExtensions: {
    html: 'ejs'
  }

}