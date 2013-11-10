
var app = require('../fixtures/bootstrap');

var engine = 'swig';

app.addFilter(engine + '_template', function(data) {
  // if (data.indexOf('[skip]') === -1) {
    data = app.addEnginePartials(engine, data, '{{ main_%s(locals) }}');
    // data = app.addEnginePartials(engine, data, '<?- main_%s(locals) ?>');
  // }
  return data;
});

app.createEngineBatch('Swig', engine, '/swig.swig', module);

