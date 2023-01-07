// Generate a document's pdf

var Utils = require('../utils');

//Genera pdf de una factura
exports.printFactura = function (client, idempresa, idsToPrint, isproforma, clienttimezone, cb) {
  var idfactura = idsToPrint[0];
  console.log('####################printFactura:', idsToPrint);
  var fCabecera = [];
  var fFactura = [];
  var fLineas = [];
  var fTotales = [];
  var fGastos = [];
  var fTotalesGastos = [];
  var fPie = [];

  for (var i = 0; i < idsToPrint.length; i++) {
    getCabecera(client, idempresa, idsToPrint[i], function (err, idfactura, cabecera, footerText){
      if (err){
        cb(err,null);
      }
      else{
        fCabecera.push(cabecera);
        getFactura(client, idempresa, idfactura, isproforma, clienttimezone, function (err, idfactura, factura){
          if (err){
            cb(err,null);
          }
          else{
            fFactura.push(factura);
            getLineasFactura(client, idempresa, idfactura, clienttimezone, function (err, idfactura, lineas, totales, gastos, totalesgastos){
              if(err){
                cb(err,null);
              }
              else{
                fLineas.push(lineas);
                fGastos.push(gastos);
                fTotales.push(totales);
                fTotalesGastos.push(totalesgastos);
                //getTotalFactura(client, idempresa, idfactura, clienttimezone, function (err, idfactura, total){
                //  if(err){
                //    cb(err,null);
                //  }
                //  else{
                    //fTotales = total;
                    getPie(client, idempresa, idfactura, function (err, pie){
                      if(err){
                        cb(err,null);
                      }
                      else{
                        fPie.push(pie);
                        //var pdfDoc = getPdf(fCabecera, fFactura, fLineas, fTotales, fGastos, fTotalesGastos, fPie, 'portrait', footerText);
                        //cb(null,pdfDoc);
                        console.log('Checking if all docs have been generated:' + fPie.length + '/' + idsToPrint.length);
                        if(fPie.length >= idsToPrint.length){
                          var pdfDoc = getPdf2(fCabecera, fFactura, fLineas, fTotales, fGastos, fTotalesGastos, fPie, 'portrait', footerText);
                          cb(null,pdfDoc);
                        }
                      }
                    })
                  //}
                //})
              }
            })
          }
        })
      }
    })
  }
}

function getCabecera(client, idempresa, idfactura, cb){
  var statement = 'SELECT p1.*, coalesce(p2.nombre,\'\') descprovincia, e.idprofilepicture,' +
                  '       e.nombrecompleto || \'. \' || e.direccion || \' \' || e.codigopostal || \' \' || e.provincia || \'. \' || e.telefono || \' \' || e.email || \' \' footertext' +
                  '  FROM gt_empresa e, gt_factura f' +
                  '  LEFT OUTER JOIN gt_pdu p1 ON p1.idempresa = f.idempresa AND p1.tabla = \'guia\' AND f.idusuarioemisor = p1.idusuarioapp' +
                  '  LEFT OUTER JOIN gt_pdu p2 ON p2.idempresa = f.idempresa AND p2.tabla = \'provincia\' AND p2.codigo = p1.provincia '+
                  ' WHERE f.idempresa   = $1' +
                  '   AND f.idfactura   = $2' +
                  '   AND f.idempresa   = e.idempresa';
  var params = [idempresa, idfactura];
  Utils.log(statement + ' - ' + params);
  client.query(statement, params, function(err, result) {
    if(err){
      cb(err, null, null, null);
    }
    else{
      if(result.rowCount > 0){
        var emp = result.rows[0];
        var logo = './images/' + emp.idprofilepicture + '.jpg';
        var contacto = '\n' + emp.nombre + '\n' +
                      'CIF: ' + emp.identificacion+ '\n' +
                      emp.direccion + ' - ' + emp.codigopostal + '\n' +
                      emp.localidad + ' (' + emp.descprovincia + ') ' + emp.pais + '\n' +
                      emp.email + '\n' + emp.tel1;
        var fiscal = emp.direccion + ' - ' + emp.codigopostal + ' - ' + emp.localidad + ' (' + emp.provincia + ') - CIF: ' + emp.identificacion;
        var cabecera =  {
                          table: {
                            widths: ['*', 150],
                            body: [
                              [{image: logo, width: 200}, { text: contacto, alignment: 'right' }],
                              //[{ text: emp.nombre, alignment: 'left', style: 'footprint'}, ''],
                              //[{ text: fiscal, alignment: 'left', style: 'footprint'}, '']
                            ]
                          },
                          layout: 'noBorders'
                        };
        cb(null, idfactura, cabecera, result.rows[0].footertext);
      }
      else{
        cb(null, idfactura, '', '');
      }
    }
  });
}

