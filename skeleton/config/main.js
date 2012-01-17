
/* Main Configuration */

module.exports = {
  
  title: 'My Application',
  language: 'en-US',
  encoding: 'utf-8',
  rawViews: false,
  
  headers: {
    'Content-Type': function(req, res) { return "text/html; charset=" + this.config.encoding; },
    'Date': function() { return new Date().toUTCString(); },
    'Status': function(req, res) {  return res.statusCode + " " + this.httpStatusCodes[res.statusCode]; },
    'X-Powered-By': 'core-js/' + framework.version,
    'X-Node-Version': process.version.replace(/^v/,'')
  },
  
  server: {
    strictRouting: true,
    headRedirect: false,
    maxFieldSize: 2 * 1024 * 1024,
    maxUploadSize: 2 * 1024 * 1024,
    keepUploadExtensions: true
  },
  
  staticServer: {
    eTags: true,
    acceptRanges: true
  },
  
  cacheControl: {
    maxAge: 10 * 365 * 24 * 60 * 60,
    static: 'public',
    dynamic: 'private, must-revalidate, max-age=0',
    error: 'no-cache'
  },
  
  viewExtensions: {
    html: 'hogan',
    mustache: 'handlebars'
  }
  
}