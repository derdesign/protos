
var app = require('../fixtures/bootstrap'),
    fs = require('fs'),
    vows = require('vows'),
    assert = require('assert'),
    util = require('util'),
    Multi = require('multi'),
    EventEmitter = require('events').EventEmitter;
    
var TEST = -1;
    
var multi = new Multi(app);

var compiledLess,
    compiledScss,
    compiledStylus,
    compiledCoffee,
    assetCompilerMinifyComplete,
    assetCompilerConcatComplete;
    
var lessOpts, sassOpts, stylusOpts, coffeeOpts,
    lessCode, sassCode, stylusCode, coffeeCode;

app.addFilter('less_options', function(options, file) {
  lessOpts = [options, file];
  return options;
});

app.addFilter('compiled_less', function(source, file, options) {
  lessCode = [source, file, options];
  return source;
});

app.addFilter('sass_options', function(options, file) {
  sassOpts = [options, file];
  return options;
});

app.addFilter('compiled_sass', function(source, file, options) {
  sassCode = [source, file, options];
  return source;
});

app.addFilter('stylus_options', function(options, file) {
  stylusOpts = [options, file];
  return options;
});

app.addFilter('compiled_stylus', function(source, file, options) {
  stylusCode = [source, file, options];
  return source;
});

app.addFilter('coffee_options', function(options, file) {
  coffeeOpts = [options, file];
  return options;
});