function getFactura(client, idempresa, idfactura, isproforma, clienttimezone, cb){
  console.log('getFactura.idfactura:', idfactura);
  console.log('getFactura.isproforma:', isproforma);
  var statement = 'SELECT f.*, coalesce(p1.nombre,\'\') descprovincia,' +
                  '       TO_CHAR(fecha,\'YYYY\') facyear, TO_CHAR(fecha AT TIME ZONE $3,\'DD-MM-YYYY\') facfecha,' +
                  '       coalesce(g.pax,0) pax, g.idiomas idiomas' +
                  '  FROM gt_factura f' +
                  '       LEFT OUTER JOIN gt_pdu p1 ON p1.idempresa = f.idempresa AND p1.tabla = \'provincia\' AND p1.codigo = f.provincia '+
                  '       LEFT OUTER JOIN gt_grupo g ON g.idempresa = f.idempresa AND g.idgrupo = ANY (f.grupos::int[])' +
                  ' WHERE f.idempresa = $1' +
                  '   AND f.idfactura = $2';
  var params = [idempresa, idfactura, clienttimezone];
  Utils.log(statement + ' - ' + params);
  client.query(statement, params, function(err, result) {
    if(err){
      cb(err, null, null);
    }
    else{
      console.log('getFactura', result.rowCount);
      if(result.rowCount > 0){
        var miFactura = result.rows[0];
        statement = 'SELECT nombre FROM gt_pdu WHERE idempresa = $1 AND tabla = $2 AND codigo = ANY($3)';
        params = [idempresa, 'idioma', result.rows[0].idiomas];
        Utils.log(statement + ' - ' + params);
        client.query(statement, params, function(err, result) {
          if(err){
            cb(err, null, null);
          }
          else{
            miFactura.idiomas = [];
            for (var i = 0; i < result.rows.length; i++) {
              miFactura.idiomas.push(result.rows[i].nombre);
            }
            var nombreEmisor = miFactura.idusuarioemisor;
            var factura =  {
                              table: {
                                widths: ['15%', '30%', '55%'],
                                body: [
                                    [{ text: (isproforma ? 'FACTURA' : (miFactura.escompra ? 'GAS. NUM:' : 'FAC. NUM:')),  alignment: 'left' },
                                     { text: (isproforma ? 'PROFORMA' : miFactura.numero + ' / ' + miFactura.facyear) },
                                     { text: miFactura.nombre }
                                    ],
                                    [{ text: 'FECHA:',  alignment: 'left' },
                                     { text: miFactura.facfecha },
                                     { text: miFactura.direccion }
                                    ],
                                    [{ text: (miFactura.escompra ? ' ' : 'REFERENCIA:'),  alignment: 'left' },
                                     { text: (miFactura.escompra ? ' ' : miFactura.referencia) },
                                     { text: miFactura.poblacion }
                                    ],
                                    [{ text: (miFactura.escompra ? ' ' : 'NUM.PAX:'),  alignment: 'left' },
                                     { text: (miFactura.escompra ? ' ' : miFactura.pax) },
                                     { text: miFactura.codigopostal + ' (' + miFactura.descprovincia + ') ' + miFactura.pais }
                                    ],
                                    [{ text: (miFactura.escompra ? ' ' : 'IDIOMAS:'),  alignment: 'left' },
                                     { text: (miFactura.escompra ? ' ' : miFactura.idiomas.join(", ")) },
                                     { text: 'CIF/NIF: ' + miFactura.identificacion }
                                    ]
                                ]
                              },
                              layout: 'noBorders'
                            };
            cb(null, idfactura, factura);
          }
        });
      }
      else{
        cb(null, idfactura, '');
      }
    }
  });
}

