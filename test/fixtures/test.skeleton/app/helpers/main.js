
function MainHelper(app) {

  this.helperProperty = '99';

  this.link = function(title, url) {
    return title.link(url);
  }
  
}

MainHelper.prototype.uppercase = function(text) {
  return text.toUpperCase();
}

MainHelper.prototype.hbtest = function(text, options) {
  return JSON.stringify(Array.prototype.slice.call(arguments, 0));
}

module.exports = MainHelper;