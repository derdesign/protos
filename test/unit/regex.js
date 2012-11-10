
var app =require('../fixtures/bootstrap'),
    util = require('util'),
    vows = require('vows'),
    assert = require('assert'),
    regex = protos.require('lib/regex.js');

//////////// CODE GENERATION

// var src = [];
// for (var key in regex) {
//   src.push(util.format('  %s: {\n\
//     regex: %s,\n\
//     valid: [],\n\
//     invalid: []\n\
//   }', key, regex[key]));
// }
// console.exit(src.join(',\n'));

//////////// CODE GENERATION

var validation = {
  relPath: {
    regex: /^\.\//,
    valid: ['./hello/world', './hello'],
    invalid: ['hello/world', 'howdy', '.howdy', '']
  },
  absPath: {
    regex: /^\//,
    valid: ['/hello/world', '/app/views/main', '/'],
    invalid: ['hello/world', 'app/views/main', '']
  },
  isPath: {
    regex: /\//g,
    valid: ['/hello/world', '/app/views/main'],
    invalid: ['hello', '1234', '']
  },
  jsFile: {
    regex: /\.js$/i,
    valid: ['hello.js', '/some/FILE.js', 'another.JS'],
    invalid: ['hi.txt', 'howdy', 'some/file.mp3', '']
  },
  dotFile: {
    regex: /^\./,
    valid: ['.hidden', '.keep'],
    invalid: ['hidden', 'keep', '']
  },
  validRegex: {
    regex: /^\/\^[^]{0,}\$\//,
    valid: ['/^(abcde)$/', '/^[12 34]+$/gm', '/^$/'],
    invalid: ['/hello$/', '/^hello/', '/[abcde]/', '']
  },
  singleParam: {
    regex: /^\/[^\/]{0,}$/,
    valid: ['/hello', '/@!#E$#$', '/1234', '/'],
    invalid: ['hello', '/hello/world', '']
  },
  fileWithExtension: {
    regex: /\.[^\/\\ ]+$/,
    valid: ['file.ext', 'tmp.1', 'abc.$', 'view.ck.coffeekup', 'test.html.jade', 'some.file.with.extension'],
    invalid: ['file.ext/hi', 'hello', 'hello/world', 'hi.', '']
  },
  htmlFile: {
    regex: /\.htm(l)?$/i,
    valid: ['hello.html', 'test.HTm', 'hi.jade.html'],
    invalid: ['hi', 'howdy.mp3', 'test.txt', '']
  },
  hasSlash: {
    regex: /\//g,
    valid: ['/', '/hello/world', 'hi/there/world', '//////////'],
    invalid: ['hello', 'world', '1234', '.', '']
  },
  multipleSlashes: {
    regex: /[\/]{2,}/g,
    valid: ['/hello//world', '//hi/there//////some', 'some//', 'some//thing'],
    invalid: ['/hello/world', '/hi/1234!@#']
  },
  startsWithSlash: {
    regex: /^[\/]/,
    valid: ['/hello/world', '/////'],
    invalid: ['hello', '.', '']
  },
  startsWithSlashes: {
    regex: /^[\/]+/,
    valid: ['//hello', '/////////', '///asdf'],
    invalid: ['hello///////', 'hello/world', '.', '']
  },
  restrictedView: {
    regex: /^#\/?/,
    valid: ['#hello', '#/hello/world', '#1234'],
    invalid: ['hello', 'h#ello']
  },
  layoutView: {
    regex: /^@\/?/,
    valid: ['@hello', '@/hello/world', '@1234'],
    invalid: ['hello', 'h@ello']
  },
  startsWithUnderscore: {
    regex: /^_/,
    valid: ['_hello', '___hello', '______'],
    invalid: ['hello', 'h_____', ' ____', '.']
  },
  startOrEndSlash: {
    regex: /(^\/|\/$)/g,
    valid: ['/hello', 'hello/', '/hello/', '/hello/world/hi/', '////////hello////////', '//', '/ / / /'],
    invalid: ['hello///asdfasd', '', 'howdy/there', '']
  },
  startOrEndRegex: {
    regex: /(^\^|\$$)/g,
    valid: ['^hello', 'hello$', '^hello$'],
    invalid: ['hello', '//', '', 'h^ell$o']
  },
  endingSlash: {
    regex: /\/$/,
    valid: ['hello/', 'howdy///////', '/hello/'],
    invalid: ['/hello', 'hell/o', 'hello/ ', '']
  },
  regExpChars: {
    regex: /(\^|\$|\\|\.|\*|\+|\?|\(|\)|\[|\]|\{|\}|\||\/)/g,
    valid: ['^$|.*?+()[]{}'],
    invalid: ['!@#&', '', 'hello']
  },
  controllerAlias: {
    regex: /^\/([^ \/]+)\//,
    valid: ['/hello/world', '/howdy/there/99', '/hello/'],
    invalid: ['/hello', '/hello world/', '//hello//world', '']
  },
  integer: {
    regex: /^[0-9]+$/,
    valid: ['1234', '99'],
    invalid: ['1.2', 'abc', ' ', '']
  },
  float: {
    regex: /^\d+\.\d+$/,
    valid: ['1.6', '99.99', '1234.5'],
    invalid: ['1.', '.1', 'abc', 'a1.0', ' ', '.', '']
  },
  number: {
    regex: /^\d+(\.\d+)?$/,
    valid: ['1', '1234', '1.99', '111111.99', '123.456'],
    invalid: ['.1', '99.', 'abc', '.', ' ']
  },
  null: {
    regex: /^null$/i,
    valid: ['null', 'NULL', 'Null'],
    invalid: ['0null', 'null.', 'hello', '.', '']
  },
  boolean: {
    regex: /^(true|false)$/i,
    valid: ['true', 'TRUE', 'True', 'false', 'FALSE', 'False'],
    invalid: ['true1', '1', '0', 'abc', '']
  },
  binary: {
    regex: /^[01]+$/,
    valid: ['1', '0', '10', '0000', '11111', '101010101010'],
    invalid: ['000001010101010200', '20', '101a', '', '.']
  },
  binaryDigit: {
    regex: /^[01]$/,
    valid: ['0', '1'],
    invalid: ['0000', '11111', '101010101010']
  },
  digit: {
    regex: /^\d$/,
    valid: ['1', '2', '3', '5'],
    invalid: ['99', 'a', 'X', '.', '']
  },
  alpha: {
    regex: /^[a-z]+$/i,
    valid: ['alpha', 'Beta', 'GAMMA'],
    invalid: ['alpha1', '.alpha.', ' alpha ', ' ', '.']
  },
  alpha_spaces: {
    regex: /^[a-z ]+$/i,
    valid: ['alpha beta', '   Gamma EPSILON'],
    invalid: ['alpha!', 'some.', '!@#$afasdf12345', '99', '']
  },
  alpha_dashes: {
    regex: /^[a-z\-]+$/i,
    valid: ['alpha-beta', 'Gamma-EPSILON', 'some-----dashes'],
    invalid: ['1234', 'alpha1-gamma', '']
  },
  alpha_underscores: {
    regex: /^[a-z_]+$/i,
    valid: ['alpha_beta', 'Gamma_EPSILON', 'some_____dashes'],
    invalid: ['1234', 'alpha1_gamma', '']
  },
  alpha_spaces_underscores: {
    regex: /^[a-z _]+$/i,
    valid: ['alpha_beta Gamma', ' Gamma Epsilon_Beta___   '],
    invalid: ['123!asdf _', '_alpha-', '------', '']
  },
  alpha_dashes_underscores: {
    regex: /^[a-z\-_]+$/i,
    valid: ['alpha_beta-Gamma', '_Gamma_Epsilon-Beta--'],
    invalid: ['1', ' alpha_beta-Gamma', 'alpha1', '']
  },
  alpha_lower: {
    regex: /^[a-z]+$/,
    valid: ['alpha'],
    invalid: ['Alpha', '1234', '']
  },
  alpha_lower_spaces: {
    regex: /^[a-z ]+$/,
    valid: ['alpha beta', '  alpha  '],
    invalid: ['1', 'Alpha', '!@#alpha ']
  },
  alpha_lower_dashes: {
    regex: /^[a-z\-]+$/,
    valid: ['alpha-beta','--alpha--'],
    invalid: ['1', 'Alpha', '!@#alpha_']
  },
  alpha_lower_underscores: {
    regex: /^[a-z_]+$/,
    valid: ['alpha', 'alpha_beta', '__alpha__'],
    invalid: ['Alpha', 'alpha--', '1234', '']
  },
  alpha_lower_spaces_underscores: {
    regex: /^[a-z _]+$/,
    valid: ['alpha', 'alpha _beta_', '__gamma_'],
    invalid: ['Alpha', '1234', '---', '.', '']
  },
  alpha_lower_dashes_underscores: {
    regex: /^[a-z\-_]+$/,
    valid: ['alpha-lower_dashes', '--__alpha--__'],
    invalid: ['1234', 'alpha!@', 'Alpha', '']
  },
  alpha_upper: {
    regex: /^[A-Z]+$/,
    valid: ['ALPHA'],
    invalid: ['1', 'Alpha', 'alpha']
  },
  alpha_upper_spaces: {
    regex: /^[A-Z ]+$/,
    valid: ['ALPHA UPPER SPACES'],
    invalid: ['1', 'alpha upper spaces', '!', '.', '']
  },
  alpha_upper_dashes: {
    regex: /^[A-Z\-]+$/,
    valid: ['ALPHA-UPPER-DASHES'],
    invalid: ['1', 'Alpha', 'alpha', ' ', '.', '']
  },
  alpha_upper_underscores: {
    regex: /^[A-Z_]+$/,
    valid: ['ALPHA_UPPER_UNDERSCORES'],
    invalid: ['1', 'Alpha', 'alpha', ' ', '-', '']
  },
  alpha_upper_spaces_underscores: {
    regex: /^[A-Z _]+$/,
    valid: ['ALPHA UPPER SPACES_UNDERSCORES'],
    invalid: ['1', 'Alpha', 'alpha', '----', '']
  },
  alpha_upper_dashes_underscores: {
    regex: /^[A-Z\-_]+$/,
    valid: ['ALPHA-UPPER_DASHES_UNDERSCORES'],
    invalid: ['1', 'Alpha', 'alpha', ' ', '.', '']
  },
  alnum: {
    regex: /^[a-z0-9]+$/i,
    valid: ['abc123DEF'],
    invalid: ['!@@#$%', '_', '-', ' ', '']
  },
  alnum_spaces: {
    regex: /^[a-z0-9 ]+$/i,
    valid: ['abc 123 DEF'],
    invalid: ['!@@#$%', '_', '-', '']
  },
  alnum_dashes: {
    regex: /^[a-z0-9\-]+$/i,
    valid: ['abc-123-DEF'],
    invalid: ['!@@#$%', '_', ' ', '']
  },
  alnum_underscores: {
    regex: /^[a-z0-9_]+$/i,
    valid: ['abc_123_DEF'],
    invalid: ['!@@#$%', '-', ' ', '']
  },
  alnum_spaces_underscores: {
    regex: /^[a-z0-9 _]+$/i,
    valid: ['abc 123_DEF'],
    invalid: ['!@@#$%', '-', '']
  },
  alnum_dashes_underscores: {
    regex: /^[a-z0-9\-_]+$/i,
    valid: ['abc-123_DEF'],
    invalid: ['!@@#$%', ' ', '']
  },
  alnum_lower: {
    regex: /^[a-z0-9]+$/,
    valid: ['abc123'],
    invalid: ['!@#$', 'ABC', ' ', '_', '-', '']
  },
  alnum_lower_spaces: {
    regex: /^[a-z0-9 ]+$/,
    valid: ['abc 124'],
    invalid: ['!@#$', 'ABC', '_', '-', '']
  },
  alnum_lower_dashes: {
    regex: /^[a-z0-9\-]+$/,
    valid: ['abc-123'],
    invalid: ['!@#$', 'ABC', '_', ' ', '']
  },
  alnum_lower_underscores: {
    regex: /^[a-z0-9_]+$/,
    valid: ['abc_123'],
    invalid: ['!@#$', 'ABC', '-', ' ', '']
  },
  alnum_lower_spaces_underscores: {
    regex: /^[a-z0-9 _]+$/,
    valid: ['abc 123_def'],
    invalid: ['!@#$', 'ABC', '-', '']
  },
  alnum_lower_dashes_underscores: {
    regex: /^[a-z0-9\-_]+$/,
    valid: ['abc-123_def'],
    invalid: ['!@#$', 'ABC', ' ', '']
  },
  alnum_upper: {
    regex: /^[A-Z0-9]+$/,
    valid: ['ABC'],
    invalid: ['!@#$', 'abc', ' ', '_', '-', '']
  },
  alnum_upper_spaces: {
    regex: /^[A-Z0-9 ]+$/,
    valid: ['ABC 123'],
    invalid: ['!@#$', 'abc', '_', '-', '']
  },
  alnum_upper_dashes: {
    regex: /^[A-Z0-9\-]+$/,
    valid: ['ABC-123'],
    invalid: ['!@#$', 'abc', ' ', '_', '']
  },
  alnum_upper_underscores: {
    regex: /^[A-Z0-9_]+$/,
    valid: ['ABC_123'],
    invalid: ['!@#$', 'abc', ' ', '-', '']
  },
  alnum_upper_spaces_underscores: {
    regex: /^[A-Z0-9 _]+$/,
    valid: ['ABC 123_DEF'],
    invalid: ['!@#$', 'abc', '-', '']
  },
  alnum_upper_dashes_underscores: {
    regex: /^[A-Z0-9\-_]+$/,
    valid: ['ABC-123_DEF'],
    invalid: ['!@#$', 'abc', ' ', '']
  },
  white_space: {
    regex: /^\s+$/g,
    valid: ['      ', '\t\t\t', '\n\n\n'],
    invalid: ['adsfasdf', '1234', '!', '.', '_']
  },
  variable: {
    regex: /^[a-z_$][a-z0-9_$]*$/i,
    valid: ['varName', 'abc1234', 'ABC', 'abc_1234', '__var__', '$jquery', '$'],
    invalid: ['1abc', '1.a', ' varname ', '!hello!@#4?']
  },
  checkbox: {
    regex: /^(|on)$/i,
    valid: ['on', 'ON', 'On', ''],
    invalid: ['!@@$$', '_on_', '!on', '.']
  },
  anything: {
    regex: /(.+|)/,
    valid: ['', '@#$ASDFASFAS ÁÉÍÓÚáéíóúñ asfasd f23R@$#@##@$ASFasdf ___!!@#----  '],
    invalid: []
  },
  something: {
    regex: /.+/,
    valid: ['@#$ASDFASFAS ÁÉÍÓÚáéíóúñ asfasd f23R@$#@##@$ASFasdf ___!!@#----  '],
    invalid: ['']
  },
  md5: {
    regex: /^[a-f0-9]{32}$/i,
    valid: ['5d41402abc4b2a76b9719d911017c592', '0782efd61b7a6b02e602cc6a11673ec9'],
    invalid: ['5d41402abc4b2a76b9719d911017c592!', '5d41402abc4b2a76b9719d911017', '']
  },
  uuid: {
    regex: /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i,
    valid: ['5722bfc0-1012-11e2-8cca-172833b2baba', '56bf2cee-1012-11e2-8e5e-5f1d90a400fb'],
    invalid: ['340,282,366,920,938,463,463,374,607,431,768,211,4561', '340,282,366,920,938,463,463,374,607,431,768,211,45', '']
  },
  url: {
    regex: /^(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?$/i,
    valid: ['http://google.com', 'ftp://nine.com:8080', 'https://hello.com?search=24&some=%20&there=%4', 'http://some.test.domain.com/cool.html'],
    invalid: ['http:/google.com', 'google.com', 'some:8080', '']
  },
  email: {
    regex: /^[_a-z0-9\-"'\/]+(\.[_a-z0-9\-"'\/]+)*@[a-z0-9\-]+(\.[a-z0-9\-]+)*\.(([0-9]{1,3})|([a-z]{2,3})|(aero|coop|info|museum|name|local))$/i,
    valid: ['email@some.com', '1@2.com', 'some@imac.local', 'email@doman.example.eu'],
    invalid: ['some@','@some', 'some@', 'some@domain']
  },
  password: {
    regex: /^[^]{6,30}$/,
    valid: ['abc1234', '!@#@#!@#!@#!@#!!!!!!!!', new Array(30+1).join('*')],
    invalid: [new Array(31+1).join('*'), 'abc12', '']
  }
}

vows.describe('lib/regex.js').addBatch({

  'Passed validity tests': function() {
    
    var debug = false;
    
    for (var key in regex) {

      var data = validation[key];
      
      if (data) {

        var re = data.regex;
        
        // Ensure we're testing against the same regex
        if (debug) console.log(key);
        
        // This test will break if the regex is changed
        assert.equal(re.toString(), app.regex[key].toString());
        
        if (debug) console.log('TRUE');
        for (var val,i=0,len=data.valid.length; i < len; i++) {
          val = data.valid[i];
          if (debug) console.log(data.regex, val, data.regex.test(val));
          assert.isTrue(data.regex.test(val));
        }

        if (debug) console.log('FALSE');
        for (val,i=0,len=data.invalid.length; i < len; i++) {
          val = data.invalid[i];
          if (debug) console.log(data.regex, val, data.regex.test(val));
          assert.isFalse(data.regex.test(val));
        }
        
      } else {

        throw new Error(util.format("RegExp Not validated: %s", key));

      }
    }
  }
  
}).export(module);