function getLineasFactura(client, idempresa, idfactura, clienttimezone, cb){
  var statement =
              '   SELECT *, to_char(f.base,\'999,990.99\') baseed, to_char(f.totaliva,\'999,990.99\') totalivaed,' +
              '             to_char(f.totalretencion,\'999,990.99\') totalretencioned, to_char(f.total,\'999,990.99\') totalfacturaed,' +
              '             to_char(f.gastos,\'999,990.99\') gastosed,' +
              '             to_char(f.total + f.gastos,\'999,990.99\') totalmasgastosed,' +
              '             to_char(l.precio,\'999,990.99\') precioed, to_char(l.total,\'999,990.99\') totaled,' +
              '             f.observaciones factobservaciones, l.observaciones lineaobservaciones,' +
              '             coalesce(g.idgrupo,0) grupoid,' +
              '             coalesce(g.pax,0) grupopax,' +
              '             coalesce(p1.nombre,\'\') grupoagencia,' +
              '             to_char(g.fechahora AT TIME ZONE $3,\'DD-MM-YYYY\') grupofecha,' +
              '             to_char(f.fecha AT TIME ZONE $3,\'DD-MM-YYYY\') facturafecha' +
              '     FROM gt_factura f, gt_lineafactura l' +
              '     LEFT OUTER JOIN gt_grupo g ON g.idempresa = l.idempresa AND g.idgrupo = l.idgrupo' +
              '     LEFT OUTER JOIN gt_pdu p1   ON p1.idempresa = l.idempresa AND p1.tabla = \'agencia\' AND p1.codigo = g.agencia' +
              '    WHERE f.idempresa = $1' +
              '      AND f.idfactura = $2' +
              '      AND f.idempresa = l.idempresa' +
              '      AND f.idfactura = l.idfactura' +
              '      AND l.imprimir = true' +
              '     ORDER BY l.isgasto, l.numlinea';
  var params = [idempresa, idfactura, clienttimezone];
  Utils.log(statement + ' - ' + params);
  client.query(statement, params, function(err, result) {
    if(err || result.rowCount == 0){
      cb(err, null, null, null, null, null);
    }
    else{
      var lineas = [];
      var gastos = [];
      var cabeceraLinea = [ ' ', //'L',
                            (result.rows[0].escompra ? 'DESCRIPCIÓN' : 'TIPO DE VISITA'),
                            (result.rows[0].escompra ? ' ' : 'FECHA VISITA'),
                            { text: (result.rows[0].escompra ? 'CANT.' : ' '),  alignment: 'right' },
                            { text: 'PRECIO',  alignment: 'right' },
                            { text: 'TOTAL',  alignment: 'right' }];
      lineas.push(cabeceraLinea);
      var contLinea = 1;
      var contGasto = 1;
      for (var i = 0; i < result.rows.length; i++) {
        if(result.rows[i].isgasto){
          if(gastos.length == 0){
            gastos.push([ ' ', 'GASTOS', ' ', ' ', ' ', ' ']);
          }
          var descripcion = result.rows[i].descripcion;
          if(result.rows[i].idgrupo > 0){
            descripcion = descripcion.substr(0,descripcion.indexOf('(')-1);
          }
          gastos.push([ ' ', //contGasto.toString(),
                        //result.rows[i].descripcion,
                        descripcion,
                        ' ',
                       { text: (result.rows[i].cantidad == 1 ? ' ' : result.rows[i].cantidad),  alignment: 'right' },
                       { text: result.rows[i].precioed,  alignment: 'right' },
                       { text: result.rows[i].totaled,  alignment: 'right' }]);
          if(result.rows[i].lineaobservaciones != ''){
            gastos.push([ ' ', 'NOTAS L' + contGasto.toString() + ' : ' + result.rows[i].observaciones, ' ', ' ', ' ', ' ']);
          }
          contGasto++;
        }
        else{
          //var descripcion = result.rows[i].descripcion;
          //if(result.rows[i].idgrupo > 0){
          //  descripcion = 'Grupo ' + result.rows[i].grupoagencia;
          //}
          lineas.push([ ' ', //contLinea.toString(),
                        result.rows[i].descripcion,
                        //descripcion,
                        (result.rows[i].idgrupo > 0 ? result.rows[i].grupofecha : ' '),
                       { text: (result.rows[i].cantidad == 1 ? ' ' : result.rows[i].cantidad),  alignment: 'right' },
                       { text: result.rows[i].precioed,  alignment: 'right' },
                       { text: result.rows[i].totaled,  alignment: 'right' }]);
          if(result.rows[i].lineaobservaciones != ''){
            lineas.push([ ' ', 'NOTAS L' + contLinea.toString() + ' : ' + result.rows[i].lineaobservaciones, ' ', ' ', ' ', ' ']);
          }
          contLinea++;
        }
      }

      var totales = [];
      totales.push([{ text: 'Base:',  alignment: 'right' }     , { text: result.rows[0].baseed + ' €',  alignment: 'right' }]);
      totales.push([{ text: 'Iva (' + result.rows[0].porciva + '%):',  alignment: 'right' }      , { text: result.rows[0].totalivaed + ' €',  alignment: 'right' }]);
      totales.push([{ text: 'Retención (' + result.rows[0].porcretencion + '%):',  alignment: 'right' }, { text: result.rows[0].totalretencioned + ' €',  alignment: 'right' }]);
      totales.push([{ text: 'Total:',  alignment: 'right', style: 'header' }, { text: result.rows[0].totalfacturaed + ' €',  alignment: 'right', style: 'header' }]);

      var totalesGastos = [];
      if(gastos.length > 0){
        totalesGastos.push([{ text: 'Total Gastos:',  alignment: 'right' }, { text: result.rows[0].gastosed + ' €',  alignment: 'right' }]);
      }
      else{
        gastos.push([ ' ', ' ', ' ', ' ', ' ']);
      }

      if(result.rows[0].factobservaciones != ''){
        totalesGastos.push([{ text: ' '}                             , { text: ' ' }]);
        totalesGastos.push([{ text: 'OBSERVACIONES'}                 , { text: ' ' }]);
        totalesGastos.push([{ text: result.rows[0].factobservaciones, bold: true, color: 'red'}, { text: ' ' }]);
      }

      if(totalesGastos.length <= 0){
        if(result.rows[0].escompra){
          totalesGastos.push([' ', { text: ' ',  alignment: 'right' }])
        }
        else{
          totalesGastos.push([' ', { text: 'Factura sin gastos.',  alignment: 'right' }])
        }
      }

      var textTotalAPagar = 'Total a pagar (' + result.rows[0].totalfacturaed.trim() + '€ + ' + result.rows[0].gastosed.trim() + '€):';
      totalesGastos.push([{ text: ' ',  alignment: 'right' }, { text: ' ',  alignment: 'right' }]); //línea en blanco
      totalesGastos.push([{ text: ' ',  alignment: 'right' }, { text: ' ',  alignment: 'right' }]); //línea en blanco
      totalesGastos.push([{ text: 'En Sevilla, a ' + Utils.verboseFecha(result.rows[0].facturafecha),  alignment: 'right' }, { text: ' ',  alignment: 'right' }]);
      if(!result.rows[0].escompra){
        totalesGastos.push([{ text: textTotalAPagar,  alignment: 'right', style: 'header' }, { text: result.rows[0].totalmasgastosed + ' €',  alignment: 'right', style: 'header' }]);
      }

      //console.log('totalesGastos:',totalesGastos);

      var lineWidths = ['2%', '48%', '15%', '10%', '10%', '15%'];
      var totalWidths = ['80%', '20%'];

      var tableLineas = {
                          table: {
                            headerRows: 1,
                            widths: lineWidths,
                            body: lineas
                          },
                          layout: 'lightHorizontalLines'
                        };
      var tableGastos = {
                          table: {
                            headerRows: 1,
                            widths: lineWidths,
                            body: gastos
                          },
                          layout: 'lightHorizontalLines'
                        };
      var tableTotales = {
                          table: {
                            //headerRows: 1,
                            widths: totalWidths,
                            body: totales
                          },
                          layout: 'noBorders'
                        };

      var tableTotalesGastos = {
                          table: {
                            //headerRows: 1,
                            widths: totalWidths,
                            body: totalesGastos
                          },
                          layout: 'noBorders'
                        };

      cb(null, idfactura, tableLineas, tableTotales, tableGastos, tableTotalesGastos);
    }
  })
}

