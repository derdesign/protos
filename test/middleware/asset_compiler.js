
var app = require('../fixtures/bootstrap'),
    fs = require('fs'),
    vows = require('vows'),
    assert = require('assert'),
    util = require('util'),
    Multi = require('multi'),
    EventEmitter = require('events').EventEmitter;
    
var multi = new Multi(app);

var compiledLess, compiledStylus, compiledCoffee;

vows.describe('Asset Compiler (middleware)').addBatch({
  
  '': {
    
    topic: function() {
      
      var promise = new EventEmitter();
      
      // Add filter test
      app.addFilter('asset_compiler_minify_source', function(source, ext, f) {
        switch (ext) {
          case 'css':
          case 'less':
            source = util.format('\n#metadata { content: "%s"; background: url("%s"); }\n', ext, f) + source;
            break;
          case 'js':
            source = util.format('var metadata = ["%s", "%s"];\n', ext, f) + source;
            break;
          case 'coffee':
            source = util.format('metadata = ["%s", "%s"];\n', ext, f) + source;
            break;
        }
        return source;
      });
      
      // Load dependencies
      if (!app.supports.static_server) app.use('static_server');
      
      if (!app.supports.asset_compiler) {
        
        app.use('asset_compiler', {
          watchOn: [],
          minify: {
            'min.css': ['target.css', 'assets/target.less'],
            'min.js': ['target.js', 'assets/target.coffee']
          },
          ignore: ['ignore.styl']
        });
        
      }

      // Get pre-compiled files for comparison
      compiledLess = fs.readFileSync(app.fullPath('../compiled-assets/less.txt'), 'utf8');
      compiledStylus = fs.readFileSync(app.fullPath('../compiled-assets/stylus.txt'), 'utf8');
      compiledCoffee = fs.readFileSync(app.fullPath('../compiled-assets/coffee.txt'), 'utf8');
     
      // Forbids access to asset sources
      multi.curl('-i /assets/less.less');
      multi.curl('-i /assets/stylus.styl');
      multi.curl('-i /assets/coffee.coffee');
      
      // Successfully compiles LESS assets
      multi.curl('/assets/less.css');
      
      // Successfully compiles Stylus assets
      multi.curl('/assets/stylus.css');
      
      // Successfully compiles CoffeeScript assets
      multi.curl('/assets/coffee.js');
      
      // Properly minifies supported assets
      multi.curl('/min.css');
      multi.curl('/min.js');
      
      // Blocks access to minify sources
      multi.curl('-i /target.css');
      multi.curl('-i /target.js');
      
      multi.exec(function(err, results) {
        
        promise.emit('success', err || results);
        
      });
      
      return promise;
    },
    
    "Forbids access to asset sources": function(results) {
      var r1 = results[0],
          r2 = results[1],
          r3 = results[2];
      assert.isTrue(r1.indexOf('HTTP/1.1 404 Not Found') >= 0);
      assert.isTrue(r2.indexOf('HTTP/1.1 404 Not Found') >= 0);
      assert.isTrue(r3.indexOf('HTTP/1.1 404 Not Found') >= 0);
    },
    
    "Successfully compiles LESS assets": function(results) {
      var r = results[3];
      assert.equal(r, compiledLess);
    },
    
    "Successfully compiles Stylus assets": function(results) {
      var r = results[4];
      assert.equal(r, compiledStylus);
    },
    
    "Successfully compiles CoffeeScript assets": function(results) {
      var r = results[5];
      assert.equal(r, compiledCoffee);
    },
    
    "Successfully minifies supported assets": function(results) {
      var r1 = results[6],
          r2 = results[7];
          
      // console.exit(r1);
          
      var expected1 = '#metadata{content:"css";background:url(target.css)}#features #toc-sidebar{display:none!important}\
#toc-sidebar{overflow-y:scroll;box-shadow:5px 0 40px rgba(255,255,255,.8);position:fixed;top:0;left:0;height:100%;background:\
#f2f2f2 repeat}#toc-sidebar>:first-child{margin:50px 0 100px 20px;padding:0}#toc-sidebar ul{width:250px}#toc-sidebar ul \
li{list-style:none}#toc-sidebar ul li a{font-size:12px;color:#222}#toc-sidebar ul li.section{margin-top:.5em}#toc-sidebar ul \
li.section a{font-weight:700}#toc-sidebar ul li.sub{margin-left:0}#metadata{content:"less";background:url(assets/assets/target\
.less)}#yelow #short{color:#fea}#yelow #long{color:#fea}#yelow #rgba{color:rgba(255,238,170,.1)}#yelow #argb{color:#1affeeaa}\
.body{background1:url("data:image/png:asdfasdf");background2:url(\'data:image/png:asdfasdf\');background3:url(data:image/png:\
asdfasdf);background4:url(http://hello.com/style.css);background5:url(http://hello.com/style.css);background6:url(http://hello\
.com/style.css);background7:url(dir/images/test.jpg);background8:url(dir/images/test.jpg);background9:url(dir/images/test.jpg)}';

      var expected2 = 'var metadata=["js","target.js"];!function(){var e,t,r,a,n,s,o,u,i=Array.prototype.slice;n=42,s=!0,s&&\
(n=-42),u=function(e){return e*e},t=[1,2,3,4,5],r={root:Math.sqrt,square:u,cube:function(e){return e*u(e)}},o=function(){var \
e,t;return t=arguments[0],e=2<=arguments.length?i.call(arguments,1):[],print(t,e)},"undefined"!=typeof elvis&&null!==elvis&&\
alert("I knew it!"),e=function(){var e,n,s;for(s=[],e=0,n=t.length;n>e;e++)a=t[e],s.push(r.cube(a));return s}()}.call(this),\
function(){var e,t,r,a,n;r=["coffee","assets/target.coffee"],n=["do","re","mi","fa","so"],a={Jagger:"Rock",Elvis:"Roll"},e=[1,\
0,1,0,0,1,1,1,0],t={brother:{name:"Max",age:11},sister:{name:"Ida",age:9}}}.call(this);';
      
      assert.equal(r1, expected1);
      assert.equal(r2, expected2);
    },
    
    "Blocks access to minify sources": function(results) {
      var r1 = results[8],
          r2 = results[9];
      assert.isTrue(r1.indexOf('HTTP/1.1 404 Not Found') >= 0);
      assert.isTrue(r2.indexOf('HTTP/1.1 404 Not Found') >= 0);
    },
    
    "Does not compile ignored files": function() {
      assert.isFalse(fs.existsSync(app.fullPath('public/ignore.css')));
    },
    
    "LESS @import works as expected": function() {
      var compiled1 = fs.readFileSync(app.fullPath('public/less-style.css')).toString('utf8');
      var compiled2 = fs.readFileSync(app.fullPath('public/css/subdir/less-test.css')).toString('utf8');
      assert.equal(compiled1, '/* Coming from less-layout.less */\n#layout {\n  width: 500px;\n}\n/* Coming from less-style.less */\nbody {\n  background: #f2f2f2;\n}\n');
      assert.equal(compiled2, '/* Import using <updir> */\n/* Coming from less-layout.less */\n#layout {\n  width: 500px;\n}\n');
    },
    
    "Stylus @import works as expected": function() {
      var compiled1 = fs.readFileSync(app.fullPath('public/stylus-style.css')).toString('utf8');
      var compiled2 = fs.readFileSync(app.fullPath('public/css/subdir/stylus-test.css')).toString('utf8');
      assert.equal(compiled1, '#layout {\n  width: 500px;\n}\n/* Coming from stylus-style.styl */\nbody {\n  background: #f2f2f2;\n}\n');
      assert.equal(compiled2, '/* Import using <updir> */\n#layout {\n  width: 500px;\n}\n');
    }
    
  }
  
}).export(module);