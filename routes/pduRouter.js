// Routes '/pdu

var express = require('express');
var bodyParser = require('body-parser');
var Utils = require('../utils');
var Verify = require('../verify');
var pduRouter = express.Router({mergeParams: true}); //mergeParams preserve the req.params values from the parent router.

pduRouter.use(bodyParser.json());
pduRouter.route('/')

// Lee todas las tablas de pdu que lleguen en req.body.tablas
.post(Verify.verifyRead, function(req, res) {
  //console.log('getPdus: ' + req.body.tablas);
  var listTablas = [];
  for (var i = 0; i < req.body.tablas.length; i++) {
    listTablas.push(req.body.tablas[i]);
  }
  Utils.pool.connect(function(err, client, done) {
    if(err) {
      //return console.error('error fetching client from pool', err);
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var statement = 'SELECT tabla, codigo, orden, (codigo || \'-\' || nombre) nombre, fijo FROM gt_pdu' +
                      ' WHERE idempresa = $1' +
                      ' AND tabla =  ANY($2::text[])';
      if(listTablas.includes('tarifa')){
        statement = statement + 'UNION ALL SELECT \'tarifa\', codigo, 1, (codigo || \'-\' || descripcion) descripcion, false fijo FROM gt_tarifa WHERE idempresa = $1';
      }
      if(listTablas.includes('emisor')){
        statement = statement + 'UNION ALL SELECT \'emisor\', eu.idusuario::text codigo, 1, upper(u.nombre) descripcion, false fijo from gt_empresausuario eu, gt_usuario u WHERE eu.idempresa = $1 AND eu.idusuario = u.idusuario AND eu.rol < 9';
      }
      if(listTablas.includes('monumento')){
        statement = statement + 'UNION ALL SELECT \'monumento\', codigo, 1, (codigo || \'-\' || descripcion) descripcion, false fijo from gt_monumento WHERE idempresa = $1';
      }
      statement = statement + ' ORDER BY tabla, fijo DESC, orden, codigo';
      var params = [req.decoded.idultimaempresa, listTablas];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Error al leer pdu.");
        }
        else{
          done();
          /*if(listTablas.includes('emisor')){
            for (var i = result.rows.length - 1; i >= 0; i--) {
              if(result.rows[i].tabla == 'emisor'){
                result.rows[i].codigo = parseInt(result.rows[i].codigo);
              }
            }
          }*/
          res.status(200).json(result.rows);
        }
      });
    }
  });
})

