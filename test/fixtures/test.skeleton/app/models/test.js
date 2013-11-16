
function TestModel(app) {
  
  this.driver = 'mysql'
  
  this.func = function() {}
  this.regex = /^regex$/;
  this.custom_regex = /^custom_regex$/;
  this.overridden = /^OVERRIDDEN$/;
  
  this.validation = {
    md5: this.overridden,
    custom_regex: this.custom_regex
  }
  
  this.properties = {
    override: {type: 'string', validates: 'md5'},
    custom:   {type: 'string', validates: 'custom_regex'},
    func:     {type: 'string', validates: this.func},
    regex:    {type: 'string', validates: this.regex},
    notdef:   {type: 'string', default: null},
    invdtype: {type: 'string', validates: 99},
    appregex: {type: 'string', validates: 'password'}
  }

}

module.exports = TestModel;