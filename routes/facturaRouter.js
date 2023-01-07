// Routes '/facturas

var express = require('express');
var bodyParser = require('body-parser');
var Utils = require('../utils');
var Verify = require('../verify');
var json2csv = require('json2csv');
var facturaRouter = express.Router({mergeParams: true}); //mergeParams preserve the req.params values from the parent router.

facturaRouter.use(bodyParser.json());

facturaRouter.route('/')
.get(Verify.verifyRead, function(req, res) {
  Utils.pool.connect(function(err, client, done) {
    if(err){
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var statement = 'SELECT a.*, b.nombre emisor' +
                      ' FROM gt_factura a, gt_usuario b' +
                      ' WHERE a.idempresa = $1 AND a.idusuarioemisor = b.idusuario' +
                      ' ORDER BY idfactura DESC, fecha, numero';
      var params = [req.decoded.idultimaempresa];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Error getting facturas.");
        }
        else{
          done();
          res.status(200).json(result.rows);
        }
      });
    }
  });
})

//upsert factura
.put(Verify.verifyRead, Verify.verifyWrite, function(req, res) {
  Utils.pool.connect(function(err, client, done) {
    if(err){
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      if(!req.body.factura || !req.body.factura.fecha || new Date(req.body.factura.fecha).getFullYear() >= 2023){
        Utils.handleError(res, done, '', 'No se permiten facturas/gastos posteriores a 2022.', 400);
      }
      else{
        var factura = req.body.factura;
        console.log('factura:', factura);
        var statement = '';
        var params = [];
        if(!factura.idfactura || factura.idfactura == 0){
          statement = 'INSERT INTO gt_factura (idempresa, idusuarioemisor, tipofactura, numero, fecha, referencia,' +
                      '                        identificacion, nombre, direccion, poblacion, provincia, codigopostal, pais,' +
                      '                        estado, fechaestado, observaciones, porciva, porcretencion,' +
                      '                        base, totaliva, totalretencion, total, gastos, tarifa, grupos, idusuario, escompra, emisorgasto,' +
                      '                        agencia_honorarios_pagado, agencia_honorarios_fecha, agencia_honorarios_importe,' +
                      '                        agencia_gastos_pagado, agencia_gastos_fecha, agencia_gastos_importe,' +
                      '                        guia_honorarios_pagado, guia_honorarios_fecha, guia_honorarios_importe,' +
                      '                        guia_gastos_pagado, guia_gastos_fecha, guia_gastos_importe, recipient)' +
                      '                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,' +
                      '                        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41)' +
                      '       RETURNING idfactura';
          params = [req.decoded.idultimaempresa
                   ,factura.idusuarioemisor
                   ,factura.tipofactura
                   ,factura.numero
                   ,factura.fecha
                   ,factura.referencia
                   ,factura.identificacion || ''
                   ,factura.nombre
                   ,factura.direccion || ''
                   ,factura.poblacion || ''
                   ,factura.provincia || ''
                   ,factura.codigopostal || ''
                   ,factura.pais || ''
                   ,factura.estado
                   ,factura.fechaestado
                   ,factura.observaciones || ''
                   ,factura.porciva
                   ,factura.porcretencion
                   ,factura.base
                   ,factura.totaliva
                   ,factura.totalretencion
                   ,factura.total
                   ,factura.gastos
                   ,factura.tarifa
                   ,factura.grupos
                   ,req.decoded.idusuario
                   ,factura.escompra || false
                   ,factura.emisorgasto
                   ,factura.agencia_honorarios_pagado || false
                   ,factura.agencia_honorarios_fecha
                   ,factura.agencia_honorarios_importe || 0
                   ,factura.agencia_gastos_pagado || false
                   ,factura.agencia_gastos_fecha
                   ,factura.agencia_gastos_importe || 0
                   ,factura.guia_honorarios_pagado || false
                   ,factura.guia_honorarios_fecha
                   ,factura.guia_honorarios_importe || 0
                   ,factura.guia_gastos_pagado || false
                   ,factura.guia_gastos_fecha
                   ,factura.guia_gastos_importe || 0
                   ,factura.recipient];
        }
        else{
          statement = 'UPDATE gt_factura SET idusuarioemisor = $1, tipofactura = $2, numero = $3, fecha = $4, referencia = $5,' +
                      '                      identificacion = $6, nombre = $7, direccion = $8, poblacion = $9, provincia = $10, codigopostal = $11, pais = $12,' +
                      '                      estado = $13, fechaestado = $14, observaciones = $15, porciva = $16, porcretencion = $17,' +
                      '                      base = $18, totaliva = $19, totalretencion = $20, total = $21, gastos = $22, grupos = $23, idusuario = $24, escompra = $25, emisorgasto = $26,' +
                      '                      agencia_honorarios_pagado = $27, agencia_honorarios_fecha = $28, agencia_honorarios_importe = $29,' +
                      '                      agencia_gastos_pagado = $30, agencia_gastos_fecha = $31, agencia_gastos_importe = $32,' +
                      '                      guia_honorarios_pagado = $33, guia_honorarios_fecha = $34, guia_honorarios_importe = $35,' +
                      '                      guia_gastos_pagado = $36, guia_gastos_fecha = $37, guia_gastos_importe = $38, tarifa = $39, recipient = $40' +
                      ' WHERE idempresa = $41' +
                      '   AND idfactura = $42' +
                      '   AND (idusuarioemisor = $43 OR escompra = true)'; //un usuario sólo puede modificar sus facturas
          params = [factura.idusuarioemisor
                   ,factura.tipofactura
                   ,factura.numero
                   ,factura.fecha
                   ,factura.referencia
                   ,factura.identificacion || ''
                   ,factura.nombre
                   ,factura.direccion || ''
                   ,factura.poblacion || ''
                   ,factura.provincia || ''
                   ,factura.codigopostal || ''
                   ,factura.pais || ''
                   ,factura.estado
                   ,factura.fechaestado
                   ,factura.observaciones || ''
                   ,factura.porciva
                   ,factura.porcretencion
                   ,factura.base
                   ,factura.totaliva
                   ,factura.totalretencion
                   ,factura.total
                   ,factura.gastos
                   ,factura.grupos
                   ,req.decoded.idusuario
                   ,factura.escompra
                   ,factura.emisorgasto
                   ,factura.agencia_honorarios_pagado
                   ,factura.agencia_honorarios_fecha
                   ,factura.agencia_honorarios_importe
                   ,factura.agencia_gastos_pagado
                   ,factura.agencia_gastos_fecha
                   ,factura.agencia_gastos_importe
                   ,factura.guia_honorarios_pagado
                   ,factura.guia_honorarios_fecha
                   ,factura.guia_honorarios_importe
                   ,factura.guia_gastos_pagado
                   ,factura.guia_gastos_fecha
                   ,factura.guia_gastos_importe
                   ,factura.tarifa
                   ,factura.recipient
                   ,req.decoded.idultimaempresa
                   ,factura.idfactura
                   ,req.decoded.idusuario];
        }
        Utils.log(statement + ' - ' + params);
        client.query(statement, params, function(err, result) {
          if (err){
            console.log('err:', err);
            console.log('result:', result);
            if(err.code == '23505'){
              Utils.handleError(res, done, err.message, "Error guardando la factura. Ya existe una factura con ese número. ");
            }
            else{
              Utils.handleError(res, done, err.message, "Error guardando la factura.");
            }
          }
          else{
            //Por seguridad, si no se ha actualiado la factura, vaciamos las líneas para que no se actue sobre ellas
            if(result.rowCount < 1){
              factura.lineas = [];
            }
            if(factura.idfactura == 0){
              factura.idfactura = result.rows[0].idfactura;
            }
            //borrar líneas de facturas que no estén en factura.lineas
            var listId = [];
            for (var i = 0; i < factura.lineas.length; i++) {
              if(factura.lineas[i].idlinea > 0){
                listId.push(factura.lineas[i].idlinea);
              }
            }
            statement = 'DELETE FROM gt_lineafactura WHERE idempresa = $1 AND idfactura = $2 AND NOT idlinea = ANY($3::int[])';
            params = [req.decoded.idultimaempresa, factura.idfactura, listId];
            Utils.log(statement + ' - ' + params);
            client.query(statement, params, function(err, result) {
              if (err){
                Utils.handleError(res, done, err.message, "Error delete gt_lineafactura.");
              }
              else{
                if(factura.lineas && factura.lineas.length > 0){
                  for (var i = 0; i < factura.lineas.length; i++) {
                    factura.lineas[i].idfactura = factura.idfactura;
                    if(!factura.lineas[i].idlinea || factura.lineas[i].idlinea == 0){
                      statement = 'INSERT INTO gt_lineafactura (idempresa, idfactura, numlinea, descripcion, cantidad, precio, total, porciva, totaliva, observaciones, isgasto, imprimir, idgrupo, idusuario) '+
                                  '                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)';
                      params = [req.decoded.idultimaempresa
                               ,factura.lineas[i].idfactura
                               ,factura.lineas[i].numlinea
                               ,factura.lineas[i].descripcion
                               ,factura.lineas[i].cantidad
                               ,factura.lineas[i].precio
                               ,factura.lineas[i].total
                               ,factura.lineas[i].porciva
                               ,factura.lineas[i].totaliva
                               ,factura.lineas[i].observaciones
                               ,factura.lineas[i].isgasto
                               ,factura.lineas[i].imprimir
                               ,factura.lineas[i].idgrupo || 0
                               ,req.decoded.idusuario];
                    }
                    else{
                      statement = 'UPDATE gt_lineafactura SET numlinea = $1, descripcion = $2, cantidad = $3, precio = $4, total = $5, porciva = $6, totaliva = $7, observaciones = $8, isgasto = $9, imprimir = $10, idgrupo = $11, idusuario  = $12'+
                                  ' WHERE idempresa = $13' +
                                  '   AND idfactura = $14' +
                                  '   AND idlinea   = $15';
                      params = [factura.lineas[i].numlinea
                               ,factura.lineas[i].descripcion
                               ,factura.lineas[i].cantidad
                               ,factura.lineas[i].precio
                               ,factura.lineas[i].total
                               ,factura.lineas[i].porciva
                               ,factura.lineas[i].totaliva
                               ,factura.lineas[i].observaciones
                               ,factura.lineas[i].isgasto
                               ,factura.lineas[i].imprimir
                               ,factura.lineas[i].idgrupo
                               ,req.decoded.idusuario
                               ,req.decoded.idultimaempresa
                               ,factura.lineas[i].idfactura
                               ,factura.lineas[i].idlinea];
                    }
                    var contUpsert = 0;
                    Utils.log(statement + ' - ' + params);
                    client.query(statement, params, function(err, result) {
                      if (err){
                        Utils.handleError(res, done, err.message, "Error upsert gt_lineafactura.");
                      }
                      else{
                        contUpsert++;
                        if(contUpsert >= factura.lineas.length){
                          done();
                          res.status(200).json(factura.idfactura);
                        }
                      }
                    });
                  }
                }
                else{
                  done();
                  res.status(200).json(factura.idfactura);
                }
              }
            });
          }
        });
      }
    }
  });
})

