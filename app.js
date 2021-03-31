var
  Connection = require('tedious').Connection,
  config = require('./lib/mssql.js').init(config),
  Request = require('tedious').Request,
  sql = require('mssql'),
  settings = require('./settings').sqldatamodel,
  fs = require('fs'),
  logger = require('log4js').getLogger('app'),
  express = require('express'),
  moment = require('moment'),
  bodyParser = require('body-parser'),
  cors = require('cors'),
  _ = require('underscore'),
  datamodel = require('./lib/sqldatamodel.js'),
  Q = require('q'),
  mapzipper = require('./lib/data/mapzip'),
  Graph = require('graph-data-structure')
  graph = Graph()
  ;

var app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

app.use(express.static(__dirname + '/public'));

app.get('/signin',function(req,res)
{
  res.sendFile(__dirname + '/public/login.html');
});

// sessions
app.post('/signin', function(req, res){
  config.password = req.body.password;
  res.redirect('/patients')
});

app.get('/',function(req,res)
{
  res.sendFile(__dirname + '/public/index.html');
});


app.get('/dx/:campus/:dxcode/:date/:end', function(req, res, next){
  var
    campus = req.params.campus,
    dxcode = req.params.dxcode,
    d = req.params.date.toString(),
    e = req.params.end.toString(),
    d1 = moment(d).format('MM/DD/YYYY'),
    d2 = moment(e).format('MM/DD/YYYY'),
    facility,
    mrns,
    merged_dataset = [],
    grouping
    ;

  renderDiagnosisCohort(campus,d1,d2)
    .then(function(results){
      mrns = mapzipper.extractuniqIdentifiers(results,'MedicalRecordNumber');
       return renderAmalgaVisits(convertCampus(parseInt(campus)), d1,d2);
    })
    .then(function(results){
      merged_dataset.push(mapzipper.joinOnSharedIdentifier(results,mrns,'MRN'));
      // console.log(merged_dataset);
      grouping = _.groupBy(merged_dataset, 'Room');
            merged_dataset.forEach(function(a){
              _.filter(results,function(r){
                // r.infected = "N";
                // console.log(r);
                _.find(a, function(o){
                  // o.infected = "Y";
                  if(o.unit != 'ME9' && o.Room === r.Room && o.unit === r.unit && o.datetimein <= r.datetimein && + o.datetimeout >= r.datetimein && r.MRN !== o.MRN){
                      console.log(r.MRN, o.MRN, r.Room, o.Room, r.unit, o.unit, r.datetimein/1000, o.datetimein/1000, r.datetimeout/1000);
                    // graph.addNode(r.MRN+'|'+r.unit+'|'+(parseInt(o.datetimein)-parseInt(r.datetimein))/1000);
                    // graph.addNode(o.MRN+'|'+o.unit+'|'+(parseInt(o.datetimein)-parseInt(r.datetimein))/1000);
                  return graph.addEdge(r.MRN+'|'+r.unit+'|'+(parseInt(o.datetimein)-parseInt(r.datetimein))/1000, o.MRN+'|'+o.unit+'|'+(parseInt(o.datetimein)-parseInt(r.datetimein))/1000);
                  }
                })
              })
            });
      var
        serialized = graph.serialize();
        serialized.infected = merged_dataset;
        res.send(serialized);

      // grouping.forEach(function(e){
      //   e[0].forEach(function(a,b){
      //     if(a.unit != b.unit){
      //       console.log('hello')
      //     }
      //   })
      // });
    })
    .done();
});


app.get('/visit/diagnoses', function(req, res, next){
  res.send(dx_views);
});

var
  server = app.listen(3000,function() {
    console.log("listening on port 3000")
  }),
  amalga = datamodel.init(settings.amalga),
  bis =datamodel.init(settings.bis)
  ;

function convertCampus(id){
  var campus = '';
  switch(id){
  case 80:
    campus = 'A';
    break;
  case 60:
    campus = 'P';
    break;
  case 82:
    campus = 'C';
    break;
  case 88:
    campus = 'L';
    break;
  }
  return campus;

}

function renderAmalgaVisits(campus,d1,d2){

  var deferred = Q.defer();

  datamodel.connect(amalga, function(err,connection){
    datamodel.getVisitInfoByCampus(
      connection,
      campus,
      d1,
      d2,
      function(rows) {
        if(!rows || !rows.length) {
          return [];
        } else {
          deferred.resolve(rows);
        };
      }
    )}
  );
  return deferred.promise;
}

function renderDiagnosisCohort(campus,d1,d2){

  var deferred = Q.defer();

  datamodel.connect(bis, function(err,connection){
    datamodel.getDxPatientCohort(
      connection,
      campus,
      d1,
      d2,
      function(rows) {
        if(!rows || !rows.length) {
          return [];
        } else {
          deferred.resolve(rows);
        };
      }
    )}
  );
  return deferred.promise;
}