.put(Verify.verifyRead, Verify.verifyWrite, function(req, res) {
  console.log('pdu:', req.body.pdu);
  Utils.pool.connect(function(err, client, done) {
    if(err) {
      //return console.error('error fetching client from pool', err);
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var statement = 'UPDATE gt_pdu' +
                      '   SET orden          = $1,' +
                      '       nombre         = $2,' +
                      '       direccion      = $3,' +
                      '       localidad      = $4,' +
                      '       codigopostal   = $5,' +
                      '       provincia      = $6,' +
                      '       tel1           = $7,' +
                      '       tel2           = $8,' +
                      '       tel3           = $9,' +
                      '       tel4           = $10,' +
                      '       tel5           = $11,' +
                      '       fax            = $12,' +
                      '       email          = $13,' +
                      '       identificacion = $14,' +
                      '       tarifa         = $15,' +
                      '       descuento      = $16,' +
                      '       descuentoita   = $17,' +
                      '       formapago      = $18,' +
                      '       tipofactura    = $19,' +
                      '       observaciones  = $20,' +
                      '       fijo           = $21,' +
                      '       idiomas        = $22,' +
                      '       irpf           = $23,' +
                      '       factpormatriz  = $24,' +
                      '       idusuario      = $25,' +
                      '       pais           = $26' +
                      ' WHERE idempresa      = $27' +
                      '   AND tabla          = $28' +
                      '   AND upper(codigo)  = $29' +
                      '   RETURNING idpdu, idusuarioapp';
      var params = [req.body.pdu.orden || 0,
                    req.body.pdu.nombre,
                    req.body.pdu.direccion || '',
                    req.body.pdu.localidad || '',
                    req.body.pdu.codigopostal || 0,
                    req.body.pdu.provincia || '',
                    req.body.pdu.tel1 || '',
                    req.body.pdu.tel2 || '',
                    req.body.pdu.tel3 || '',
                    req.body.pdu.tel4 || '',
                    req.body.pdu.tel5 || '',
                    req.body.pdu.fax || '',
                    req.body.pdu.email || '',
                    req.body.pdu.identificacion || '',
                    req.body.pdu.tarifa || '',
                    req.body.pdu.descuento || 0,
                    req.body.pdu.descuentoita || 0,
                    req.body.pdu.formapago || '',
                    req.body.pdu.tipofactura || '',
                    req.body.pdu.observaciones || '',
                    req.body.pdu.fijo || false,
                    req.body.pdu.idiomas,
                    req.body.pdu.irpf || 0,
                    req.body.pdu.factpormatriz || false,
                    req.decoded.idusuario,
                    req.body.pdu.pais || '',
                    req.decoded.idultimaempresa,
                    req.body.pdu.tabla,
                    req.body.pdu.codigo.toUpperCase()];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Error updating gt_pdu.");
        }
        else{
          if(result.rowCount === 0){
            var statement = 'INSERT INTO gt_pdu (idempresa, tabla, codigo, nombre, direccion, localidad, codigopostal, provincia,' +
                            '                    tel1, tel2, tel3, tel4, tel5, fax, email, identificacion, tarifa, descuento, descuentoita,' +
                            '                    formapago, tipofactura, observaciones, fijo, idiomas, irpf, orden, factpormatriz, idusuario)' +
                            '            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,' +
                            '                    $21, $22, $23, $24, $25, $26, $27, $28)' +
                            '   RETURNING idpdu';
            console.log('pdu:', req.body.pdu);
            var params = [req.decoded.idultimaempresa,
                          req.body.pdu.tabla,
                          req.body.pdu.codigo.toUpperCase(),
                          req.body.pdu.nombre.toUpperCase(),
                          req.body.pdu.direccion || '',
                          req.body.pdu.localidad || '',
                          req.body.pdu.codigopostal || 0,
                          req.body.pdu.provincia || '',
                          req.body.pdu.tel1 || '',
                          req.body.pdu.tel2 || '',
                          req.body.pdu.tel3 || '',
                          req.body.pdu.tel4 || '',
                          req.body.pdu.tel5 || '',
                          req.body.pdu.fax || '',
                          req.body.pdu.email || '',
                          req.body.pdu.identificacion || '',
                          req.body.pdu.tarifa || '',
                          req.body.pdu.descuento || 0,
                          req.body.pdu.descuentoita || 0,
                          req.body.pdu.formapago || '',
                          req.body.pdu.tipofactura || '',
                          req.body.pdu.observaciones || '',
                          req.body.pdu.fijo || false,
                          req.body.pdu.idiomas,
                          req.body.pdu.irpf || 0,
                          req.body.pdu.orden || 0,
                          req.body.pdu.factpormatriz || false,
                          req.decoded.idusuario];
            Utils.log(statement + ' - ' + params);
            client.query(statement, params, function(err, result) {
              if (err){
                Utils.handleError(res, done, err.message, "Error updating gt_pdu.");
              }
              else{
                done();
                res.status(200).json(result.rows[0].idpdu);
              }
            });
          }
          else{
            var idpdu = result.rows[0].idpdu;
            if(req.body.pdu.tabla == 'guia' && result.rows[0].idusuarioapp == req.decoded.idusuario && req.body.pdu.email && req.body.pdu.email.length > 5){
              statement = 'UPDATE gt_usuario SET nombrecompleto = $1, email = $2 WHERE idusuario = $3';
              params = [req.body.pdu.nombre, req.body.pdu.email, req.decoded.idusuario];
              Utils.log(statement + ' - ' + params);
              client.query(statement, params, function(err, result) {
                if (err){
                  Utils.handleError(res, done, err.message, "Error updating usuario.");
                }
                else{
                  done();
                  res.status(200).json(idpdu);
                }
              });
            }
            else{
              done();
              res.status(200).json(idpdu);  
            }
            
          }
        }
      });
    }
  });
})

pduRouter.route('/codigo/:idpdu')
.delete(Verify.verifyRead, Verify.verifyWrite, function(req, res) {
  Utils.pool.connect(function(err, client, done) {
    if(err){
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var statement = 'DELETE FROM gt_pdu' +
                      ' WHERE idempresa = $1 AND idpdu = $2';
      var params = [req.decoded.idultimaempresa, req.params.idpdu];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Error deleting gt_pdu.");
        }
        else{
          done();
          res.status(200).json(result.rows);
        }
      });
    }
  });
})

pduRouter.route('/all')
// Lee todos las tablas de pdu
.get(Verify.verifyRead, function(req, res) {
  Utils.pool.connect(function(err, client, done) {
    if(err) {
      //return console.error('error fetching client from pool', err);
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var statement = 'SELECT * FROM gt_pdu ' +
                      ' WHERE idempresa = $1' +
                      ' ORDER BY tabla, orden, codigo';
      var params = [req.decoded.idultimaempresa];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Error reading gt_pdu table.");
        }
        else{
          done();
          res.status(200).json(result.rows);
        }
      });
    }
  });
})