facturaRouter.route('/filter')
.put(Verify.verifyRead, function(req, res) {
  console.log('#############################');
  console.log('buscaFacturas:', req.body.filtro);
  console.log('#############################');
  Utils.pool.connect(function(err, client, done) {
    if(err){
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var st = Utils.getFacturasStatement(req.decoded.idultimaempresa, req.decoded.idusuario, req.decoded.rol, req.body.filtro, req.headers['client-timezone']);
      Utils.log(st.statement + ' - ' + st.params);
      client.query(st.statement, st.params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Error getting facturas.");
        }
        else{
          done();
          var total = 0;
          for (var i = 0; i < result.rows.length; i++) {
            result.rows[i].total = parseFloat(result.rows[i].total);
            result.rows[i].total = roundAt2(result.rows[i].total);
            result.rows[i].gastos = parseFloat(result.rows[i].gastos);
            result.rows[i].gastos = roundAt2(result.rows[i].gastos);
            total += parseFloat(result.rows[i].total);
          }
          res.status(200).json({facturas: result.rows, total: total});
        }
      });
    }
  });
})

facturaRouter.route('/nextnumero')
.put(Verify.verifyRead, function(req, res) {
  console.log('#############################');
  console.log('idusuarioemisor:', req.body.idusuarioemisor);
  console.log('tipofactura    :', req.body.tipofactura);
  console.log('anio           :', req.body.anio);
  console.log('escompra       :', req.body.escompra);
  console.log('#############################');
  Utils.pool.connect(function(err, client, done) {
    if(err){
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var statement = getNextFacturaStatement();
      var params = [req.decoded.idultimaempresa, req.body.idusuarioemisor, req.body.tipofactura, req.body.anio, req.body.escompra];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Error getting nextnumero.");
        }
        else{
          done();
          console.log('nextnumero:',result.rows);
          res.status(200).json(result.rows[0].numero);
        }
      });
    }
  });
})

