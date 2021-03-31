(function() {
  'use strict';

  var
    me = module.exports,
    sql = require('mssql'),
    tedious = require('tedious'),
    Connection = require('tedious').Connection,
    Request = require('tedious').Request,
    logger = require('log4js').getLogger('sqldatamodel'),
    procs = require('../db/storedprocedures.json'),
    _ = require('underscore'),
    auth_store, sql_options
    ;


  function findOne(completion) {
    return function(find_error, rows) {
      if(find_error) {
        logger.error(find_error);
        completion(find_error);
      }
      else {
        if(rows && rows.length) {
          completion(null, rows[0][0]);
        }
        else {
          logger.warn('findOne found nothing');
          completion(null, null);
        }
      }
    };
  }

  function tableOne(sp, completion) {
    return function(error, results) {
      if(error) {
        logger.error('%s : %s', sp, error);
        completion(error);
      }
      else {
        if(results && results.length) {
          //logger.info('%s results.length: %s', sp, results[0].length);
          completion(null, results[0]);
        }
        else {
          //logger.warn('%s: no table one', sp);
          completion(null, results);
        }
      }
    };
  }


  function execsp(conn, sp, args, completion) {
    var
      request = new Request(sp, function(err, rowCount) {
        if (err) {
          console.log(err);
        } else {
          console.log(rowCount + ' rows');
        }
        conn.close();
      }),
      RS = [];

    /*jshint -W081 */
    if(args && Array.isArray(args)) {
      for(var i = 0; i < args.length; i++) {
        request.addParameter(args[i].param,args[i].type,args[i].value);
      }
    };

    logger.debug(sp + ' ' + JSON.stringify(args));
    request.on('row',function(recordsets) {
      var row = {};
      recordsets.forEach(function(record) {
        if (record.isNull) {
          row[record.metadata.colName] = null;
        } else {
          row[record.metadata.colName] = record.value;
        }
      });
      RS.push(row);
    });

    request.on('doneInProc', function(rowCount, more,rows) {
      completion(RS);
    });

    conn.callProcedure(request);

  }

  exports.getUnitsByCampus = function(conn, campus, first_param, second_param, completion) {
    var
      TYPES = require('tedious').TYPES
      ;
    execsp(conn, procs.getUnitsByCampus,
      [
        {"param": "campus", "value": campus, "type": TYPES.VarChar},
        {"param": "first_param", "value": first_param, "type": TYPES.VarChar},
        {"param": "second_param", "value": second_param, "type": TYPES.VarChar}
      ], tableOne(procs.getUnitsByCampus, completion)
    );
  };

  exports.getVisitInfoByCampus = function(conn, campus, first_date, second_date, completion) {
    var
      TYPES = require('tedious').TYPES
      ;
    execsp(conn, procs.getVisitInfoByCampus,
      [
        {"param": "campus", "value": campus, "type": TYPES.VarChar},
        {"param": "first_date", "value": first_date, "type": TYPES.VarChar},
        {"param": "second_date", "value": second_date, "type": TYPES.VarChar}
      ], tableOne(procs.getVisitInfoByCampus, completion)
    );
  };

  exports.getVolumeOfUnitsByDay = function(conn, unit, first_date, second_date, completion) {
    var
      TYPES = require('tedious').TYPES
      ;
    execsp(conn, procs.getVolumeOfUnitsByDay,
      [
        //{"param": "campus", "value": campus, "type": TYPES.VarChar},
        {"param": "unit", "value": unit, "type": TYPES.VarChar},
        {"param": "first_param", "value": first_date, "type": TYPES.VarChar},
        {"param": "second_param", "value": second_date, "type": TYPES.VarChar}
      ], tableOne(procs.getVolumeOfUnitsByDay, completion)
    );
  };

  exports.getVisitInfoFromEpsi = function(conn, campus, first_date, second_date, completion) {
    var
      TYPES = require('tedious').TYPES
      ;
    execsp(conn, procs.getVisitInfoFromEpsi,
      [
        {"param": "campus", "value": campus, "type": TYPES.Int},
        {"param": "first_param", "value": first_date, "type": TYPES.VarChar},
        {"param": "second_param", "value": second_date, "type": TYPES.VarChar}
      ], tableOne(procs.getVisitInfoFromEpsi, completion)
    );
  };

  exports.getDiagnosesByMRN = function(conn, campus, first_date, second_date, completion) {
    var
      TYPES = require('tedious').TYPES
      ;
    execsp(conn, procs.getDiagnosesByMRN,
      [
        {"param": "campus", "value": campus, "type": TYPES.Int},
        {"param": "start_date", "value": first_date, "type": TYPES.VarChar},
        {"param": "end_date", "value": second_date, "type": TYPES.VarChar}
      ], tableOne(procs.getDiagnosesByMRN, completion)
    );
  };

  exports.insertPatientsFromAmalga = function(conn, o, completion) {
    var
      TYPES = require('tedious').TYPES,
      request = new Request('INSERT [Andes].[dbo].[EPSiMatch] (patient_account, mrn, Facility) OUTPUT' +
        ' INSERTED.mrn VALUES' +
        ' (@patient_account, @mrn, @Facility);', function(err) {
        if (err) {
          console.log(err);}
      });
    request.addParameter('patient_account', TYPES.NVarChar, o.Account);
    request.addParameter('mrn', TYPES.NChar, o.MRN);
    request.addParameter('Facility', TYPES.Int, o.FacilityId);
    request.on('row', function(columns){
      columns.forEach(function(column){
        if(column.value === null){
          console.log('NULL');
        } else {
          completion(column.value);
        }
      });
    });
    conn.execSql(request);
    // conn.close();

  };

  exports.getDxPatientCohort = function(conn, campus, first_date, second_date, completion) {
    var
      TYPES = require('tedious').TYPES
      ;
    execsp(conn, procs.getDxPatientCohort,
      [
        {"param": "campus", "value": campus, "type": TYPES.Int},
        {"param": "start_date", "value": first_date, "type": TYPES.VarChar},
        {"param": "end_date", "value": second_date, "type": TYPES.VarChar}
      ], tableOne(procs.getDxPatientCohort, completion)
    );

  };

  exports.init = function(settings) {
    var
      spwd = process.env.PASSWORD
      ;
    logger.debug('init: %s', settings.server);
    sql_options = settings;

    if(spwd) {
      sql_options.password = spwd;
    }
    return sql_options;
  };

  exports.connect = function(sql_options,completion) {
    var
      connection = new Connection(sql_options)
      ;
    connection.on('connect',function(connect_error) {
      if(connect_error) {
        logger.error(connect_error);
      }
      completion(connect_error, connection);
    });
    return connection;
  };

}());