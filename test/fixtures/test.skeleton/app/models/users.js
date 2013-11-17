
function UsersModel(app) {
  
  this.driver = 'mysql'
  
  this.validation = {
    'friends': function(data) {
      return (typeof data == 'number');
    }
  }
  
  this.properties = {
    user    : {type: 'string', required: true, validates: 'alnum_underscores'},
    pass    : {type: 'string', required: true, validates: 'password'},
    friends : {type: 'integer', validates: 'friends', default: 0},
    valid   : {type: 'boolean', default: true},
    date    : {type: 'timestamp', validates: 'timestamp', default: function() { return new Date(); }},
    object  : {type: 'object', default: {a: 1, b: 2, c: 3}},
    array   : {type: 'array', default: [1,2,3,4]}
  }

}

// Set extra methods for model objects

UsersModel.methods = {
  
  greeting: function() {
    return "Hello World!";
  },
  
  getUsername: function() {
    return this.user;
  }
  
}

protos.extend(UsersModel.prototype, {
  
  alpha: protos.noop,
  
  beta: protos.noop
  
});

module.exports = UsersModel;