function getTotalFactura(client, idempresa, idfactura, clienttimezone, cb){
  var statement = 'SELECT doc.observaciones, doc.iddocumento, coalesce(p1.descripcion,\'\') pt_provincia, doc.tipodocumento, doc.serie, doc.prontopago,' +
                  '       doc.pt_hasporte, to_char(doc.pt_fecha AT TIME ZONE $5,\'DD-MM-YYYY\') pt_fecha,' +
                  '       doc.pt_horario, doc.pt_direccion, doc.pt_poblacion, doc.pt_codigopostal,' +
                  '       to_char(doc.prontopago,\'990.99%\') prontopagox,' +
                  '       to_char(coalesce(sum(ld.base) ,0),\'999,990.99\') base,' +
                  '       to_char(coalesce(sum(ld.iva)  ,0),\'999,990.99\') iva,' +
                  '       to_char(round(coalesce(sum(-ld.base * doc.retencion / 100 ) ,0),2),\'999,990.99\') retencion,' +
                  '       to_char(total,\'999,990.99\') total,' +
                  '       doc.retencion porcretencion,' +
                  '       to_char(coalesce(sum(cobrado),0),\'999,990.99\') cobrado,' +
                  '       to_char(doc.total - coalesce(sum(cobrado),0),\'999,990.99\') pendiente' +
                  '  FROM documento doc' +
                  '  LEFT OUTER JOIN pdu p1 ON p1.idempresa = doc.idempresa AND p1.tabla = \'provincia\' AND p1.codigo = doc.pt_provincia '+
                  '  LEFT OUTER JOIN' +
                  '      (SELECT in_ld.iddocumento,' +
                  '              SUM(round(cantidad * precio * (1-dcto1/100) * (1-dcto2/100) * (1-dcto3/100) * (1 - prontopago / 100)      ,2)) base,' +
                  '              SUM(round(cantidad * precio * (1-dcto1/100) * (1-dcto2/100) * (1-dcto3/100) * (1 - prontopago / 100) * iva,2)) iva' +
                  '         FROM lineadocumento in_ld, documento in_doc' +
                  '        WHERE in_ld.idempresa   = $1' +
                  '          AND in_ld.idempresa = in_doc.idempresa' +
                  '          AND in_ld.iddocumento = $2' +
                  '          AND in_ld.iddocumento = in_doc.iddocumento' +
                  '        GROUP BY in_ld.iddocumento) ld' +
                  '   ON ld.iddocumento = doc.iddocumento' +
                  '  LEFT OUTER JOIN' +
                  '      (SELECT iddocumento, SUM(importe) cobrado' +
                  '         FROM cobrodocumento' +
                  '        WHERE idempresa = $1' +
                  '          AND iddocumento = $4' +
                  '        GROUP BY iddocumento) cb' +
                  '   ON doc.iddocumento = cb.iddocumento' +
                  ' WHERE doc.idempresa   = $3' +
                  '   AND doc.iddocumento = $4' +
                  ' GROUP BY doc.observaciones, doc.iddocumento, p1.descripcion';
  var params = [idempresa, idfactura, idempresa, idfactura, clienttimezone];
  Utils.log(statement + ' - ' + params);
  client.query(statement, params, function(err, result) {
    if(err){
      cb(err, null, null);
    }
    else{
      if(result.rowCount > 0){
        var totales = [];
        var lineas_obs = Utils.trocearTexto('OBSERVACIONES: ' + result.rows[0].observaciones);

        var base2 = result.rows[0].base;
        if(tipo==2){
          base2 = result.rows[0].total;
        }
        totales.push([{ text: lineas_obs[1],  alignment: 'left' },
                      { text: 'BASE:',  alignment: 'right' },
                      { text: base2 + ' €',  alignment: 'right' }
                    ]);
        if(result.rows[0].serie == '1' && tipo != 2){
          totales.push([{ text: lineas_obs[2],  alignment: 'left' },
                        { text: 'IVA:',  alignment: 'right' },
                        { text: result.rows[0].iva + ' €',  alignment: 'right' }
                      ]);            
        }
        else{
          totales.push([{ text: lineas_obs[2],  alignment: 'left' },
                        { text: 'IVA 21%',  alignment: 'right' },
                        { text: ' ',  alignment: 'right' }
                      ]);            
        }

        totales.push([{ text: lineas_obs[3],  alignment: 'left' },
                      { text: 'TOTAL:',  alignment: 'right' },
                      { text: result.rows[0].total + ' €',  style: 'header' }
                    ]);

        var tableTotales =  {
                              table: {
                                //dontBreakRows: true,
                                widths: ['78%', '9%', '13%'],
                                body: totales
                              },
                              layout: 'noBorders'
                            };
        var tableDesgloseCliente =  {
                              table: {
                                widths: ['35%', '15%', '50%'],
                                body: desgloseCliente
                              },
                              //layout: 'noBorders'
                            };
        cb(null, idfactura, tableTotales);
      }
      else{
        cb(null, idfactura, '');
      }
    }
  })
}

function getPie(client, idempresa, idfactura, cb){
  var statement = 'SELECT texto FROM lineapdf' +
                        ' WHERE idempresa = $1' +
                        '   AND (tipodocumento = '+
                        ' (SELECT tipodocumento FROM documento WHERE idempresa = $1 AND iddocumento = $2)' +
                        '     OR tipodocumento = '+
                        ' (SELECT substring(tipodocumento from 1 for 1) FROM documento WHERE idempresa = $1 AND iddocumento = $2)' +
                        '       )' +
                        ' ORDER BY orden';
  var params = [idempresa, idfactura];
  Utils.log(statement + ' - ' + params);
  client.query(statement, params, function(err, result) {
    if(err){
      cb(err, null);
    }
    else{
      if(result.rowCount > 0){
        var pie = [];
        for (var i = 0; i < result.rows.length; i++) {
          pie.push([{ text: result.rows[i].texto, style: 'footprint' }]);
        }
        var tablePie =  {
                              table: {
                                //dontBreakRows: true,
                                widths: ['100%'],
                                body: pie
                              },
                              layout: 'noBorders'
                            }
        }
      else{
        var tablePie = ' ';
      }

      cb(null,tablePie);
    }
  })
}