pduRouter.route('/fechas')
.post(Verify.verifyRead, function(req, res) {
  console.log('#############################');
  console.log('fechas:', req.body);
  console.log('#############################');
  Utils.pool.connect(function(err, client, done) {
    if(err) {
      //return console.error('error fetching client from pool', err);
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var statement = getFechaStatement();
      var params = [req.decoded.idultimaempresa, req.body.isfestivo];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Error reading gt_fecha table.");
        }
        else{
          done();
          res.status(200).json(result.rows);
        }
      });
    }
  });
})

.put(Verify.verifyRead, Verify.verifyWrite, function(req, res) {
  Utils.pool.connect(function(err, client, done) {
    if(err) {
      //return console.error('error fetching client from pool', err);
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      if(!req.body.fecha.descripcion){
        req.body.fecha.descripcion = '';
      }
      var statement = 'UPDATE gt_fecha' +
                      '   SET descripcion    = $1,' +
                      '       idusuario      = $2'  +
                      ' WHERE idempresa      = $3'  +
                      '   AND fecha          = $4'  +
                      '   AND festivo        = $5';
      var params = [req.body.fecha.descripcion,
                    req.decoded.idusuario,
                    req.decoded.idultimaempresa,
                    req.body.fecha.fecha,
                    req.body.fecha.festivo];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Error updating gt_fecha.");
        }
        else{
          if(result.rowCount === 0){
            var statement = 'INSERT INTO gt_fecha (idempresa, fecha, descripcion, festivo, idusuario)' +
                            '            VALUES ($1, $2, $3, $4, $5)';
            console.log('pdu:', req.body.pdu);
            var params = [req.decoded.idultimaempresa,
                          req.body.fecha.fecha,
                          req.body.fecha.descripcion,
                          req.body.fecha.festivo,
                          req.decoded.idusuario];
            Utils.log(statement + ' - ' + params);
            client.query(statement, params, function(err, result) {
              if (err){
                Utils.handleError(res, done, err.message, "Error updating gt_fecha.");
              }
              else{
                var statement = getFechaStatement();
                var params = [req.decoded.idultimaempresa, req.body.fecha.festivo];
                Utils.log(statement + ' - ' + params);
                client.query(statement, params, function(err, result) {
                  if (err){
                    Utils.handleError(res, done, err.message, "Error reading gt_fecha table.");
                  }
                  else{
                    done();
                    res.status(200).json(result.rows);
                  }
                });
              }
            });
          }
          else{
            var statement = getFechaStatement();
            var params = [req.decoded.idultimaempresa, req.body.fecha.festivo];
            Utils.log(statement + ' - ' + params);
            client.query(statement, params, function(err, result) {
              if (err){
                Utils.handleError(res, done, err.message, "Error reading gt_fecha table.");
              }
              else{
                done();
                res.status(200).json(result.rows);
              }
            });
          }
        }
      });
    }
  });
})

pduRouter.route('/fechas/:id')
.delete(Verify.verifyRead, Verify.verifyWrite, function(req, res) {
  Utils.pool.connect(function(err, client, done) {
    if(err){
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var statement = 'DELETE FROM gt_fecha' +
                      ' WHERE idempresa = $1 AND idfecha = $2 RETURNING festivo';
      var params = [req.decoded.idultimaempresa, req.params.id];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Error deleting gt_fecha.");
        }
        else{
          var statement = getFechaStatement();
          var params = [req.decoded.idultimaempresa, (result.rowCount > 0 ? result.rows[0].festivo : true)];
          Utils.log(statement + ' - ' + params);
          client.query(statement, params, function(err, result) {
            if (err){
              Utils.handleError(res, done, err.message, "Error reading gt_fecha table.");
            }
            else{
              done();
              res.status(200).json(result.rows);
            }
          });
        }
      });
    }
  });
})

pduRouter.route('/monumentos')

// Lee todos los monumentos
.get(Verify.verifyRead, function(req, res) {
  Utils.pool.connect(function(err, client, done) {
    if(err) {
      //return console.error('error fetching client from pool', err);
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var statement = getMonumentosStatement();
      var params = [req.decoded.idultimaempresa];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Error leyendo monumentos.");
        }
        else{
          done();
          for (var i = 0; i < result.rows.length; i++) {
            result.rows[i].precio = parseFloat(result.rows[i].precio);
          }
          res.status(200).json(result.rows);
        }
      });
    }
  });
})

