var
  me = module.exports,
  _ = require('underscore')
;


exports.extractuniqIdentifiers = function(data,id){
  return  _.uniq(_.map(data,function(o){return parseInt(o[id]);}))
}

exports.joinOnSharedIdentifier = function(data,ids_array,identifier){
    return _.filter(data, function(r){
      return _.find(ids_array, function(o){
        return parseInt(r[identifier]) === o;
      });
    });
}