function getPdf(cabecera, factura, lineas, totales, gastos, totalesgastos, pie, orientation, footerText){
  var pageFooters = getPageFooters(cabecera, factura, lineas, totales, gastos, totalesgastos, pie, orientation, footerText);
  var PdfPrinter = require('pdfmake');
  var printer = new PdfPrinter(Utils.FONTS);

  var docOrientation = orientation;
  var docContent = [];
  docContent.push(cabecera, ' ',
                  factura, ' ',
                  lineas, ' ',
                  totales, ' ',
                  gastos, ' ',
                  totalesgastos, ' ',
                  pie);

  var docDefinition = {
      pageOrientation: docOrientation,
      content: docContent,
      footer: function(pagenumber, pagecount) {
        return {
              margin: [20, 0],
              text: pageFooters[pagenumber-1],
              alignment : 'right'
        };
      },
      styles: {
        header: {
          alignment: 'right',
          bold: true
        },
        footprint: {
          fontSize: 6
        }
      },
      defaultStyle: {
        fontSize: 10,
        columnGap: 30
      }
      // margin: [left, top, right, bottom]
      ,pageMargins: [20,20,20,20]
      ,background: [
       {
           //image: 'data:image/jpeg;base64,/9j/4QAY...',
           image: './images/watermark.jpg',
           width: 600,
           opacity: 0.9
       }
     ],
  };
  //console.log(JSON.stringify(docDefinition));
  return printer.createPdfKitDocument(docDefinition);
}

function getPdf2(cabecera, factura, lineas, totales, gastos, totalesgastos, pie, orientation, footerText){
  var pageFooters = getPageFooters2(cabecera, factura, lineas, totales, gastos, totalesgastos, pie, orientation, footerText);
  var PdfPrinter = require('pdfmake');
  var printer = new PdfPrinter(Utils.FONTS);

  var docOrientation = orientation;
  var docContent = [];
  for (var i = 0; i < cabecera.length; i++) {
    if(i > 0){
      docContent.push({ text: '', pageBreak: 'after' });
    }
    docContent.push(cabecera[i], ' ',
                    factura[i], ' ',
                    lineas[i], ' ',
                    totales[i], ' ',
                    gastos[i], ' ',
                    totalesgastos[i], ' ',
                    pie[i]);
  }

  var docDefinition = {
      pageOrientation: docOrientation,
      content: docContent,
      footer: function(pagenumber, pagecount) {
        return {
              margin: [20, 0],
              text: pageFooters[pagenumber-1],
              alignment : 'right'
        };
      },
      styles: {
        header: {
          alignment: 'right',
          bold: true
        },
        footprint: {
          fontSize: 6
        }
      },
      defaultStyle: {
        fontSize: 10,
        columnGap: 30
      }
      // margin: [left, top, right, bottom]
      ,pageMargins: [20,20,20,20]
      ,background: [
       {
           //image: 'data:image/jpeg;base64,/9j/4QAY...',
           image: './images/watermark.jpg',
           width: 600,
           opacity: 0.9
       }
     ],
  };
  //console.log(JSON.stringify(docDefinition));
  return printer.createPdfKitDocument(docDefinition);
}

// creates mock documents to foresee how many pages each one will span and set page footers accordingly
function getPageFooters(cabecera, factura, lineas, totales, gastos, totalesgastos, pie, orientation, footerText){
  console.log('getPageFooters.footerText:',footerText);
  var pageFooters = [];
  var PdfPrinter = require('pdfmake');
  var printer = new PdfPrinter(Utils.FONTS);

  var docOrientation = orientation;
  var docContent = [];
  docContent.push(cabecera, ' ', factura, ' ', lineas, ' ', totales, ' ', gastos, ' ', totalesgastos, ' ', pie);

  var docDefinition = {
      pageOrientation: docOrientation,
      content: docContent,
      footer: function(pagenumber, pagecount) {
        footerText = footerText + pagenumber + ' / ' + pagecount;
        pageFooters.push(footerText);
        return {text: footerText};
      },
      styles: {
        header: {
          alignment: 'right',
          bold: true
        },
        footprint: {
          fontSize: 6
        }
      },
      defaultStyle: {
        fontSize: 10,
        columnGap: 30
      }
      ,pageMargins: [20,20,20,20]
  };
  printer.createPdfKitDocument(docDefinition);

  return pageFooters;
}

// creates mock documents to foresee how many pages each one will span and set page footers accordingly
function getPageFooters2(cabecera, factura, lineas, totales, gastos, totalesgastos, pie, orientation, footerText){
  var pageFooters = [];
  var PdfPrinter = require('pdfmake');
  var printer = new PdfPrinter(Utils.FONTS);

  for (var i = 0; i < cabecera.length; i++) {
    var docOrientation = orientation;
    var docContent = [];
    docContent.push(cabecera[i], ' ', factura[i], ' ', lineas[i], ' ', totales[i], ' ', gastos[i], ' ', totalesgastos[i], ' ', pie[i]);

    var docDefinition = {
        pageOrientation: docOrientation,
        content: docContent,
        footer: function(pagenumber, pagecount) {
          pageFooters.push(footerText + pagenumber + ' / ' + pagecount);
          return {margin: [20, 0], text: footerText + pagenumber + ' / ' + pagecount, alignment : 'right'};
        },
        styles: {
          header: {
            alignment: 'right',
            bold: true
          },
          footprint: {
            fontSize: 6
          }
        },
        defaultStyle: {
          fontSize: 10,
          columnGap: 30
        }
        ,pageMargins: [20,20,20,20]
    };
    printer.createPdfKitDocument(docDefinition);
  }

  return pageFooters;
}

