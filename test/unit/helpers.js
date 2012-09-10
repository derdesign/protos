
var app =require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert');

vows.describe('lib/helper.js').addBatch({

  'Helper::wrap': function() {
    var locals = {name: 'ernie'};
    var context = {test: 99};
    var retval = app.mainHelper.wrap(locals, context);
    assert.isTrue(retval === locals);
    assert.isTrue(retval.test === 99);
  },
  
  'Helper::sanitize': function() {
    var str = 'This is a <script type="text/javascript"></script> <a href="http://google.com">Google</a>.';
    var badLink = 'Hey <a href="http://example.com">you!</a>';
    var urlPolicy = function(url) {
      if (url.indexOf('http://google.com') === 0) return url; // Only allow urls from google.com
    }
    assert.equal(app.mainHelper.sanitize(str), 'This is a  <a>Google</a>.');
    assert.equal(app.mainHelper.sanitize(str, urlPolicy), 'This is a  <a href="http://google.com">Google</a>.');
    assert.equal(app.mainHelper.sanitize(badLink, urlPolicy), 'Hey <a>you!</a>');
  },
  
  'Helper::escape': function() {
    assert.equal(app.mainHelper.escape('Hello <strong>World!</strong>'), 'Hello &lt;strong&gt;World!&lt;/strong&gt;');
  },
  
  'Helper::safe_str': function() {
    var str = '<p>Hello <script type="text/javascript">exploit();</script> World!</p>';
    assert.equal(app.mainHelper.safe_str(str), '&lt;p&gt;Hello  World!&lt;/p&gt;');
  }
  
}).export(module);