facturaRouter.route('/generateFactura')
.put(Verify.verifyRead, Verify.verifyWrite, function(req, res) {
  console.log('grupos a facturar:', req.body.grupos);
  Utils.pool.connect(function(err, client, done) {
    if(err){
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      factura = {};
      var statement = 'SELECT CASE WHEN festivos.fecha IS NULL THEN false ELSE true END esfestivo, extract(dow from fechahora) dayofweek, p.irpf, A.*,' +
                      '       TO_CHAR(fechahora AT TIME ZONE $4,\'DD-MM-YYYY\') fechaed, jsontipovisita, eu.facturadefaulttext' +
                      '  FROM gt_grupo A' +
                      '  LEFT OUTER JOIN (SELECT TO_CHAR(fecha AT TIME ZONE $4,\'YYYYMMDD\') fecha FROM gt_fecha WHERE idempresa = $1 AND festivo is true) festivos ON TO_CHAR(fechahora AT TIME ZONE $4,\'YYYYMMDD\') = festivos.fecha' +
                      '  LEFT OUTER JOIN gt_pdu p ON p.idempresa = a.idempresa AND p.tabla = \'guia\' AND p.idusuarioapp = $3' +
                      '  LEFT OUTER JOIN (' +
                      '    SELECT JSON_AGG(JSON_BUILD_OBJECT(\'codigo\',p2.codigo,\'descripcion\',p2.nombre)) jsontipovisita' +
                      '      FROM gt_grupo g' +
                      '      LEFT OUTER JOIN gt_pdu p2 ON p2.idempresa = g.idempresa AND p2.tabla = \'tipovisita\' AND p2.codigo = ANY (g.tipovisita)' +
                      '     WHERE g.idempresa = $1 AND g.idgrupo = ANY($2)) jsontipovisita ON true' +
                      '      ,gt_empresausuario eu' +
                      ' WHERE a.idempresa = $1 AND idgrupo = ANY($2) AND a.idempresa = eu.idempresa AND eu.idusuario = $3';
      var params = [req.decoded.idultimaempresa, req.body.grupos, req.decoded.idusuario, req.headers['client-timezone']];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
        Utils.handleError(res, done, err.message, "Error generateFactura insert factura.");
        }
        else{
          if(result.rowCount > 0){
            console.log('result.rows[0]:', result.rows[0]);
            var grupos = result.rows;
            factura.tipofactura = grupos[0].tipofactura;
            factura.porciva = 21; //TO-DO: parametrizar % iva a nivel de gt_empresa
            factura.porcretencion = parseFloat(grupos[0].irpf);
            factura.esgrupofestivo = result.rows[0].esfestivo;
            factura.observaciones = result.rows[0].facturadefaulttext;
            if(grupos[0].tipofactura == 'D'){
              factura.porciva = 0;
              factura.porcretencion = 0;
            }
            var lineasFactura = [];
            var referencia = "";
            for (var i = 0; i < result.rows.length; i++) {
              lineasFactura.push({tipovisita : result.rows[i].jsontipovisita,
                                  pax: result.rows[i].pax,
                                  esfestivo: result.rows[i].esfestivo,
                                  dayofweek: result.rows[i].dayofweek,
                                  grupofecha: result.rows[i].fechaed,
                                  cantidadConvenida: result.rows[i].importe,
                                  entradasincluidas: result.rows[i].entradasincluidas,
                                  monumentos: result.rows[i].monumentos,
                                  porciva: factura.porciva,
                                  porcretencion: factura.porcretencion,
                                  idgrupo: result.rows[i].idgrupo,
                                  //grupo: result.rows[i].agencia + '/' + result.rows[i].ref + '/' + result.rows[i].fechaed})
                                  grupo: result.rows[i].agencia})
              if((result.rows[i].dayofweek == 6) || (result.rows[i].dayofweek == 0)){
                //sabados y domingos:
                lineasFactura[lineasFactura.length-1].esfestivo = true;
              }
              if(referencia == ''){
                referencia += result.rows[i].ref;
              }
              else{
                referencia = referencia + ', ' + result.rows[i].ref;
              }
            }
            factura.referencia = referencia;
            //Obtener la agencia asociada al grupo:
            statement = 'SELECT b.identificacion, b.nombre, b.direccion, b.localidad, b.codigopostal, b.provincia, b.pais,' +
                        '       b.tel1, b.email, a.tarifa, tarifa.*,' +
                        '       CASE WHEN a.codigo = b.codigo THEN a.descuento ELSE a.descuentoita END descuento' +
                        '  FROM gt_pdu a' +
                        '  LEFT OUTER JOIN (SELECT * FROM gt_tarifa WHERE idempresa = $1) tarifa ON a.tarifa = tarifa.codigo' +
                        '  , gt_pdu b' +
                        ' WHERE a.idempresa = $1 AND a.tabla = \'agencia\' and a.codigo = $2' +
                        '   AND b.idempresa = $1 AND b.tabla = \'agencia\' and b.codigo =' +
                        '       (SELECT CASE WHEN factpormatriz THEN $3 ELSE codigo END FROM GT_PDU WHERE idempresa = $1 AND TABLA = \'agencia\' AND codigo = $2)';
            var receptorFactura = req.decoded.companyname;
            if(req.decoded.companyname.toUpperCase() == req.decoded.nombre.toUpperCase()){
              // para que la matriz no se facture a si misma
              receptorFactura = grupos[0].agencia;
            }
            params = [req.decoded.idultimaempresa, grupos[0].agencia, receptorFactura];
            Utils.log(statement + ' - ' + params);
            client.query(statement, params, function(err, result) {
              if (err){
                Utils.handleError(res, done, err.message, "Error generateFactura select agencia.");
              }
              else{
                if(result.rowCount > 0){
                  factura.identificacion = result.rows[0].identificacion;
                  factura.nombre = result.rows[0].nombre;
                  factura.direccion = result.rows[0].direccion;
                  factura.poblacion = result.rows[0].localidad;
                  factura.provincia = result.rows[0].provincia;
                  factura.pais = result.rows[0].pais;
                  factura.codigopostal = result.rows[0].codigopostal;
                  factura.descuento = result.rows[0].descuento;
                  factura.recipient = result.rows[0].email;
                  //console.log('tarifa:',result.rows[0].codigo);
                  if(!result.rows[0].codigo || result.rows[0].codigo == ''){
                    var message = 'La agencia ' + grupos[0].agencia + ' no tiene una tarifa asociada.';
                    Utils.handleError(res, done, "Asígnale una antes de facturar.", message, 400);
                  }
                  else{
                    factura.tarifa = result.rows[0].codigo;
                    //console.log('precios:', result.rows[0].precios);
                    for (var i = 0; i < lineasFactura.length; i++) {
                      lineasFactura[i].tarifa = result.rows[0].precios;
                    }
                    statement = getNextFacturaStatement();
                    params = [req.decoded.idultimaempresa, req.decoded.idusuario, grupos[0].tipofactura, new Date().getFullYear(), false];
                    Utils.log(statement + ' - ' + params);
                    client.query(statement, params, function(err, result) {
                      if (err){
                        Utils.handleError(res, done, err.message, "Error generateFactura select numero factura.");
                      }
                      else{
                        factura.numero = result.rows[0].numero;
                        console.log('grupos a facturar:' + req.body.grupos + '. Número: ' + result.rows[0].numero);
                        statement = 'INSERT INTO gt_factura (idempresa, idusuarioemisor, tipofactura, numero, fecha,' +
                                    '                        referencia, identificacion, nombre, direccion, poblacion,' +
                                    '                        provincia, pais, codigopostal, porciva, porcretencion, tarifa,' +
                                    '                        idusuario, grupos, esgrupofestivo, recipient, observaciones)' +
                                    '                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)' +
                                    '       RETURNING idfactura';
                        params = [req.decoded.idultimaempresa
                                 ,req.decoded.idusuario
                                 ,factura.tipofactura
                                 ,factura.numero
                                 ,new Date()
                                 ,factura.referencia
                                 ,factura.identificacion
                                 ,factura.nombre
                                 ,factura.direccion
                                 ,factura.poblacion
                                 ,factura.provincia
                                 ,factura.pais || ''
                                 ,factura.codigopostal
                                 ,factura.porciva
                                 ,factura.porcretencion
                                 ,factura.tarifa
                                 ,req.decoded.idusuario
                                 ,req.body.grupos
                                 ,factura.esgrupofestivo
                                 ,factura.recipient
                                 ,factura.observaciones || ''];
                        Utils.log(statement + ' - ' + params);
                        client.query(statement, params, function(err, result) {
                          if (err){
                            Utils.handleError(res, done, err.message, "Error insert gt_factura.");
                          }
                          else{
                            var idfactura = result.rows[0].idfactura;
                            //console.log('idfactura:', idfactura);
                            for (var i = 0; i < lineasFactura.length; i++) {
                              lineasFactura[i].idfactura = idfactura;
                            }
                            statement = 'SELECT codigo, precio, descripcion' +
                                        '  FROM gt_monumento M' +
                                        '  LEFT OUTER JOIN gt_grupo G ON M.idempresa = G.idempresa AND M.codigo = ANY(G.monumentos)' +
                                        ' WHERE G.idempresa = $1 AND G.idgrupo = ANY($2)';
                            params = [req.decoded.idultimaempresa, req.body.grupos];
                            Utils.log(statement + ' - ' + params);
                            client.query(statement, params, function(err, result) {
                              if (err){
                                Utils.handleError(res, done, err.message, "Error consultando precios de monumentos.");
                              }
                              else{
                                var lineas = getLineasFactura(lineasFactura, result.rows, factura.descuento);
                                statement = 'UPDATE gt_factura SET totaliva = $1, totalretencion = $2, total = $3, gastos = $4, base = $5 WHERE idempresa = $6 AND idfactura = $7';
                                params = [0, 0, 0, 0, 0, req.decoded.idultimaempresa, idfactura];
                                if(lineas.length > 0){
                                  params = [lineas[0].totalivalineas, lineas[0].totalretencionlineas, lineas[0].totallineas, lineas[0].gastoslineas, lineas[0].base, req.decoded.idultimaempresa, idfactura];
                                }
                                Utils.log(statement + ' - ' + params);
                                client.query(statement, params, function(err, result) {
                                  if (err){
                                    Utils.handleError(res, done, err.message, "Error updating grupos tras generar factura.");
                                  }
                                  else{
                                    var contInsert = 0;
                                    if(lineas.length > 0){
                                      for (var i = 0; i < lineas.length; i++) {
                                        statement = 'INSERT INTO gt_lineafactura (idempresa, idfactura, numlinea, descripcion, cantidad, precio, total, porciva, totaliva, observaciones, isgasto, imprimir, idgrupo, idusuario)' +
                                                    '                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)';
                                        params = [req.decoded.idultimaempresa,
                                                  lineas[i].idfactura,
                                                  lineas[i].numlinea,
                                                  lineas[i].descripcion,
                                                  lineas[i].cantidad,
                                                  lineas[i].precio,
                                                  lineas[i].total,
                                                  lineas[i].porciva,
                                                  lineas[i].totaliva,
                                                  lineas[i].observaciones,
                                                  lineas[i].isgasto,
                                                  lineas[i].imprimir,
                                                  lineas[i].idgrupo || 0,
                                                  req.decoded.idusuario];
                                        Utils.log(statement + ' - ' + params);
                                        client.query(statement, params, function(err, result) {
                                          if (err){
                                            Utils.handleError(res, done, err.message, "Error updating grupos tras generar factura.");
                                          }
                                          else{
                                            contInsert++;
                                            if(contInsert >= lineas.length){
                                              done();
                                              res.status(200).json(idfactura);
                                            }
                                          }
                                        });
                                      }
                                    }
                                    else{
                                      done();
                                      res.status(200).json(idfactura);
                                    }
                                  }
                                });
                              }
                            });
                          }
                        });
                      }
                    });
                  }
                }
                else{
                  var message = 'La agencia ' + grupos[0].agencia + ' no está dada de alta en el sistema.';
                  Utils.handleError(res, done, "Revisar.", message, 400);
                }
              }
            });
          }
          else{
            done();
            res.status(200).json(0);
          }
        }
      });
    }
  });
})

