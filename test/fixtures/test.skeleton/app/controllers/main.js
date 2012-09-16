/*jshint undef: false */

function MainController(app) {
  
  var util = require('util');
  
  get('/', function(req, res) {
    res.render('index');
  });
  
  /* View Locals */
  
  get('/view-locals', function(req, res) {
    app.globals.testval = 99;
    res.render('view-locals.html', true);
    delete app.globals.testval;
  });
  
  /* Shortcode filter */
  
  get('/shortcode-filter', function(req, res) {
    res.setContext('numbers_test');
    res.render('#shortcode-filter', true);
  });
  
  /* Request Metadata */
  
  var metadataCallback = function(req, res) {
    req.set('secret', "HELLO WORLD!");
    req.next();
  }
  
  get('/request/metadata', metadataCallback, function(req, res) {
    res.end(req.get('secret'));
  });
  
  /* File Download */
  
  get('/download', function(req, res) {
    res.download(app.fullPath('/public/robots.txt'), req.queryData.file);
  });
  
  /* JSON Response */
  
  get('/:file', {file: /^[a-z_]+\.json$/}, function(req, res, params) {
    req.queryData.file = params.file;
    res.json(req.queryData, req.queryData.jsoncallback);
  });
  
  /* View Engine Tests */
  
  get('/:engine/:ext', {engine: app.engineRegex, ext: /^[a-z]+$/}, function(req, res, params) {
    var engine = params.engine,
        ext = params.ext;
    var view = 'main/' + engine + '.' + ext;
    // console.exit(view);
    res.render(view, {prefix: 'Rendered Partial:'}, true);
  });
  
  get('/:engine/:ext1/:ext2', {engine: app.engineRegex, ext1: /^[a-z]+$/, ext2: /^[a-z]+$/}, function(req, res, params) {
    var engine = params.engine,
        ext = params.ext1 + '.' + params.ext2;
    var view = 'main/' + engine + '.' + ext;
    // console.exit(view);
    res.render(view, {prefix: 'Rendered Partial:'}, true);
  });
  
  /* Response Caching Tests */
  
  get('/:cache/:id', {cache: /^response\-(cache|nocache)$/, id: 'integer'}, function(req, res) {
    if (req.params.cache == 'response-cache') res.useCache('test_cache');
    res.render('response-cache');
  });
  
  /* Response Buffer filter test */
  
  get('/response/buffer', function(req, res) {
    res.render('#msg', {message: 'HELLO'});
  });
  
  get('/response/buffer/specific', function(req, res) {
    res.setContext('specific');
    res.render('#msg', {message: 'WORLD'});
  });
  
  get('/response/buffer/raw', function(req, res) {
    res.end('THIS SHOULD NOT BE MODIFIED');
  });
  
  /* Header Tests */
  
  get('/setheaders', function(req, res, params) {
    
    // Override Application's default headers (found in app.config.headers) on app/config/base.js
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('X-Powered-By', '{PROTOS}');
    
    res.setHeaders(req.queryData);
    res.sendHeaders();
    res.end('');
  });

  /* Cookie Tests */
  
  get('/setcookie/:name/:value', {name: 'alpha', value: 'alnum_dashes'}, function(req, res, params) {
    res.setCookie(params.name, params.value, req.queryData);
    res.sendHeaders();
    res.end('');
  });
  
  get('/removecookie/:name', {name: 'alpha'}, function(req, res, params) {
    res.removeCookie(params.name);
    res.sendHeaders();
    res.end('');
  });
  
  get('/removecookies/:names', {names: 'alpha_dashes'}, function(req, res, params) {
    res.removeCookies.apply(res, params.names.split('-'));
    res.sendHeaders();
    res.end('');
  });
  
  get('/hascookie/:name', {name: 'alpha'}, function(req, res, params) {
    var ans = res.hasCookie(params.name) ? 'YES' : 'NO';
    res.sendHeaders();
    res.end(ans);
  });
  
  get('/getcookie/:name', {name: 'alpha'}, function(req, res, params) {
    var ans = res.getCookie(params.name) || 'NULL';
    res.sendHeaders();
    res.end(ans);
  });
  
  get('/getcookie-with-cookiedomain', function(req, res, params) {
    app.cookieDomain = 'example.com';
    res.setCookie('custom', 'hello');
    res.sendHeaders();
    res.end('');
    app.cookieDomain = null;
  });
  
  /* Redirection Tests */
  
  get('/redirect/:context', {context: /^(test|home|login)$/}, function(req, res, params) {
    switch (params.context) {
      case 'test':
        res.redirect('/test', req.queryData.statusCode);
        break;
      case 'home':
        app.home(res);
        break;
      case 'login':
        app.login(res);
        break;
    }
  });
  
  /* Detect Ajax */
  
  get('/detect-ajax', function(req, res) {
    if (req.isAjax) res.setHeader('X-Ajax-Request', 'true');
    res.sendHeaders();
    res.end('');
  });
  
  /* Route Functions chaining */
  
  var cb1 = function(req, res, params) { req.counter = 24; req.next(); }
  var cb2 = function(req, res, params) { req.counter += 55; req.next(); }
  var cb3 = function(req, res, params) { req.counter -= 120; res.end("Counter: {" + req.counter + '}'); }
  
  // Route chain with 1 method
  get('/route-chain-a', cb1, cb2, cb3);
  
  // Route chain accepting multiple methods + flattens callbacks
  get('/route-chain-b', cb1, [[cb2], [cb3]], 'post', 'put');
  
  /* Request Misc */

  get('/request/query-data', function(req, res) {
    req.getQueryData(function(fields) {
      res.json(fields);
    });
  });
  
  get('/request/title', {msg: 'alpha_dashes'}, function(req, res) {
    var msg = req.queryData.msg;
    if (msg) req.setPageTitle(msg);
    res.render('page-title', true);
  });
  
  get('/request/referer-test', function(req, res) {
    res.end(req.headers.referer);
  });
  
  /* Handle any route from a controller */
  
  get('/:route/handled-by-main', {route: /^(blog|private|session)$/}, function(req, res) {
    res.json({success: 'true', url: req.url});
  });
  
}

module.exports = MainController;