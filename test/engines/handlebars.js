
var app = require('../fixtures/bootstrap');

var engine = 'handlebars';

app.addFilter(engine + '_template', function(data) {
  if (data.indexOf('[skip]') === -1) {
    data = app.addEnginePartials(engine, data, '{{> main_%s}}');
  }
  return data;
});

app.createEngineBatch('Handlebars', engine, '/handlebars.hbs', module);