facturaRouter.route('/clonarFactura')
.put(Verify.verifyRead, Verify.verifyWrite, function(req, res) {
  console.log('factura a clonar:', req.body.idfactura);
  Utils.pool.connect(function(err, client, done) {
    if(err){
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var statement = 'SELECT *' +
                      '  FROM gt_factura' +
                      ' WHERE idempresa = $1 AND idfactura = $2';
      var params = [req.decoded.idultimaempresa, req.body.idfactura];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
        Utils.handleError(res, done, err.message, "Error clonarFactura select factura original.");
        }
        else{
          if(result.rowCount > 0){
            statement = 'INSERT INTO gt_factura' +
                        ' (idempresa, idusuarioemisor, tipofactura, numero, referencia, identificacion, nombre, direccion, poblacion, provincia,' +
                        '  codigopostal, pais, estado, fechaestado, observaciones, porciva, porcretencion, base, totaliva, totalretencion, total,' +
                        '  gastos, tarifa, grupos, idusuario, esgrupofestivo, escompra, emisorgasto, fecha)' +
                        ' SELECT f.idempresa, idusuarioemisor, tipofactura, foo.nextnum, referencia, identificacion, nombre, direccion, poblacion, provincia,' +
                        '        codigopostal, pais, estado, fechaestado, observaciones, porciva, porcretencion,' +
                        '        base * -1 base, totaliva * -1 totaliva, totalretencion * -1 totalretencion, total * -1 total, gastos * -1 gastos,' +
                        '        tarifa, grupos, $5, esgrupofestivo, escompra, emisorgasto, fecha' +
                        '  FROM gt_factura f,' +
                        '       (SELECT idempresa, max(coalesce(numero,0))+1 nextnum' +
                        '          FROM gt_factura n' +
                        '         WHERE n.idempresa = $1 AND tipofactura = $3 AND idusuarioemisor = $4 group by idempresa) foo' +
                        ' where f.idempresa = $1 AND idfactura = $2 and f.idempresa = foo.idempresa RETURNING idfactura';
            params = [req.decoded.idultimaempresa, result.rows[0].idfactura, result.rows[0].tipofactura, result.rows[0].idusuarioemisor, req.decoded.idusuario];
            Utils.log(statement + ' - ' + params);
            client.query(statement, params, function(err, result) {
              if (err){
                Utils.handleError(res, done, err.message, "Error generateFactura insert gt_factura.");
              }
              else{
                var idfactura = result.rows[0].idfactura;
                statement = 'INSERT INTO gt_lineafactura' +
                            '(idempresa, idfactura, numlinea, descripcion, cantidad, precio, total, porciva, totaliva, observaciones, isgasto, imprimir, idgrupo, idusuario)' +
                            'SELECT idempresa, $3, numlinea, descripcion, cantidad * -1 cantidad, precio, total * -1 total, porciva, totaliva * -1 totaliva,' +
                            '       observaciones, isgasto, imprimir, idgrupo, $4' +
                            '  FROM gt_lineafactura WHERE idempresa = $1 AND idfactura = $2';
                params = [req.decoded.idultimaempresa, req.body.idfactura, idfactura, req.decoded.idusuario];
                Utils.log(statement + ' - ' + params);
                client.query(statement, params, function(err, result) {
                  if (err){
                    Utils.handleError(res, done, err.message, "Error generateFactura insert gt_lineafactura.");
                  }
                  else{
                    done();
                    res.status(200).json(idfactura);
                  }
                });
              }
            });
          }
          else{
            done();
            res.status(200).json(0);
          }
        }
      });
    }
  });
})