//Genera pdf con listado de facturas correspondientes al frontend facturas.html
exports.printFacturas = function (client, idempresa, idusuario, rol, filtro, clienttimezone, cb) {
  console.log('####################printFacturas:', filtro);
  getIdFacturas(client, idempresa, idusuario, rol, filtro, clienttimezone, function (err, ids){
    if (err){
      cb(err,null);
    }
    else{
      var textoCabecera = 'LISTADO DE FACTURAS';
      if(filtro && filtro.escompra){
        textoCabecera = 'LISTADO DE GASTOS';
      }
      getheaderfacturas(client, idempresa, textoCabecera, function (err, header){
        if (err){
          cb(err,null);
        }
        else{
          getfacturas(client, idempresa, ids, clienttimezone, filtro.escompra || false, function (err, facturas, cont){
            if (err){
              cb(err,null);
            }
            else{
              getfooterfacturas(client, filtro, cont, clienttimezone, function (err, footer){
                if(err){
                  cb(err,null);
                }
                else{
                  var pdfDoc = getPdf(header, ' ', facturas, ' ', ' ', ' ', footer, 'landscape', ' ');
                  cb(null,pdfDoc);
                }
              })
            }
          })
        }
      })
    }
  })
}

function getIdFacturas(client, idempresa, idusuario, rol, filtro, clienttimezone, cb){
  var st = Utils.getFacturasStatement(idempresa, idusuario, rol, filtro, clienttimezone);
  Utils.log(st.statement + ' - ' + st.params);
  client.query(st.statement, st.params, function(err, result) {
    if(err){
      cb(err, null);
    }
    else{
      var ids = [];
      if(result.rowCount > 0){
        for (var i = 0; i < result.rows.length; i++) {
          ids.push(result.rows[i].idfactura);
        }
      }
      cb(null, ids);
    }
  });
}

function getheaderfacturas(client, idempresa, texto, cb){
  var statement = 'SELECT e.idprofilepicture' +
                  '  FROM gt_empresa e' +
                  ' WHERE e.idempresa = $1';
  var params = [idempresa];
  Utils.log(statement + ' - ' + params);
  client.query(statement, params, function(err, result) {
    if(err){
      cb(err, null);
    }
    else{
      if(result.rowCount > 0){
        var emp = result.rows[0];
        var logo = './images/' + emp.idprofilepicture + '.jpg';
        var header =  {
                          table: {
                            widths: ['*', 150],
                            body: [
                              [{image: logo, width: 200}, texto]
                            ]
                          },
                          layout: 'noBorders'
                        };
        cb(null, header);
      }
      else{
        cb(null, '');
      }
    }
  });
}

function getfacturas(client, idempresa, ids, clienttimezone, escompra, cb){
  var statement = 'SELECT f.*, COALESCE(g.guialocal,\'\') guialocal,' +
                  //'       b.nombre emisor' +
                  '       CASE WHEN $4 THEN f.emisorgasto ELSE b.nombre END emisor' +
                  '      ,TO_CHAR(f.fecha AT TIME ZONE $3,\'DD-MM-YYYY\') facturafecha' +
                  '      ,f.numero || \'/\' || TO_CHAR(f.fecha AT TIME ZONE $3,\'YY\') facturanumero' +
                  '      ,to_char(coalesce(f.total ,0),\'999,990.99\') facturahonorarios' +
                  '      ,to_char(coalesce(f.gastos ,0),\'999,990.99\') facturagastos' +
                  '      ,to_char(coalesce(f.total + f.gastos ,0),\'999,990.99\') facturatotal' +
                  '      ,coalesce(TO_CHAR(g.fechahora AT TIME ZONE $3, \'DD-MM-YYYY\'),\'\') fechagrupo' +
                  '      ,coalesce(g.ref,\'\') referencia' +
                  '      ,coalesce(g.agencia,\'\') agencia' +
                  '  FROM gt_factura f' +
                  // este LEFT OUTER JOIN no funcionaría si se facturaran más de un grupo en la misma factura, saldrían facturas duplicadas:
                  '       LEFT OUTER JOIN gt_grupo g ON g.idempresa = f.idempresa AND g.idgrupo = ANY (f.grupos::int[])' +
                  '     , gt_usuario b' +
                  ' WHERE f.idempresa = $1' +
                  '   AND f.idfactura = ANY($2)' +
                  '   AND f.idusuarioemisor = b.idusuario' +
                  ' ORDER BY f.numero DESC, f.fecha DESC';
  var params = [idempresa, ids, clienttimezone, escompra];
  Utils.log(statement + ' - ' + params);
  client.query(statement, params, function(err, result) {
    if(err){
      cb(err, null, null);
    }
    else{
      if(result.rowCount > 0){
        var grupos =  {
                          table: {
                            widths: ['8%','8%','8%','8%','8%','8%','10%','*','8%','8%','8%'],
                            body: []
                          }
                        };
        var honorariosText = 'HONORARIOS';
        if(escompra){
          honorariosText = 'IMPORTE';
        }
        grupos.table.body.push(['TIPO', 'NÚM.', 'FECHA', 'EMISOR', 'GUÍA', 'AGENCIA', 'IDENTIF.', 'RECEPTOR', honorariosText, 'GASTOS', 'TOTAL']);
        let total = 0;
        let gastos = 0;
        for (var i = 0; i < result.rows.length; i++) {
          let nombre = result.rows[i].nombre;
          if(result.rows[i].fechagrupo.length > 0 || result.rows[i].referencia.length > 0){
            nombre = nombre + ' [' + result.rows[i].fechagrupo + ' ' + result.rows[i].referencia + ']';
          }
          grupos.table.body.push(
            [result.rows[i].tipofactura + ' '
            ,result.rows[i].facturanumero + ' '
            ,result.rows[i].facturafecha + ' '
            ,result.rows[i].emisor.toUpperCase() + ' '
            ,result.rows[i].guialocal + ' '
            ,result.rows[i].agencia + ' '
            ,result.rows[i].identificacion + ' '
            ,nombre
            ,{ text: result.rows[i].facturahonorarios, alignment: 'right' }
            ,{ text: result.rows[i].facturagastos, alignment: 'right' }
            ,{ text: result.rows[i].facturatotal, alignment: 'right' }
          ]);
          total = total + parseFloat(result.rows[i].facturahonorarios);
          gastos = gastos + parseFloat(result.rows[i].facturagastos);
        }
        grupos.table.body.push([
          ' ', ' ', ' ', ' ', ' ', ' ', ' ', 'TOTAL (' + result.rowCount + ' FILAS)',
          { text: total.toFixed(2), alignment: 'right' }, { text: gastos.toFixed(2), alignment: 'right' }, { text: (total + gastos).toFixed(2), alignment: 'right' }
         ]);
        cb(null, grupos, result.rowCount);
      }
      else{
        cb(null, '', result.rowCount);
      }
    }
  });
}

