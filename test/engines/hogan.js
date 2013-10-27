
var app = require('../fixtures/bootstrap');

var engine = 'hogan';

app.addFilter(engine + '_template', function(data) {
  data = app.addEnginePartials(engine, data, '{{> main_%s}}\n');
  // console.exit(data);
  return data;
});

app.createEngineBatch('Hogan', engine, '/hogan.mustache', module);