
function MainHelper(app) {

  this.helperProperty = '99';

  this.link = function(title, url) {
    return title.link(url);
  }
  
}

MainHelper.prototype.uppercase = function(text) {
  return text.toUpperCase();
}

module.exports = MainHelper;