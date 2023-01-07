// Routes '/print

var express = require('express');
var bodyParser = require('body-parser');
var Utils = require('../utils');
var Verify = require('../verify');
var PrintGrupo = require('../routes/printGrupo');
var PrintFactura = require('../routes/printFactura');
var printRouter = express.Router({mergeParams: true}); //mergeParams preserve the req.params values from the parent router.

printRouter.use(bodyParser.json());

printRouter.route('/')

printRouter.route('/grupo')
.post(
  Verify.verifyRead,
  function(req, res) {
    Utils.pool.connect(function(err, client, done) {
      if(err) {
        Utils.handleError(res, done, err.message, "error fetching client from pool");
      }
      else{
        console.log('req.body.gruposToPrint:', req.body.idgrupo);
        PrintGrupo.printGrupo(client, req.decoded.idultimaempresa, req.body.idgrupo, req.headers['client-timezone'], function(err, pdfDoc){
          if(err){
            console.log('****************************', err);
            Utils.handleError(res, done, err.message, "error in printGrupo");
          }
          else{
            done();
            pdfDoc.pipe( res );
            pdfDoc.end();
          }
        });
      }
    })
  }
)

printRouter.route('/grupos')
.post(
  Verify.verifyRead,
  function(req, res) {
    Utils.pool.connect(function(err, client, done) {
      if(err) {
        Utils.handleError(res, done, err.message, "error fetching client from pool");
      }
      else{
        console.log('req.body.gruposToPrint:', req.body.filtro);
        PrintGrupo.printGrupos(client, req.decoded.idultimaempresa, req.body.filtro, req.headers['client-timezone'], req.decoded.idusuario, function(err, pdfDoc){
          if(err){
            console.log('****************************', err);
            Utils.handleError(res, done, err.message, "error in printGrupos");
          }
          else{
            done();
            pdfDoc.pipe( res );
            pdfDoc.end();
          }
        });
      }
    })
  }
)

printRouter.route('/factura')
.post(
  Verify.verifyRead,
  function(req, res) {
    Utils.pool.connect(function(err, client, done) {
      if(err) {
        Utils.handleError(res, done, err.message, "error fetching client from pool");
      }
      else{
        console.log('printRouter/factura.isproforma:', req.body);
        PrintFactura.printFactura(client, req.decoded.idultimaempresa, req.body.idsToPrint, req.body.isproforma, req.headers['client-timezone'], function(err, pdfDoc){
          if(err){
            Utils.handleError(res, done, err.message, "error en printFactura");
          }
          else{
            done();
            pdfDoc.pipe( res );
            pdfDoc.end();
          }
        });
      }
    })
  }
)

printRouter.route('/facturas')
.post(
  Verify.verifyRead,
  function(req, res) {
    Utils.pool.connect(function(err, client, done) {
      if(err) {
        Utils.handleError(res, done, err.message, "error fetching client from pool");
      }
      else{
        PrintFactura.printFacturas(client, req.decoded.idultimaempresa, req.decoded.idusuario, req.decoded.rol, req.body.filtro, req.headers['client-timezone'], function(err, pdfDoc){
          if(err){
            Utils.handleError(res, done, err.message, "error en printFacturas");
          }
          else{
            done();
            pdfDoc.pipe( res );
            pdfDoc.end();
          }
        });
      }
    })
  }
)

printRouter.route('/tarifa')
.post(
  Verify.verifyRead,
  function(req, res) {
    Utils.pool.connect(function(err, client, done) {
      if(err) {
        Utils.handleError(res, done, err.message, "error fetching client from pool");
      }
      else{
        PrintFactura.printTarifa(client, req.decoded.idultimaempresa, req.body.idtarifa, req.headers['client-timezone'], function(err, pdfDoc){
          if(err){
            Utils.handleError(res, done, err.message, "error en printTarifa");
          }
          else{
            done();
            pdfDoc.pipe( res );
            pdfDoc.end();
          }
        });
      }
    })
  }
)

;

module.exports = printRouter;