facturaRouter.route('/cobrospagos')
.put(Verify.verifyRead, function(req, res) {
  console.log('#############################');
  console.log('ids  :', req.body.ids);
  console.log('datos:', req.body.datos);
  console.log('#############################');
  Utils.pool.connect(function(err, client, done) {
    if(err){
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var statement = 'UPDATE gt_factura SET' +
                      '       agencia_honorarios_pagado = $4' +
                      '      ,agencia_honorarios_fecha  = $5' +
                      '      ,agencia_gastos_pagado     = $6' +
                      '      ,agencia_gastos_fecha      = $7' +
                      '      ,guia_honorarios_pagado    = $8' +
                      '      ,guia_honorarios_fecha     = $9' +
                      '      ,guia_gastos_pagado        = $10' +
                      '      ,guia_gastos_fecha         = $11' +
                      '      ,idusuario                 = $12' +
                      ' WHERE idempresa = $1 AND idfactura = ANY($2) AND idusuarioemisor = $3';
      var params = [req.decoded.idultimaempresa
                   ,req.body.ids
                   ,req.decoded.idusuario
                   ,req.body.datos.agencia_honorarios_pagado
                   ,req.body.datos.agencia_honorarios_fecha
                   ,req.body.datos.agencia_gastos_pagado
                   ,req.body.datos.agencia_gastos_fecha
                   ,req.body.datos.guia_honorarios_pagado
                   ,req.body.datos.guia_honorarios_fecha
                   ,req.body.datos.guia_gastos_pagado
                   ,req.body.datos.guia_gastos_fecha
                   ,req.decoded.idusuario];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Error updating gt_factura.");
        }
        else{
          done();
          console.log('cobrospagos:',result.rowCount);
          res.status(200).json(result.rowCount);
        }
      });
    }
  });
})

