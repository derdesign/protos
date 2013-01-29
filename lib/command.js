
/* lib/command.js */

var fs = require('fs'),
    util = require('util'),
    slice = Array.prototype.slice;

require('./extensions.js');

/**
  Command Line class
  
  @private
  @constructor
  @class CommandLine
  @param {object} commands Commands object to pass
 */

function CommandLine(commands) {
  this.keys = Object.keys(commands);
  this.commands = commands;
  this.args = process.argv.slice(2);
  this.context = this.args[0] || null;
  this.help = {
    before: '',
    after: ''
  }
}

/**
  Parses the command line arguments
  
  @private
 */

CommandLine.prototype.parse = function() {
  var count = this.args.length,
      command = this.commands[this.context];
  
  if (count < 2 && command && command.args > 0 && !command.noargs) {
    // Print help
    this.printHelp();
  } else if (this.context in this.commands) {

    var args = this.generateArgsObject(command);
    
    if (command.validate instanceof Function) command.validate.call(this, args);
    
    if (command.run instanceof Function) {
      command.run.call(this, args);
    } else {
      console.exit('No run method specified for ' + this.context);
    }
    
  } else {
    // Print help
    this.printHelp();
  }
}

/**
  Prints the help message in the console
  
  @private
 */

CommandLine.prototype.printHelp = function() {
  console.log(this.help.before);
  
  Object.keys(this.commands).forEach(function(action) {
    var data = this.commands[action].help || null;
    if (data) {
      var key, str;
      for (key in data) {
        str = padString('  --'+key, 18) + data[key] + ' (' + action + ')';
        console.log(str);
      }
    }
    
  }, this);
  
  console.log(this.help.after);
}

/**
  Generates the arguments object
  
  @private
  @param {object} data
 */

CommandLine.prototype.generateArgsObject = function(data) {
  var out = {args: []},
      args = this.args.slice(1),
      expect = data.args,
      single = data.single || [],
      multiple = data.multiple || [],
      switches = data.switches || [];

  var command = this.commands[this.context];
  
  var noDuplicate = function(opt) {
    opt = '--'+ opt;
    if (args.countItem(opt) > 1) console.exit("Option can only be specified once: " + opt);
  }
  
  var skip = [];
  
  // Single options
  single.forEach(function(opt) { noDuplicate(opt);
    
    var idx = args.indexOf('--'+opt);

    if (idx >= 0) {
      var val = args[idx+1],
          next = args[idx+2];
      if (!val || val.slice(0,2) == '--') {
        console.exit(util.format("The --%s option requires one argument, none given.", opt));
      } else if (next && next.slice(0, 2) != '--') {
        console.exit(util.format("The --%s option requires one argument, multiple given", opt));
      } else {
        skip.push(idx);
        skip.push(idx+1);
        out[opt] = val;
      }
    } else {
      out[opt] = null;
    }
    
    // console.exit(out);

  }, this);
  
  // Multiple options
  multiple.forEach(function(opt) { noDuplicate(opt);
    var last, idx = args.indexOf('--'+opt);
    skip.push(idx);
    if (idx >= 0) {
      idx++;
      for (var item,i=idx; i < args.length; i++) {
        item = args[i];
        skip.push(i);
        if (item.slice(0,2) == '--') {
          skip.pop();
          last = i; break;
        }
      }
      
      if (last === idx) {
        out[opt] = [];
      } else {
        out[opt] = args.slice(idx, last);
      }
      
    } else {
      out[opt] = [];
    }
  });
  
  // Switches
  switches.forEach(function(opt) { noDuplicate(opt);
    var idx = args.indexOf('--'+opt);
    if (idx >= 0) {
      skip.push(idx);
      out[opt] = true;
    } else {
      out[opt] = false;
    }
  });

  // Get Arguments
  for (var i=0; i < args.length; i++) {
    if (skip.indexOf(i) >= 0) continue;
    else if (args[i].slice(0,2) == '--') {
      console.exit("Unknown option: " + args[i]);
    } else {
      out.args.push(args[i]);
    }
  }

  // Remove duplicates
  var key,val;
  for (key in out) {
    val = out[key];
    if (val instanceof Array) {
      var unique = [];
      val.forEach(function(i) {
        if (unique.indexOf(i) === -1) unique.push(i);
      });
      out[key] = unique;
    }
  }
  
  // Check for too many args
  if (out.args.length === 0) {
    if (data.args > 0 && !command.noargs) {
      console.exit("Not enough arguments provided.");
    }
  } else if (out.args.length > data.args) {
    console.exit("Too many arguments provided.");
  }
  
  return out;
}

/**
  Pads a string a certain amount of characters
 */

function padString(str, len) {
  return str.split().concat(new Array(len-str.length)).join(' ');
}

/**
  Counts the number of matches an item has in an array
 */

Array.prototype.countItem = function(item) {
  var x,count = 0, len = this.length;
  for (var i=0; i < len; i++) {
    if (this[i] === item) count++;
  }
  return count;
}

module.exports = CommandLine;