function getfooterfacturas(client, filtro, cont, clienttimezone, cb){
  //var statement = 'SELECT texto FROM linepdf' +
  var statement = 'SELECT TO_CHAR(now() AT TIME ZONE $1,\'DD-MM-YYYY HH24:MI\') fechahora';
  var params = [clienttimezone];
  Utils.log(statement + ' - ' + params);
  client.query(statement, params, function(err, result) {
    if(err){
      cb(err, null);
    }
    else{
      if(result.rowCount > 0){
        var footer = [];
        for (var i = 0; i < result.rows.length; i++) {
          footer.push([{ text: 'Impreso el: ' + result.rows[i].fechahora, style: 'footprint', alignment: 'right' }]);
        }
        footer.push([{ text: 'Número de facturas: ' + cont, style: 'footprint', alignment: 'right' }]);
        footer.push([{ text: 'Filtro aplicado: ' + JSON.stringify(filtro), style: 'footprint', alignment: 'right' }]);
        var tablefooter =  {
                              table: {
                                //dontBreakRows: true,
                                widths: ['100%'],
                                body: footer
                              },
                              layout: 'noBorders'
                            }
        }
      else{
        var tablefooter = '';
      }

      cb(null,tablefooter);
    }
  })
}

//Genera pdf con tarifa correspondiente al frontend tarifas.html
exports.printTarifa = function (client, idempresa, idtarifa, clienttimezone, cb) {
  console.log('####################printTarifa:', idtarifa);
  var tCabecera = null;
  var tLineas = null;
  var tPie = null;

  getCabeceraTarifa(client, idempresa, idtarifa, function (err, idfactura, cabecera, footerText){
    if (err){
      cb(err,null);
    }
    else{
      tCabecera = cabecera;
      getLineasTarifa(client, idempresa, idtarifa, clienttimezone, function (err, idtarifa, lineas){
        if (err){
          cb(err,null);
        }
        else{
          tLineas = lineas;
          getPieTarifa(client, idempresa, idtarifa, clienttimezone, function (err, pie){
            if(err){
              cb(err,null);
            }
            else{
              tPie = pie;
              var pdfDoc = getPdfTarifa(tCabecera, tLineas, tPie, footerText);
              cb(null,pdfDoc);
            }
          })
        }
      })
    }
  })
}

function getCabeceraTarifa(client, idempresa, idtarifa, cb){
  var statement = 'SELECT * FROM gt_tarifa t, gt_empresa e' +
                  ' WHERE t.idempresa   = $1' +
                  '   AND t.idtarifa    = $2' +
                  '   AND e.idempresa   = t.idempresa';
  var params = [idempresa, idtarifa];
  Utils.log(statement + ' - ' + params);
  client.query(statement, params, function(err, result) {
    if(err){
      cb(err, null, null, null);
    }
    else{
      if(result.rowCount > 0){
        var emp = result.rows[0];
        var logo = './images/' + emp.idprofilepicture + '.jpg';
        var cabecera =  {
                          table: {
                            widths: ['35%', '65%'],
                            body: [
                              [{image: logo, width: 200}, 'TARIFA ' + emp.descripcion + '[' + emp.codigo + ']']
                            ]
                          },
                          layout: 'noBorders'
                        };
        cb(null, idtarifa, cabecera, ' ');
      }
      else{
        cb(null, idtarifa, '', '');
      }
    }
  });
}