.put(Verify.verifyRead, Verify.verifyWrite, function(req, res) {
  console.log('monumento:', req.body.monumento);
  Utils.pool.connect(function(err, client, done) {
    if(err) {
      //return console.error('error fetching client from pool', err);
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var statement = 'UPDATE gt_monumento' +
                      '   SET descripcion   = $1,' +
                      '       precio        = $2,'  +
                      '       tel1          = $3,'  +
                      '       tel2          = $4,'  +
                      '       observaciones = $5,'  +
                      '       lunes         = $6,  lh1 = $7,  lh2 = $8,  lh3= $9,  lh4 = $10,'  +
                      '       martes        = $11, mh1 = $12, mh2 = $13, mh3= $14, mh4 = $15,'  +
                      '       miercoles     = $16, xh1 = $17, xh2 = $18, xh3= $19, xh4 = $20,'  +
                      '       jueves        = $21, jh1 = $22, jh2 = $23, jh3= $24, jh4 = $25,'  +
                      '       viernes       = $26, vh1 = $27, vh2 = $28, vh3= $29, vh4 = $30,'  +
                      '       sabado        = $31, sh1 = $32, sh2 = $33, sh3= $34, sh4 = $35,'  +
                      '       domingo       = $36, dh1 = $37, dh2 = $38, dh3= $39, dh4 = $40,'  +
                      '       idusuario     = $41'  +
                      ' WHERE idempresa     = $42'  +
                      '   AND idmonumento   = $43';
      var params = [req.body.monumento.descripcion,
                    req.body.monumento.precio,
                    req.body.monumento.tel1,
                    req.body.monumento.tel2,
                    req.body.monumento.observaciones,
                    req.body.monumento.lunes,     req.body.monumento.lh1, req.body.monumento.lh2, req.body.monumento.lh3, req.body.monumento.lh4,
                    req.body.monumento.martes,    req.body.monumento.mh1, req.body.monumento.mh2, req.body.monumento.mh3, req.body.monumento.mh4,
                    req.body.monumento.miercoles, req.body.monumento.xh1, req.body.monumento.xh2, req.body.monumento.xh3, req.body.monumento.xh4,
                    req.body.monumento.jueves,    req.body.monumento.jh1, req.body.monumento.jh2, req.body.monumento.jh3, req.body.monumento.jh4,
                    req.body.monumento.viernes,   req.body.monumento.vh1, req.body.monumento.vh2, req.body.monumento.vh3, req.body.monumento.vh4,
                    req.body.monumento.sabado,    req.body.monumento.sh1, req.body.monumento.sh2, req.body.monumento.sh3, req.body.monumento.sh4,
                    req.body.monumento.domingo,   req.body.monumento.dh1, req.body.monumento.dh2, req.body.monumento.dh3, req.body.monumento.dh4,
                    req.decoded.idusuario,
                    req.decoded.idultimaempresa,
                    req.body.monumento.idmonumento];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Error actualizando datos del monumento.");
        }
        else{
          if(result.rowCount === 0){
            var statement = 'INSERT INTO gt_monumento (idempresa, codigo, descripcion, precio, tel1, tel2, observaciones,' +
                            '                          lunes, lh1, lh2, lh3, lh4, martes, mh1, mh2, mh3, mh4, miercoles, xh1, xh2, xh3, xh4,' +
                            '                          jueves, jh1, jh2, jh3, jh4, viernes, vh1, vh2, vh3, vh4, sabado, sh1, sh2, sh3, sh4, domingo, dh1, dh2, dh3, dh4,' +
                            '                          idusuario)' +
                            '            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,' +
                            '                    $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43)';
            var params = [req.decoded.idultimaempresa,
                          req.body.monumento.codigo,
                          req.body.monumento.descripcion,
                          req.body.monumento.precio,
                          req.body.monumento.tel1,
                          req.body.monumento.tel2,
                          req.body.monumento.observaciones,
                          req.body.monumento.lunes,     req.body.monumento.lh1, req.body.monumento.lh2, req.body.monumento.lh3, req.body.monumento.lh4,
                          req.body.monumento.martes,    req.body.monumento.mh1, req.body.monumento.mh2, req.body.monumento.mh3, req.body.monumento.mh4,
                          req.body.monumento.miercoles, req.body.monumento.xh1, req.body.monumento.xh2, req.body.monumento.xh3, req.body.monumento.xh4,
                          req.body.monumento.jueves,    req.body.monumento.jh1, req.body.monumento.jh2, req.body.monumento.jh3, req.body.monumento.jh4,
                          req.body.monumento.viernes,   req.body.monumento.vh1, req.body.monumento.vh2, req.body.monumento.vh3, req.body.monumento.vh4,
                          req.body.monumento.sabado,    req.body.monumento.sh1, req.body.monumento.sh2, req.body.monumento.sh3, req.body.monumento.sh4,
                          req.body.monumento.domingo,   req.body.monumento.dh1, req.body.monumento.dh2, req.body.monumento.dh3, req.body.monumento.dh4,
                          req.decoded.idusuario];
            Utils.log(statement + ' - ' + params);
            client.query(statement, params, function(err, result) {
              if (err){
                Utils.handleError(res, done, err.message, "Error al añadir el monumento.");
              }
              else{
                var statement = getMonumentosStatement();
                var params = [req.decoded.idultimaempresa];
                Utils.log(statement + ' - ' + params);
                client.query(statement, params, function(err, result) {
                  if (err){
                    Utils.handleError(res, done, err.message, "Error leyendo monumentos.");
                  }
                  else{
                    done();
                    for (var i = 0; i < result.rows.length; i++) {
                      result.rows[i].precio = parseFloat(result.rows[i].precio);
                    }
                    res.status(200).json(result.rows);
                  }
                });
              }
            });
          }
          else{
            var statement = getMonumentosStatement();
            var params = [req.decoded.idultimaempresa];
            Utils.log(statement + ' - ' + params);
            client.query(statement, params, function(err, result) {
              if (err){
                Utils.handleError(res, done, err.message, "Error leyendo monumentos.");
              }
              else{
                done();
                for (var i = 0; i < result.rows.length; i++) {
                  result.rows[i].precio = parseFloat(result.rows[i].precio);
                }
                res.status(200).json(result.rows);
              }
            });
          }
        }
      });
    }
  });
})

