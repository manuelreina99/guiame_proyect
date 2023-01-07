// Routes '/mensajes

var express = require('express');
var bodyParser = require('body-parser');
var Utils = require('../utils');
var Verify = require('../verify');
var mensajeRouter = express.Router({mergeParams: true}); //mergeParams preserve the req.params values from the parent router.

mensajeRouter.use(bodyParser.json());
mensajeRouter.route('/')

// Lee todos los mensajes del usuario / empresa
.get(Verify.verifyRead, function(req, res) {
  Utils.pool.connect(function(err, client, done) {
    if(err) {
      //return console.error('error fetching client from pool', err);
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var selectStatement = 'SELECT * FROM mensaje ' +
                            ' WHERE idempresa in (0, $1) ' +
                            ' AND fechaini <= now() AND fechafin >= now() ' +
                            ' ORDER BY importante DESC, fechaini DESC, fechafin ASC';
      var params = [req.decoded.idultimaempresa];
      Utils.log(selectStatement + ' - ' + params);
      client.query(selectStatement, params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Error al leer mensajes.");
        }
        else{
          done();
          res.status(200).json(result.rows);
        }
      });
    }
  });
})

;

module.exports = mensajeRouter;