facturaRouter.route('/csv')
// Genera csv con facturas seleccionadas
.put(Verify.verifyRead, Verify.verifyWrite, function(req, res) {
  Utils.pool.connect(function(err, client, done) {
    if(err) {
      //return console.error('error fetching client from pool', err);
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var st = Utils.getFacturasStatement(req.decoded.idultimaempresa, req.decoded.idusuario, req.decoded.rol, req.body.filtro, req.headers['client-timezone']);
      Utils.log(st.statement + ' - ' + st.params);
      client.query(st.statement, st.params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Error getting facturas.");
        }
        else{
          var ids = [];
          for (var i = 0; i < result.rows.length; i++) {
            ids.push(result.rows[i].idfactura);
          }
          var statement = 'SELECT * FROM ( ' +
                          'SELECT distinct on (f.idfactura) f.tipofactura tipo,' +
                          '       (f.numero || \'/\' || TO_CHAR(f.fecha AT TIME ZONE $3, \'YY\')) numero,' +
                          '       TO_CHAR(f.fecha AT TIME ZONE $3, \'YYYY-MM-DD\') fecha,' +
                          //'       b.nombre emisor,' +
                          '       CASE WHEN $4 THEN f.emisorgasto ELSE b.nombre END emisor,' +
                          '       COALESCE(g.guialocal,\'\') guia, g.agencia,' +
                          '       TO_CHAR(g.fechahora AT TIME ZONE $3, \'YYYY-MM-DD\') fechavisita,' +
                          '       f.identificacion, f.nombre receptor, f.referencia,' +
                          '       replace(round(f.base,2)::text, \'.\', \',\') base,' +
                          '       replace(round(f.totaliva,2)::text, \'.\', \',\') iva,' +
                          '       replace(round(f.totalretencion,2)::text, \'.\', \',\') retencion,' +
                          '       replace(round(f.total,2)::text, \'.\', \',\') total,' +
                          '       replace(round(f.gastos,2)::text, \'.\', \',\') gastos,' +
                          '       CASE WHEN f2.total IS NULL THEN \'NF\' ELSE replace(round(f2.total + f2.gastos,2)::text, \'.\', \',\') END totalvinculada,' +
                          '       TO_CHAR(f.fecha AT TIME ZONE $3, \'YY\') anio, f.numero num' +
                          '  FROM gt_factura f' +
                          '       LEFT OUTER JOIN gt_grupo g ON g.idempresa = f.idempresa AND g.idgrupo = f.grupos[1]' +
                          '       LEFT OUTER JOIN gt_factura f2 ON f2.idempresa = f.idempresa AND f2.idfactura <> f.idfactura AND f2.grupos = f.grupos' +
                          '      ,gt_usuario b' +
                          ' WHERE f.idempresa = $1 AND f.idfactura = ANY($2)' +
                          '   AND f.idusuarioemisor = b.idusuario' +
                          ' ORDER BY f.idfactura' +
                          ' ) foo ORDER BY foo.anio DESC, foo.num DESC';
          var params = [req.decoded.idultimaempresa, ids, req.headers['client-timezone'], req.body.filtro.escompra || false];
          Utils.log(statement + ' - ' + params);
          client.query(statement, params, function(err, result) {
            if (err){
              Utils.handleError(res, done, err.message, "Error al generar csv facturas (select).");
            }
            else{
              done();
              for (var i = 0; i < result.rows.length; i++) {
                result.rows[i].numero = '\'' + result.rows[i].numero;
              }
              var fields = ['tipo', 'numero', 'fecha', 'emisor', 'guia', 'agencia', 'fechavisita', 'identificacion', 'receptor', 'referencia', 'base', 'iva', 'retencion', 'total', 'gastos', 'totalvinculada', 'anio', 'num'];
              json2csv({ data: result.rows, fields: fields, del: ';' }, function(err, csv) {
                if (err){
                  Utils.handleError(res, done, err.message, "Error al generar csv facturas (json2csv).");
                }
                else{
                  console.log('result.rows:', result.rows);
                  res.status(200).json(csv);
                }
              });
            }
          });
        }
      });
    }
  });
})