pduRouter.route('/monumentos/incidencias')
.put(Verify.verifyRead, Verify.verifyWrite, function(req, res) {
  console.log('incidencia:', req.body.incidencia);
  Utils.pool.connect(function(err, client, done) {
    if(err) {
      //return console.error('error fetching client from pool', err);
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var statement = 'UPDATE gt_monumentoincidencia' +
                      '   SET fechadesde   = $1,' +
                      '       fechahasta   = $2,' +
                      '       h1           = $3,'  +
                      '       h2           = $4,'  +
                      '       h3           = $5,'  +
                      '       h4           = $6,'  +
                      '       idusuario    = $7'  +
                      ' WHERE idempresa    = $8'  +
                      '   AND idmonumentoincidencia = $9';
      var params = [req.body.incidencia.fechadesde,
                    req.body.incidencia.fechahasta,
                    req.body.incidencia.h1,
                    req.body.incidencia.h2,
                    req.body.incidencia.h3,
                    req.body.incidencia.h4,
                    req.decoded.idusuario,
                    req.decoded.idultimaempresa,
                    req.body.incidencia.idmonumentoincidencia];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Error actualizando datos de incidencia.");
        }
        else{
          if(result.rowCount === 0){
            var statement = 'INSERT INTO gt_monumentoincidencia (idempresa, idmonumento, fechadesde, fechahasta, h1, h2, h3, h4, idusuario)' +
                            '            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)';
            var params = [req.decoded.idultimaempresa,
                          req.body.incidencia.idmonumento,
                          req.body.incidencia.fechadesde,
                          req.body.incidencia.fechahasta,
                          req.body.incidencia.h1,
                          req.body.incidencia.h2,
                          req.body.incidencia.h3,
                          req.body.incidencia.h4,
                          req.decoded.idusuario];
            Utils.log(statement + ' - ' + params);
            client.query(statement, params, function(err, result) {
              if (err){
                Utils.handleError(res, done, err.message, "Error al añadir la incidencia. Posible fecha de inicio de la incidencia duplicada.");
              }
              else{
                var statement = getIncidencias();
                var params = [req.decoded.idultimaempresa, req.body.incidencia.idmonumento];
                Utils.log(statement + ' - ' + params);
                client.query(statement, params, function(err, result) {
                  if (err){
                    Utils.handleError(res, done, err.message, "Error leyendo incidencias.");
                  }
                  else{
                    done();
                    res.status(200).json(result.rows);
                  }
                });
              }
            });
          }
          else{
            var statement = getIncidencias();
            var params = [req.decoded.idultimaempresa, req.body.incidencia.idmonumento];
            Utils.log(statement + ' - ' + params);
            client.query(statement, params, function(err, result) {
              if (err){
                Utils.handleError(res, done, err.message, "Error leyendo incidencias.");
              }
              else{
                done();
                res.status(200).json(result.rows);
              }
            });
          }
        }
      });
    }
  });
})

pduRouter.route('/monumentos/check')
.put(Verify.verifyRead, function(req, res) {
  console.log('/monumentos/check/monumentos:', req.body.monumentos);
  console.log('/monumentos/check/fecha:', req.body.fecha);
  console.log('/monumentos/check/horafinal:', req.body.horafinal);
  Utils.pool.connect(function(err, client, done) {
    if(err) {
      //return console.error('error fetching client from pool', err);
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var st = Utils.getHorariosMonumentos(req.decoded.idultimaempresa, req.body.monumentos, req.body.fecha, req.headers['client-timezone']);
      //Utils.log(st.statement + ' - ' + st.params);
      client.query(st.statement, st.params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Error consultando horarios de monumentos.");
        }
        else{
          done();
          res.status(200).json(result.rows);
        }
      });
    }
  });
})