function getLineasTarifa(client, idempresa, idtarifa, clienttimezone, cb){
  var statement = 'SELECT *' +
                  '  FROM gt_tarifa t' +
                  ' WHERE t.idempresa = $1' +
                  '   AND t.idtarifa  = $2' +
                  ' ORDER BY t.idtarifa';
  var params = [idempresa, idtarifa];
  Utils.log(statement + ' - ' + params);
  client.query(statement, params, function(err, result) {
    if(err){
      cb(err, null, null);
    }
    else{
      if(result.rowCount > 0){
        var t = result.rows[0];
        statement = 'SELECT codigo, nombre FROM gt_pdu WHERE idempresa = $1 AND tabla = $2';
        params = [idempresa, 'tipovisita'];
        Utils.log(statement + ' - ' + params);
        client.query(statement, params, function(err, result) {
          if(err){
            cb(err, null, null);
          }
          else{
            var tiposvisita = result.rows;
            var tarifaBody = [
              [
                { text: 'TIPO DE VISITA', style: 'header', alignment: 'left'},
                { text: 'PAX DESDE', style: 'header', alignment: 'right'},
                { text: 'PAX HASTA', style: 'header', alignment: 'right'},
                { text: 'LABORABLE', style: 'header', alignment: 'right'},
                { text: 'FESTIVO', style: 'header', alignment: 'right'},
              ]
            ];
            for (var i = 0; i < t.precios.length; i++) {
              var descTipoVisita = t.precios[i].tipovisita;
              for (var j = 0; j < tiposvisita.length; j++) {
                if(tiposvisita[j].codigo == t.precios[i].tipovisita){
                  descTipoVisita = tiposvisita[j].nombre;
                  break;
                }
              }
              tarifaBody.push([
                { text: descTipoVisita},
                { text: t.precios[i].paxdesde, alignment: 'right'},
                { text: t.precios[i].paxhasta, alignment: 'right'},
                { text: t.precios[i].laborable.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }), alignment: 'right'},
                { text: t.precios[i].festivo.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }), alignment: 'right'},
              ]);
            }
            tarifaBody.push([
                { text: ' '}, { text: ' '}, { text: ' '}, { text: ' '}, { text: ' '}]);
            tarifaBody.push([
                { text: ' '},
                { text: ' '},
                { text: 'MONUMENTO EXTRA', alignment: 'left'},
                { text: parseFloat(t.monumentolaborable).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }), alignment: 'right'},
                { text: parseFloat(t.monumentofestivo).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }), alignment: 'right'},
              ]);
            tarifaBody.push([
                { text: ' '},
                { text: ' '},
                { text: 'HORA EXTRA', alignment: 'left'},
                { text: parseFloat(t.horalaborable).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }), alignment: 'right'},
                { text: parseFloat(t.horafestivo).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }), alignment: 'right'},
              ]);
            tarifaBody.push([
                { text: ' '},
                { text: ' '},
                { text: 'IDIOMA EXTRA', alignment: 'left'},
                { text: parseFloat(t.idiomalaborable).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }), alignment: 'right'},
                { text: parseFloat(t.idiomafestivo).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }), alignment: 'right'},
              ]);
            var tarifa =  {
                              table: {
                                widths: ['20%','20%','20%','20%','20%'],
                                body: tarifaBody
                              },
                              //layout: 'noBorders'
                            };

            cb(null, idtarifa, tarifa);
          }
        })
      }
      else{
        cb(null, idtarifa, '');
      }
    }
  });
}

function getPieTarifa(client, idempresa, idtarifa, clienttimezone, cb){
  var statement = 'SELECT TO_CHAR(now() AT TIME ZONE $1,\'DD-MM-YYYY HH24:MI\') fechahora';
  var params = [clienttimezone];
  Utils.log(statement + ' - ' + params);
  client.query(statement, params, function(err, result) {
    if(err){
      cb(err, null);
    }
    else{
      if(result.rowCount > 0){
        var footer = [];
        for (var i = 0; i < result.rows.length; i++) {
          footer.push([{ text: 'Impreso el: ' + result.rows[i].fechahora, style: 'footprint', alignment: 'right' }]);
        }
        var tablefooter =  {
                              table: {
                                //dontBreakRows: true,
                                widths: ['100%'],
                                body: footer
                              },
                              layout: 'noBorders'
                            }
        }
      else{
        var tablefooter = '';
      }

      cb(null,tablefooter);
    }
  })
}

function getPdfTarifa(header, lineas, footer){
  var pageFooters = getTarifaFooters(header, lineas, footer);
  var PdfPrinter = require('pdfmake');
  var printer = new PdfPrinter(Utils.FONTS);
  var docOrientation = 'portrait';
  var docContent = [];
  docContent.push(header, ' ', lineas, ' ', footer);

  var docDefinition = {
      pageOrientation: docOrientation,
      content: docContent,
      footer: function(pagenumber, pagecount) {
      return {
            margin: [20, 0],
            text: pageFooters[pagenumber-1],
            alignment : 'right'
      };
      },
      styles: {
        header: {
          alignment: 'right',
          bold: true
        },
        footprint: {
          fontSize: 6
        }
      },
      defaultStyle: {
        fontSize: 10,
        columnGap: 30
      }
      // margin: [left, top, right, bottom]
      ,pageMargins: [20,20,20,20]
  };
  //console.log(JSON.stringify(docDefinition));
  return printer.createPdfKitDocument(docDefinition);
}

// creates mock documents to foresee how many pages each one will span and set page footers accordingly
function getTarifaFooters(header, lineas, footer){
  var pageFooters = [];
  var PdfPrinter = require('pdfmake');
  var printer = new PdfPrinter(Utils.FONTS);

  var docOrientation = 'portrait';
  var docContent = [];
  docContent.push(header, ' ', lineas, ' ', footer);

  var docDefinition = {
      pageOrientation: docOrientation,
      content: docContent,
      footer: function(pagenumber, pagecount) {
        pageFooters.push(pagenumber + ' / ' + pagecount);
        return {margin: [20, 0], text: pagenumber + ' / ' + pagecount, alignment : 'right'};
      },
      styles: {
        header: {
          alignment: 'right',
          bold: true
        },
        footprint: {
          fontSize: 6
        }
      },
      defaultStyle: {
        fontSize: 10,
        columnGap: 30
      }
      ,pageMargins: [20,20,20,20]
  };
  printer.createPdfKitDocument(docDefinition);

  return pageFooters;
}