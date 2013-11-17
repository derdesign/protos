
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    util = require('util'),
    assert = require('assert'),
    Multi = protos.require('multi'),
    EventEmitter = require('events').EventEmitter;
    
var contextFilter, multi = new Multi(app);

app.onInitialize(function() {
  contextFilter = app.__filters.context[0];
  if (typeof contextFilter !== 'function') {
    throw new Error("Invalid context filter");
  }
});

vows.describe('View Shortcodes').addBatch({
  
  'Integrity Tests': {
    
    'Shortcode global context is preserved': function(topic) {
      assert.deepEqual(app.shortcode._shortcodes, {});
    },
    
    'Shortcode handlers are properly set': function() {
      
      var handlers = Object.keys(app.__shortcodeContext).sort();
      
      assert.deepEqual(handlers, [
      'footer',
      'header',
      'mailer_template',
      'shortcode_test',
      'widget',
      'mydir_mywidget',
      'main_ejs',
      'main_handlebars',
      'main_hogan',
      'main_jade',
      'main_swig',
      'handlebars_test',
      'hbtest',
      '#hbtest',
      '#wrap',
      '#sanitize',
      '#escape',
      '#uppercase',
      '#sanitize_escape',
      '#link'].sort());
      
      handlers.forEach(function(handler) {
        assert.isFunction(app.__shortcodeContext[handler]);
      });
      
    },
    
    "The 'view_shortcodes_loaded' event is emitted": function() {
      assert.strictEqual(app.__viewShortcodesEventParam, app.__shortcodeContext);
    }
    
  },
  
  'Rendering Partials': {
    
    topic: function() {

      // NOTE: Need to manually set the context filter in order for the shortcode output
      // not to be altered by other filters that may be applied to the global context filter.

      var promise = new EventEmitter();
      var filterBackup = app.__filters;
      
      app.__filters = {
        context: [contextFilter]
      };
      
      multi.curl('/shortcodes');
      
      multi.exec(function(err, results) {
        app.__filters = filterBackup;
        promise.emit('success', err || results);
      });
      
      return promise;
      
    },
    
    'Parsed buffer provides expected output': function(results) {
      
      var expected = '<!-- [start] -->\n\
<h2 id="page-title">My Application</h2>\n\
<P>YOUR NAME IS ERNIE, AND YOU ARE AWESOME!!!</P>\n\
<!-- [/end] -->\n\
\n\
<!-- [start] -->\n\
<h2 id="page-title">My Application</h2>\n\
<p>Your name is Sir John Doe</p>\n\
<h2>Something about you:</h2>\n\
<div class="content">\n\
... This is some content ...\n\
</div><!-- .content -->\n\
<!-- [/end] -->\n\
\n\
&lt;strong&gt;Hello World! &#91;Brackets&#93; and &#123;Braces&#125; are escaped!!!.&lt;/strong&gt;\n\
\n\
&LT;DIV CLASS&#61;&#34;VALID&#34; ID&#61;&#34;BLAH&#34;&GT;\n\
  &LT;P&GT;HELLO WORLD!&LT;/P&GT;\n\
  \n\
&LT;/DIV&GT;';

      assert.equal(results[0], expected);
      
    } 
    
  }
  
}).export(module);