pduRouter.route('/monumentos/incidencias/:id')
.get(Verify.verifyRead, function(req, res) {
  Utils.pool.connect(function(err, client, done) {
    if(err) {
      //return console.error('error fetching client from pool', err);
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var statement = getIncidencias();
      var params = [req.decoded.idultimaempresa, req.params.id];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Error leyendo incidencias del monumento.");
        }
        else{
          done();
          console.log(result.rows);
          res.status(200).json(result.rows);
        }
      });
    }
  });
})

.delete(Verify.verifyRead, Verify.verifyWrite, function(req, res) {
  Utils.pool.connect(function(err, client, done) {
    if(err){
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var statement = 'DELETE FROM gt_monumentoincidencia' +
                      ' WHERE idempresa = $1 AND idmonumentoincidencia = $2' +
                      ' RETURNING idmonumento';
      var params = [req.decoded.idultimaempresa, req.params.id];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Error borrando incidencia.");
        }
        else{
          var idmonumento = 0;
          if(result.rowCount > 0){
            idmonumento = result.rows[0].idmonumento;
          }
          var statement = getIncidencias();
          var params = [req.decoded.idultimaempresa, idmonumento];
          Utils.log(statement + ' - ' + params);
          client.query(statement, params, function(err, result) {
            if (err){
              Utils.handleError(res, done, err.message, "Error leyendo incidencias.");
            }
            else{
              done();
              res.status(200).json(result.rows);
            }
          });
        }
      });
    }
  });
})

pduRouter.route('/monumentos/:id')
.delete(Verify.verifyRead, Verify.verifyWrite, function(req, res) {
  Utils.pool.connect(function(err, client, done) {
    if(err){
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var statement = 'DELETE FROM gt_monumento' +
                      ' WHERE idempresa = $1 AND idmonumento = $2';
      var params = [req.decoded.idultimaempresa, req.params.id];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Error borrando monumento.");
        }
        else{
          var statement = getMonumentosStatement();
          var params = [req.decoded.idultimaempresa];
          Utils.log(statement + ' - ' + params);
          client.query(statement, params, function(err, result) {
            if (err){
              Utils.handleError(res, done, err.message, "Error leyendo monumentos.");
            }
            else{
              done();
              for (var i = 0; i < result.rows.length; i++) {
                result.rows[i].precio = parseFloat(result.rows[i].precio);
              }
              res.status(200).json(result.rows);
            }
          });
        }
      });
    }
  });
})

pduRouter.route('/agencia/:codigo')
.get(Verify.verifyRead, function(req, res) {
  Utils.pool.connect(function(err, client, done) {
    if(err) {
      //return console.error('error fetching client from pool', err);
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var statement = 'SELECT * FROM gt_pdu WHERE idempresa = $1 AND tabla = $2 AND codigo = $3';
      var params = [req.decoded.idultimaempresa, 'agencia', req.params.codigo];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Error reading gt_pdu agencia, codigo:" + req.params.codigo);
        }
        else{
          done();
          res.status(200).json(result.rows);
        }
      });
    }
  });
})

pduRouter.route('/proveedor/:codigo')
.get(Verify.verifyRead, function(req, res) {
  Utils.pool.connect(function(err, client, done) {
    if(err) {
      //return console.error('error fetching client from pool', err);
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var statement = 'SELECT * FROM gt_pdu WHERE idempresa = $1 AND tabla = $2 AND codigo = $3';
      var params = [req.decoded.idultimaempresa, 'proveedor', req.params.codigo];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Error reading gt_pdu proveedor, codigo:" + req.params.codigo);
        }
        else{
          done();
          res.status(200).json(result.rows);
        }
      });
    }
  });
})

pduRouter.route('/tarifas')

// Lee todas las tarifas
.get(Verify.verifyRead, function(req, res) {
  Utils.pool.connect(function(err, client, done) {
    if(err) {
      //return console.error('error fetching client from pool', err);
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var statement = getTarifasStatement();
      var params = [req.decoded.idultimaempresa];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Error reading gt_tarifa table.");
        }
        else{
          done();
          for (var i = 0; i < result.rows.length; i++) {
            result.rows[i].monumentolaborable = parseFloat(result.rows[i].monumentolaborable);
            result.rows[i].monumentofestivo   = parseFloat(result.rows[i].monumentofestivo);
            result.rows[i].horalaborable      = parseFloat(result.rows[i].horalaborable);
            result.rows[i].horafestivo        = parseFloat(result.rows[i].horafestivo);
            result.rows[i].idiomalaborable    = parseFloat(result.rows[i].idiomalaborable);
            result.rows[i].idiomafestivo      = parseFloat(result.rows[i].idiomafestivo);
          }
          //console.log(result.rows);
          res.status(200).json(result.rows);
        }
      });
    }
  });
})