app.addFilter('compiled_coffee', function(source, file, options) {
  coffeeCode = [source, file, options];
  return source;
});

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
      
      // Asset compiler minify complete event
      app.on('asset_compiler_minify_complete', function() {
        assetCompilerMinifyComplete = true;
      });
      
      // Asset compiler concat complete event
      app.on('asset_compiler_concat_complete', function() {
        assetCompilerConcatComplete = true;
      });
      
      // Load dependencies
      if (!app.supports.static_server) app.use('static_server');
      
      if (!app.supports.asset_compiler) {
        
        app.use('asset_compiler', {
          watchOn: [],
          concat: {
            'concat.js': ['concat/two.coffee', 'concat/one.js', 'concat/three.js', 'concat/four.coffee'],
            'resolve-concat.css': ['assets/resolve-this/resolve-this.less']
          },
          minify: {
            'resolve-this.css': ['assets/resolve-this/resolve-this.less'],
            'min.css': ['target.css', 'assets/target.less'],
            'min.js': ['target.js', 'assets/target.coffee']
          },
          ignore: ['ignore.styl']
        });
        
      }

      // Get pre-compiled files for comparison
      compiledLess = fs.readFileSync(app.fullPath('../compiled-assets/less.txt'), 'utf8');
      compiledScss = fs.readFileSync(app.fullPath('../compiled-assets/scss.txt'), 'utf8');
      compiledStylus = fs.readFileSync(app.fullPath('../compiled-assets/stylus.txt'), 'utf8');
      compiledCoffee = fs.readFileSync(app.fullPath('../compiled-assets/coffee.txt'), 'utf8');
     
      // Forbids access to asset sources
      multi.curl('-i /assets/less.less');
      multi.curl('-i /assets/scss.scss');
      multi.curl('-i /assets/_partial.scss');
      multi.curl('-i /assets/stylus.styl');
      multi.curl('-i /assets/coffee.coffee');
      
      // Successfully compiles LESS assets
      multi.curl('/assets/less.css');
      
      // Successfully compiles SCSS assets
      multi.curl('/assets/scss.css');

      // Successfully compiles Stylus assets
      multi.curl('/assets/stylus.css');
      
      // Successfully compiles CoffeeScript assets
      multi.curl('/assets/coffee.js');
      
      // Properly minifies supported assets
      multi.curl('/min.css');
      multi.curl('/min.js');
      
      // Blocks access to minify sources
      multi.curl('-i /target.css');
      multi.curl('-i /assets/target.css');
      multi.curl('-i /target.js');
      
      // Properly concatenates assets
      multi.curl('/concat.js');
      multi.curl('/resolve-concat.css');
      
      // Blocks access to concatenated sources
      multi.curl('-i /concat/one.js');
      multi.curl('-i /concat/two.js');
      multi.curl('-i /concat/two.coffee');
      multi.curl('-i /concat/three.js');
      multi.curl('-i /concat/four.js');
      multi.curl('-i /concat/four.coffee');
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    "Forbids access to asset sources": function(results) {
      var r1 = results[++TEST],
          r2 = results[++TEST],
          r3 = results[++TEST],
          r4 = results[++TEST],
          r5 = results[++TEST];
      assert.isTrue(r1.indexOf('HTTP/1.1 404 Not Found') >= 0);
      assert.isTrue(r2.indexOf('HTTP/1.1 404 Not Found') >= 0);
      assert.isTrue(r3.indexOf('HTTP/1.1 404 Not Found') >= 0);
      assert.isTrue(r4.indexOf('HTTP/1.1 404 Not Found') >= 0);
      assert.isTrue(r5.indexOf('HTTP/1.1 404 Not Found') >= 0);
    },
    
    "Successfully compiles LESS assets": function(results) {
      var r = results[++TEST];
      assert.equal(r, compiledLess);
    },
    
    "Successfully compiles SCSS assets": function(results) {
      var r = results[++TEST];
      assert.equal(r, compiledScss);
    },
    
    "Successfully compiles Stylus assets": function(results) {
      var r = results[++TEST];
      assert.equal(r, compiledStylus);
    },
    
    "Successfully compiles CoffeeScript assets": function(results) {
      var r = results[++TEST];
      assert.equal(r, compiledCoffee);
    },
    
    "Successfully minifies supported assets": function(results) {
      var r1 = results[++TEST],
          r2 = results[++TEST];
          
      // console.exit(r2);
          
      var expected1 = '#features #toc-sidebar{display:none!important}#toc-sidebar{overflow-y:scroll;box-shadow:5px 0 40px \
rgba(255,255,255,.8);position:fixed;top:0;left:0;height:100%;background:#f2f2f2 repeat}#toc-sidebar>:first-child{margin:50px 0 100px 20px;\
padding:0}#toc-sidebar ul{width:250px}#toc-sidebar ul li{list-style:none}#toc-sidebar ul li a{font-size:12px;color:#222}\
#toc-sidebar ul li.section{margin-top:.5em}#toc-sidebar ul li.section a{font-weight:700}#toc-sidebar ul li.sub{margin-left:0}\
#metadata{content:"less";background:url(assets/assets/target.less)}#yelow #long,#yelow #short{color:#fea}#yelow \
#rgba{color:rgba(255,238,170,.1)}#yelow #argb{color:#1affeeaa}.body{background1:url("data:image/png:asdfasdf");\
background2:url(\'data:image/png:asdfasdf\');background3:url(data:image/png:asdfasdf);background4:url(http://hello.com/style.css);\
background5:url(http://hello.com/style.css);background6:url(http://hello.com/style.css);background7:url(dir/images/test.jpg);\
background8:url(dir/images/test.jpg);background9:url(dir/images/test.jpg)}';

      var expected2 = 'var metadata=["js","target.js"];(function(){var e,t,r,a,n,s,o,u,i=Array.prototype.slice;n=42,s=!0,s&&\
(n=-42),u=function(e){return e*e},t=[1,2,3,4,5],r={root:Math.sqrt,square:u,cube:function(e){return e*u(e)}},o=function()\
{var e,t;return t=arguments[0],e=2<=arguments.length?i.call(arguments,1):[],print(t,e)},"undefined"!=typeof elvis&&null!==elvis\
&&alert("I knew it!"),e=function(){var e,n,s;for(s=[],e=0,n=t.length;n>e;e++)a=t[e],s.push(r.cube(a));return s}()}).call(this),\
function(){var e,t,r,a,n;r=["coffee","assets/target.coffee"],n=["do","re","mi","fa","so"],a={Jagger:"Rock",Elvis:"Roll"},e=\
[1,0,1,0,0,1,1,1,0],t={brother:{name:"Max",age:11},sister:{name:"Ida",age:9}}}.call(this);';

      assert.equal(r1, expected1);
      assert.equal(r2, expected2);
    },
    
    "Minification properly resolves CSS relative paths": function() {
      
      var resolveThis = fs.readFileSync(app.fullPath('public/resolve-this.css'), 'utf8');
      
      // Notice how the URL is image.png, instead of ../../image.png 
      
      var expected = '#metadata{content:"less";background:url(assets/resolve-this/assets/resolve-this/resolve-this.less)}#resolve-\
this{background1:url(image.png);background2:url(image.png);background3:url(image.png);background5:url(http://path-to-image.png);\
background6:url(http://path-to-image.png);background7:url(http://path-to-image.png);background8:url(data:application/png,abcdefgh);\
background9:url(\'data:application/png,abcdefgh\');background10:url("data:application/png,abcdefgh")}';

      assert.equal(resolveThis, expected);
      
    },
    
    "Blocks access to minify sources": function(results) {
      var r1 = results[++TEST],
          r2 = results[++TEST],
          r3 = results[++TEST];
      assert.isTrue(r1.indexOf('HTTP/1.1 404 Not Found') >= 0);
      assert.isTrue(r2.indexOf('HTTP/1.1 404 Not Found') >= 0);
      assert.isTrue(r3.indexOf('HTTP/1.1 404 Not Found') >= 0);
    },
    
    "Successfully concatenates assets": function(results) {
      
      var r1 = results[++TEST];
      
      var expected = '\n/*\n  This is two.coffee\n */\n\n(function() {\n  var bitlist, kids, singers, song;\n\n  song = ["do", "re", \
"mi", "fa", "so"];\n\n  singers = {\n    Jagger: "Rock",\n    Elvis: "Roll"\n  };\n\n  bitlist = [1, 0, 1, 0, 0, 1, 1, 1, 0];\n\n  \
kids = {\n    brother: {\n      name: "Max",\n      age: 11\n    },\n    sister: {\n      name: "Ida",\n      age: 9\n    }\n  };\n\n})\
.call(this);\n\n\n/* This is one.js */\n\nvar one = true;\n\n/* This is three.js */\n\nvar three = true;\n\n\n/*\n  This is \
four.coffee\n */\n\n(function() {\n  var courses, dish, food, foods, i, _i, _j, _k, _len, _len1, _len2, _ref;\n\n  _ref = \
[\'toast\', \'cheese\', \'wine\'];\n  for (_i = 0, _len = _ref.length; _i < _len; _i++) {\n    food = _ref[_i];\n    \
eat(food);\n  }\n\n  courses = [\'greens\', \'caviar\', \'truffles\', \'roast\', \'cake\'];\n\n  for (i = _j = 0, \
_len1 = courses.length; _j < _len1; i = ++_j) {\n    dish = courses[i];\n    menu(i + 1, dish);\n  }\n\n  foods = \
[\'broccoli\', \'spinach\', \'chocolate\'];\n\n  for (_k = 0, _len2 = foods.length; _k < _len2; _k++) {\n    \
food = foods[_k];\n    if (food !== \'chocolate\') {\n      eat(food);\n    }\n  }\n\n}).call(this);\n';

      assert.equal(r1, expected);

    },
    
    "Concatenation properly resolves CSS relative paths": function(results) {
      
      var r1 = results[++TEST];
      
      var expected = '#resolve-this {\n  background1: url("image.png");\n  background2: url("image.png");\n  background3: url("image.png");\n  \
background5: url(http://path-to-image.png);\n  background6: url(\'http://path-to-image.png\');\n  background7: url("http://path-to-image.png");\n  \
background8: url(data:application/png,abcdefgh);\n  background9: url(\'data:application/png,abcdefgh\');\n  background10: url("data:application/png,\
abcdefgh");\n}\n';

      assert.equal(r1, expected);

    },
    
    "Blocks access to concatenated sources": function(results) {
      var r1 = results[++TEST],
          r2 = results[++TEST],
          r3 = results[++TEST],
          r4 = results[++TEST],
          r5 = results[++TEST],
          r6 = results[++TEST];
      assert.isTrue(r1.indexOf('HTTP/1.1 404 Not Found') >= 0);
      assert.isTrue(r2.indexOf('HTTP/1.1 404 Not Found') >= 0);
      assert.isTrue(r3.indexOf('HTTP/1.1 404 Not Found') >= 0);
      assert.isTrue(r4.indexOf('HTTP/1.1 404 Not Found') >= 0);
      assert.isTrue(r5.indexOf('HTTP/1.1 404 Not Found') >= 0);
      assert.isTrue(r6.indexOf('HTTP/1.1 404 Not Found') >= 0);
    },
    
    "Does not compile ignored files": function() {
      assert.isFalse(fs.existsSync(app.fullPath(app.paths.public + 'ignore.css')));
    },
    
    "LESS @import works as expected": function() {
      var compiled1 = fs.readFileSync(app.fullPath(app.paths.public + 'less-style.css')).toString('utf8');
      var compiled2 = fs.readFileSync(app.fullPath(app.paths.public + 'css/subdir/less-test.css')).toString('utf8');
      assert.equal(compiled1, '/* Coming from less-layout.less */\n#layout {\n  width: 500px;\n}\n/* Coming from less-style.less */\nbody {\n  background: #f2f2f2;\n}\n');
      assert.equal(compiled2, '/* Import using <updir> */\n/* Coming from less-layout.less */\n#layout {\n  width: 500px;\n}\n');
    },
    
    "Stylus @import works as expected": function() {
      var compiled1 = fs.readFileSync(app.fullPath(app.paths.public + 'stylus-style.css')).toString('utf8');
      var compiled2 = fs.readFileSync(app.fullPath(app.paths.public + 'css/subdir/stylus-test.css')).toString('utf8');
      assert.equal(compiled1, '#layout {\n  width: 500px;\n}\n/* Coming from stylus-style.styl */\nbody {\n  background: #f2f2f2;\n}\n');
      assert.equal(compiled2, '/* Import using <updir> */\n#layout {\n  width: 500px;\n}\n');
    },
    
    "Properly applies compiler option filters": function() {
      
      // Args, options, file
      
      // Less
      assert.isObject(lessOpts[0]);
      assert.isString(lessOpts[1]);
      
      // Sass
      assert.isObject(sassOpts[0]);
      assert.isString(sassOpts[1]);
      
      // Stylus
      assert.isObject(stylusOpts[0]);
      assert.isString(stylusOpts[1]);
      
      // Coffee
      assert.isNull(coffeeOpts[0]);
      assert.isString(coffeeOpts[1]);

    },
    
    "Properly applies compiled source filters": function() {
      
      // Args: source, file, options
      
      // Less
      assert.isString(lessCode[0]);
      assert.isString(lessCode[1]);
      assert.isObject(lessCode[2]);
      
      // Sass
      assert.isString(sassCode[0]);
      assert.isString(sassCode[1]);
      assert.isObject(sassCode[2]);
      
      // Stylus
      assert.isString(stylusCode[0]);
      assert.isString(stylusCode[1]);
      assert.isObject(stylusCode[2]);
      
      // Coffee
      assert.isString(coffeeCode[0]);
      assert.isString(coffeeCode[1]);
      assert.isNull(coffeeCode[2]);
      
    },
    
    "Emits asset_compiler_minify_complete": function() {
      assert.isTrue(assetCompilerMinifyComplete);
    },
    
    "Emits asset_compiler_concat_complete": function() {
      assert.isTrue(assetCompilerMinifyComplete);
    }
    
  }
  
}).export(module);