facturaRouter.route('/:id')
.get(Verify.verifyRead, function(req, res) {
  Utils.pool.connect(function(err, client, done) {
    if(err){
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var statement = 'SELECT f.*, u.nombre modificadopor,' +
                      '       coalesce(t.monumentolaborable,0) monumentolaborable, coalesce(t.monumentofestivo,0) monumentofestivo,' +
                      '       coalesce(t.horalaborable,0) horalaborable, coalesce(t.horafestivo,0) horafestivo,' +
                      '       coalesce(t.idiomalaborable,0) idiomalaborable, coalesce(t.idiomafestivo,0) idiomafestivo' +
                      '  FROM gt_factura f' +
                      '       LEFT OUTER JOIN gt_tarifa t ON t.idempresa = f.idempresa AND t.codigo = f.tarifa' +
                      '     , gt_usuario u' +
                      ' WHERE f.idempresa = $1 AND f.idfactura = $2 AND f.idusuario = u.idusuario';
      if(req.decoded.rol < Utils.ROL_BOSS){
        statement +=  '   AND (f.idusuarioemisor = $3 OR f.idusuarioemisor = $4 OR f.escompra = true)';
      }
      else{
        statement +=  '   AND f.fechamodificacion::text <> $3::text AND f.fechamodificacion::text <> $4::text'; //para que e verifique siempre
      }
      var params = [req.decoded.idultimaempresa, req.params.id, req.decoded.idusuario, 103]; //TO-DO: 103 es ITA, parametrizar
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Error getting gt_factura.");
        }
        else{
          var factura = null;
          if(result.rowCount > 0){
            factura = result.rows[0];
            factura.porciva = parseFloat(factura.porciva);
            factura.porcretencion = parseFloat(factura.porcretencion);
            factura.base = parseFloat(factura.base);
            factura.totaliva = parseFloat(factura.totaliva);
            factura.totalretencion = parseFloat(factura.totalretencion);
            factura.total = parseFloat(factura.total);
            factura.gastos = parseFloat(factura.gastos);
            factura.monumentolaborable = parseFloat(factura.monumentolaborable);
            factura.monumentofestivo = parseFloat(factura.monumentofestivo);
            factura.horalaborable = parseFloat(factura.horalaborable);
            factura.horafestivo = parseFloat(factura.horafestivo);
            factura.idiomalaborable = parseFloat(factura.idiomalaborable);
            factura.idiomafestivo = parseFloat(factura.idiomafestivo);
            factura.agencia_honorarios_importe = parseFloat(factura.agencia_honorarios_importe);
            factura.agencia_gastos_importe = parseFloat(factura.agencia_gastos_importe);
            factura.guia_honorarios_importe = parseFloat(factura.guia_honorarios_importe);
            factura.guia_gastos_importe = parseFloat(factura.guia_gastos_importe);
            var statement = 'SELECT * FROM gt_lineafactura WHERE idempresa = $1 AND idfactura = $2';
            var params = [req.decoded.idultimaempresa, req.params.id];
            Utils.log(statement + ' - ' + params);
            client.query(statement, params, function(err, result) {
              if (err){
                Utils.handleError(res, done, err.message, "Error getting gt_lineafactura.");
              }
              else{
                done();
                if(result.rowCount > 0){
                  factura.lineas = result.rows;
                  for (var i = 0; i < factura.lineas.length; i++) {
                    factura.lineas[i].cantidad = parseFloat(factura.lineas[i].cantidad);
                    factura.lineas[i].precio = parseFloat(factura.lineas[i].precio);
                    factura.lineas[i].total = parseFloat(factura.lineas[i].total);
                    factura.lineas[i].porciva = parseFloat(factura.lineas[i].porciva);
                    factura.lineas[i].totaliva = parseFloat(factura.lineas[i].totaliva);
                  }
                }
                else{
                  factura.lineas = [];
                }
                //console.log(factura);
                res.status(200).json(factura);
              }
            });
          }
          else{
            res.status(200).json(factura);
          }
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
      var statement = 'DELETE FROM gt_lineafactura g' +
                      ' WHERE idempresa = $1' +
                      '   AND idfactura = $2' +
                      '   AND idfactura = (SELECT idfactura FROM gt_factura WHERE idempresa = $1 AND idfactura = $2 AND (idusuarioemisor = $3 OR escompra = true))'; //solo borra líneas de facturas que pertenecen al usuario
      var params = [req.decoded.idultimaempresa, req.params.id, req.decoded.idusuario];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Error deleting gt_lineafactura.");
        }
        else{
          statement = 'DELETE FROM gt_factura g WHERE idempresa = $1 AND idfactura = $2 AND (idusuarioemisor = $3 OR escompra = true) RETURNING grupos';
          params = [req.decoded.idultimaempresa, req.params.id, req.decoded.idusuario];
          Utils.log(statement + ' - ' + params);
          client.query(statement, params, function(err, result) {
            if (err){
              Utils.handleError(res, done, err.message, "Error deleting gt_factura.");
            }
            else{
              done();
              res.status(200).json(result);
            }
          });
        }
      });
    }
  });
})