.put(Verify.verifyRead, Verify.verifyWrite, function(req, res) {
  console.log('tarifa:', req.body.tarifa);
  Utils.pool.connect(function(err, client, done) {
    if(err) {
      //return console.error('error fetching client from pool', err);
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var statement = 'UPDATE gt_tarifa' +
                      '   SET codigo             = $1'  +
                      '      ,descripcion        = $2'  +
                      '      ,precios            = $3'  +
                      '      ,monumentolaborable = $4'  +
                      '      ,monumentofestivo   = $5'  +
                      '      ,horalaborable      = $6'  +
                      '      ,horafestivo        = $7'  +
                      '      ,idiomalaborable    = $8'  +
                      '      ,idiomafestivo      = $9'  +
                      '      ,idusuario          = $10'  +
                      ' WHERE idempresa          = $11'  +
                      '   AND idtarifa           = $12';
      var params = [req.body.tarifa.codigo            ,
                    req.body.tarifa.descripcion       ,
                    req.body.tarifa.precios           ,
                    req.body.tarifa.monumentolaborable,
                    req.body.tarifa.monumentofestivo  ,
                    req.body.tarifa.horalaborable     ,
                    req.body.tarifa.horafestivo       ,
                    req.body.tarifa.idiomalaborable   ,
                    req.body.tarifa.idiomafestivo     ,
                    req.decoded.idusuario             ,
                    req.decoded.idultimaempresa,
                    req.body.tarifa.idtarifa];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Error updating gt_tarifa.");
        }
        else{
          if(result.rowCount === 0){
            var statement = 'INSERT INTO gt_tarifa (idempresa, codigo, descripcion, precios,' +
                            '                       monumentolaborable, monumentofestivo,' +
                            '                       horalaborable, horafestivo, idiomalaborable, idiomafestivo, idusuario)' +
                            '            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)' +
                            '   RETURNING idtarifa';
            var params = [req.decoded.idultimaempresa       ,
                          req.body.tarifa.codigo            ,
                          req.body.tarifa.descripcion       ,
                          req.body.tarifa.precios           ,
                          req.body.tarifa.monumentolaborable,
                          req.body.tarifa.monumentofestivo  ,
                          req.body.tarifa.horalaborable     ,
                          req.body.tarifa.horafestivo       ,
                          req.body.tarifa.idiomalaborable   ,
                          req.body.tarifa.idiomafestivo     ,
                          req.decoded.idusuario];
            Utils.log(statement + ' - ' + params);
            client.query(statement, params, function(err, result) {
              if (err){
                Utils.handleError(res, done, err.message, "Error updating gt_tarifa.");
              }
              else{
                done();
                res.status(200).json(result.rows[0].idtarifa);
              }
            });
          }
          else{
            done();
            res.status(200).json(req.body.tarifa.idtarifa);
          }
        }
      });
    }
  });
})

pduRouter.route('/tables')

// Lee todos los nombres de tablas de pdu
.get(Verify.verifyRead, function(req, res) {
  Utils.pool.connect(function(err, client, done) {
    if(err) {
      //return console.error('error fetching client from pool', err);
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var statement = 'SELECT tablas.tabla, descripcion, icon' +
                      '  FROM' +
                      ' (SELECT DISTINCT tabla FROM gt_pdu WHERE idempresa = $1) tablas' +
                      ' LEFT OUTER JOIN (SELECT * FROM gt_pdutabla WHERE idempresa = $1) desctablas ON desctablas.tabla = tablas.tabla' +
                      ' ORDER BY 1';
      var params = [req.decoded.idultimaempresa];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Error reading gt_pdu tables.");
        }
        else{
          done();
          res.status(200).json(result.rows);
        }
      });
    }
  });
})

pduRouter.route('/tables/:tabla')
.get(Verify.verifyRead, function(req, res) {
  Utils.pool.connect(function(err, client, done) {
    if(err) {
      //return console.error('error fetching client from pool', err);
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var statement = 'SELECT * FROM gt_pdu ' +
                      ' WHERE idempresa = $1' +
                      '   AND tabla = $2' +
                      ' ORDER BY orden, codigo';
      var params = [req.decoded.idultimaempresa, req.params.tabla];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Error reading gt_pdu tables.");
        }
        else{
          done();
          for (var i = 0; i < result.rows.length; i++) {
            result.rows[i].codigopostal = parseInt(result.rows[i].codigopostal);
            result.rows[i].descuento = parseFloat(result.rows[i].descuento);
            result.rows[i].descuentoita = parseFloat(result.rows[i].descuentoita);
            result.rows[i].irpf = parseFloat(result.rows[i].irpf);
          }
          res.status(200).json(result.rows);
        }
      });
    }
  });
})

