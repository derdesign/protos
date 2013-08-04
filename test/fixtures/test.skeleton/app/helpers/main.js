
function MainHelper(app) {

  this.helperProperty = '99';

  this.link = function(title, url) {
    return title.link(url);
  }
  
}

module.exports = MainHelper;