function getLineasFactura(lf, preciosMonumentos, descuento){
  //console.log('getLineasFactura.lf:', lf);
  //console.log('getLineasFactura.preciosMonumentos:', preciosMonumentos);
  //console.log('getLineasFactura.descuento:', descuento);
  var lineas = [];

  for (var z = 0; z < lf.length; z++) {
    if(!lf[z].tipovisita){ lf[z].tipovisita = []; }
    if(!lf[z].tarifa)    { lf[z].tarifa     = []; }

    if(lf[z].cantidadConvenida != 0){
      lineas.push({idfactura: lf[z].idfactura, numlinea: lineas.length + 1, descripcion: '', cantidad: 1, precio: 0, total:0, porciva: lf[z].porciva, totaliva: 0, observaciones: '', isgasto: false, imprimir: true, idgrupo: lf[z].idgrupo});
      var index = lineas.length - 1;
      lineas[index].precio = lf[z].cantidadConvenida;
      lineas[index].descripcion = 'CANTIDAD CONVENIDA (' + lf[z].grupo + ' / ' + lf[z].grupofecha + ')';
      lineas[index].total = lineas[index].cantidad * lineas[index].precio;
      lineas[index].total = roundAt2(lineas[index].total);
      lineas[index].totaliva = lineas[index].total * lineas[index].porciva / 100;
      lineas[index].totaliva = roundAt2(lineas[index].totaliva);
    }
    else{
      for (var j = 0; j < lf[z].tipovisita.length; j++) {
        lineas.push({idfactura: lf[z].idfactura, numlinea: lineas.length + 1, descripcion: '(' + lf[z].grupo + ' / ' + lf[z].grupofecha + ')', cantidad: 1, precio: 0, total:0, porciva: lf[z].porciva, totaliva: 0, observaciones: '', isgasto: false, imprimir: true, idgrupo: lf[z].idgrupo});
        var index = lineas.length - 1;
        for (var i = 0; i < lf[z].tarifa.length; i++) {
          if (
              (lf[z].tarifa[i].tipovisita == lf[z].tipovisita[j].codigo) &&
              (lf[z].tarifa[i].paxdesde <= lf[z].pax) &&
              (lf[z].tarifa[i].paxhasta >= lf[z].pax)
              ){
            if(lf[z].esfestivo){
              lineas[index].precio = lf[z].tarifa[i].festivo;
              //lineas[index].descripcion = 'TIPO VISITA: ' + lf[z].tipovisita[j] + '. PAX: ' + lf[z].pax + '. DÍA FESTIVO.' + ' (' + lf[z].grupo + ' / ' + lf[z].grupofecha +')';
              lineas[index].descripcion = lf[z].tipovisita[j].descripcion + '. DÍA FESTIVO.' + ' (' + lf[z].grupo + ' / ' + lf[z].grupofecha + ')';
            }
            else{
              lineas[index].precio = lf[z].tarifa[i].laborable;
              lineas[index].descripcion = lf[z].tipovisita[j].descripcion + '. DÍA LABORABLE.' + ' (' + lf[z].grupo + ' / ' + lf[z].grupofecha + ')';
            }
          }
        }
        lineas[index].total = lineas[index].cantidad * lineas[index].precio;
        lineas[index].total = roundAt2(lineas[index].total);
        lineas[index].totaliva = lineas[index].total * lineas[index].porciva / 100;
        lineas[index].totaliva = roundAt2(lineas[index].totaliva);
      }
    }

    if(lf[z].entradasincluidas){
      for (var i = 0; i < lf[z].monumentos.length; i++) {
        lineas.push({idfactura: lf[z].idfactura, numlinea: lineas.length + 1, descripcion: '', cantidad: 1, precio: 0, total:0, porciva: lf[z].porciva, totaliva: 0, observaciones: '', isgasto: false, imprimir: true, idgrupo: lf[z].idgrupo});
        var index = lineas.length - 1;
        lineas[index].cantidad = lf[z].pax;
        lineas[index].precio = 0;
        for (var j = 0; j < preciosMonumentos.length; j++) {
          if(lf[z].monumentos[i] == preciosMonumentos[j].codigo){
            lineas[index].precio = preciosMonumentos[j].precio;
            break;
          }
        }
        //lineas[index].descripcion = 'ENTRADAS ' + lf[z].monumentos[i] + ' (' + lf[z].grupo + ')';
        lineas[index].descripcion = 'ENTRADAS ' + preciosMonumentos[j].descripcion + ' (' + lf[z].grupo + ' / ' + lf[z].grupofecha + ')';
        lineas[index].total = lineas[index].cantidad * lineas[index].precio;
        lineas[index].total = roundAt2(lineas[index].total);
        lineas[index].totaliva = lineas[index].total * lineas[index].porciva / 100;
        lineas[index].totaliva = roundAt2(lineas[index].totaliva);
        lineas[index].isgasto = true;
      }
    }
  }

  if(descuento != 0 && lineas.length > 0){
    var base = 0;
    for (var i = 0; i < lineas.length; i++) {
      if(!lineas[i].isgasto){
        base += lineas[i].total;
      }
    }
    var lineaDcto = {idfactura: lineas[0].idfactura, numlinea: lineas.length + 1, cantidad: 1, porciva: lineas[0].porciva, observaciones: '', isgasto: false, imprimir: true};
    lineaDcto.descripcion = 'DESCUENTO ' + descuento + '%';
    lineaDcto.precio = base * descuento / -100;
    lineaDcto.precio = roundAt2(lineaDcto.precio);
    //console.log('procesando descuento ' + descuento + ' sobre ' +  base + ' = ' + lineaDcto.precio);
    lineaDcto.total = lineaDcto.precio;
    lineaDcto.totaliva = lineaDcto.total * lineaDcto.porciva / 100;
    lineaDcto.totaliva = roundAt2(lineaDcto.totaliva);
    lineas.push(lineaDcto);
  }

  if(lineas.length > 0){
    lineas[0].totalivalineas = 0;
    lineas[0].totalretencionlineas = 0;
    lineas[0].base = 0;
    lineas[0].gastoslineas = 0;
    for (var i = 0; i < lineas.length; i++) {
      if(lineas[i].isgasto){
        lineas[0].gastoslineas += lineas[i].total;
      }
      else{
        lineas[0].totalivalineas += lineas[i].totaliva;
        lineas[0].base += lineas[i].total;
      }
    }
    lineas[0].totalretencionlineas = lineas[0].base * lf[0].porcretencion / 100;
    lineas[0].totalretencionlineas = roundAt2(lineas[0].totalretencionlineas);
    lineas[0].totallineas = lineas[0].base + lineas[0].totalivalineas - lineas[0].totalretencionlineas;
    lineas[0].totallineas = roundAt2(lineas[0].totallineas);
  }

  //console.log('lineasFactura:',lineas);
  return lineas;
}

function roundAt2(num){
  //console.log('roundAt2:' + num + '_' + Math.round((num + Number.EPSILON) * 100) / 100);
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

function getNextFacturaStatement(){
  return  'SELECT (coalesce(MAX(numero),0) + 1) numero' +
          '  FROM gt_factura' +
          ' WHERE idempresa       = $1' +
          '   AND idusuarioemisor = $2' +
          '   AND tipofactura     = $3' +
          '   AND to_char(fecha,\'YYYY\') = $4' +
          '   AND escompra = $5';
}

;

module.exports= facturaRouter;