pduRouter.route('/restingperiods')

// Get all resting periods of a user
.get(Verify.verifyRead, function(req, res) {
  Utils.pool.connect(function(err, client, done) {
    if(err) {
      //return console.error('error fetching client from pool', err);
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var statement = getRestingPeriodsStatement();
      var params = [req.decoded.idultimaempresa, req.decoded.idusuario];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Error reading gt_descansos.");
        }
        else{
          done();
          res.status(200).json(result.rows);
        }
      });
    }
  });
})

.put(Verify.verifyRead, Verify.verifyWrite, function(req, res) {
  console.log('req.body:', req.body);
  Utils.pool.connect(function(err, client, done) {
    if (err){
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var statement = 'INSERT INTO gt_descansos (idguia, idempresa, tsdesde, tshasta, idusuario) ' +
                      '            VALUES ($1, $2, $3, $4, $5)';
      var params = [req.decoded.idusuario, req.decoded.idultimaempresa, req.body.tsdesde, req.body.tshasta, req.decoded.idusuario];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Error inserting gt_descansos.");
        }
        else{
          var statement = getRestingPeriodsStatement();
          var params = [req.decoded.idultimaempresa, req.decoded.idusuario];
          Utils.log(statement + ' - ' + params);
          client.query(statement, params, function(err, result) {
            if (err){
              Utils.handleError(res, done, err.message, "Error reading gt_descansos.");
            }
            else{
              done();
              res.status(200).json(result.rows);
            }
          });
        }
      });
    }
  })
})

.delete(Verify.verifyRead, Verify.verifyWrite, function(req, res) {
  console.log(req.body);
  Utils.pool.connect(function(err, client, done) {
    if(err){
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var statement = 'DELETE FROM gt_descansos' +
                      ' WHERE idempresa = $1 AND idguia = $2 AND to_char(tsdesde,\'YYYY-MM-DD\') = $3';
      var params = [req.decoded.idultimaempresa, req.decoded.idusuario, req.body.tsdesde.substr(0,10)];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Error deleting gt_descansos.");
        }
        else{
          var statement = getRestingPeriodsStatement();
          var params = [req.decoded.idultimaempresa, req.decoded.idusuario];
          Utils.log(statement + ' - ' + params);
          client.query(statement, params, function(err, result) {
            if (err){
              Utils.handleError(res, done, err.message, "Error reading gt_descansos.");
            }
            else{
              done();
              res.status(200).json(result.rows);
            }
          });
        }
      });
    }
  });
})

function getRestingPeriodsStatement(){
  return  'SELECT d.*, tshasta::date - tsdesde::date days'+
          '  FROM gt_descansos d' +
          ' WHERE idempresa = $1' +
          '   AND idguia    = $2' +
          ' ORDER BY tsdesde DESC';
}

function getFechaStatement(){
  return  'SELECT * FROM gt_fecha' +
          ' WHERE idempresa = $1' +
          '   AND festivo = $2' +
          ' ORDER BY fecha DESC';
}

function getTarifasStatement(){
  return  'SELECT * FROM gt_tarifa ' +
          ' WHERE idempresa = $1' +
          ' ORDER BY codigo';
}

function getMonumentosStatement(){
  return  'SELECT *,' +
          '       lh1, lh2, lh3, lh4,' +
          '       mh1, mh2, mh3, mh4,' +
          '       xh1, xh2, xh3, xh4,' +
          '       jh1, jh2, jh3, jh4,' +
          '       vh1, vh2, vh3, vh4,' +
          '       sh1, sh2, sh3, sh4,' +
          '       dh1, dh2, dh3, dh4' +
          '  FROM gt_monumento' +
          ' WHERE idempresa = $1' +
          ' ORDER BY codigo';
}

function getIncidencias(){
  return  'SELECT fechadesde fechaorden, idmonumentoincidencia, idempresa, idmonumento,' + //' fechaalta, fechamodificacion, idusuario,' +
          '       fechadesde,' +
          '       fechahasta,' +
          '       h1, h2, h3, h4' +
          '  FROM gt_monumentoincidencia A WHERE idempresa = $1 AND idmonumento = $2' +
          ' ORDER BY 1 DESC';
}

function addZero(i) {
  if (i < 10) {
    i = "0" + i;
  }
  return i + '';
}

;

module.exports = pduRouter;