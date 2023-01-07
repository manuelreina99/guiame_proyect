// Generate a document's pdf

var Utils = require('../utils');

exports.printGrupo = function (client, idempresa, idgrupo, clienttimezone, cb) {
  console.log('####################printGrupo:', idgrupo);
  if(!idgrupo || idgrupo == 0){
    cb({message: 'Error printing grupo, idgrupo missing' },null);
  }
  else{
    getheader(client, idempresa, idgrupo, 'DETALLES DEL GRUPO', function (err, idgrupo, header){
      if (err){
        cb(err,null);
      }
      else{
        ids = [];
        ids.push(idgrupo);
        getgrupos(client, idempresa, ids, clienttimezone, function (err, ids, grupo, grupos, cont){
          if (err){
            cb(err,null);
          }
          else{
            gethorariosmonumentos(client, idempresa, idgrupo, clienttimezone, function (err, horariosmonumentos){
              if(err){
                cb(err,null);
              }
              else{
                getfooter(client, idempresa, idgrupo, clienttimezone, function (err, footer){
                  if(err){
                    cb(err,null);
                  }
                  else{
                    var pdfDoc = getPdf(header, grupo, horariosmonumentos, footer, 'portrait');
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
}

function getheader(client, idempresa, idgrupo, texto, cb){
  var statement = 'SELECT e.idprofilepicture' +
                  '  FROM gt_empresa e' +
                  ' WHERE e.idempresa = $1';
  var params = [idempresa];
  Utils.log(statement + ' - ' + params);
  client.query(statement, params, function(err, result) {
    if(err){
      cb(err, null, null);
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
        cb(null, idgrupo, header);
      }
      else{
        cb(null, idgrupo, '');
      }
    }
  });
}

function getgrupos(client, idempresa, ids, clienttimezone, cb){
  var statement = 'SELECT g.*, u.nombrecompleto,' +
                  '       p1.nombre guialocaltext,' +
                  '       coalesce(p2.nombre,\'\') puntoencuentrotext,' +
                  '       coalesce(p3.nombre,\'\') agenciatext,' +
                  '       p4.nombre puntofinaltext,' +
                  '       p5.nombre busempresatext,' +
                  '       p6.nombre guiacorreotext,' +
                  '       p7.nombre formapagotext,' +
                  '       p8.nombre facilitagrupotext,' +
                  '       mons.monumentostext,' +
                  '       tblidiomas.idiomastext,' +
                  '       tbltipovisita.tipovisitatext,' +
                  '       to_char(g.importe,\'999,990.99\') importeed,' +
                  '       TO_CHAR(g.fechahora AT TIME ZONE $3,\'DD-MM-YYYY\') grupofecha,' +
                  '       TO_CHAR(g.fechahora AT TIME ZONE $3,\'HH24:MI\') grupohora,' +
                  '       TO_CHAR(g.horafinal AT TIME ZONE $3,\'HH24:MI\') grupohorafinal,' +
                  '       TO_CHAR(g.fechamodificacion AT TIME ZONE $3,\'DD-MM-YYYY HH24:MI\') grupomodificacion,' +
                  '       TO_CHAR(g.repitefecha AT TIME ZONE $3,\'HH24:MI\') gruporepitefecha,' +
                  '       CASE WHEN g.anulado THEN \'ANULADO\' ELSE CASE WHEN g.confirmado THEN \'CONFIRMADO\' ELSE \'RESERVADO\' END END confirmadotext,' +
                  '       CASE WHEN g.entradasincluidas THEN \'SÍ\' ELSE \'NO\' END entradasincluidastext,' +
                  '       CASE WHEN g.repite THEN \'SÍ\' ELSE \'NO\' END repitetext,' +
                  '       CASE WHEN g.repitecompleto THEN \'SÍ\' ELSE \'NO\' END repitecompletotext' +
                  '  FROM gt_grupo g' +
                  '       LEFT OUTER JOIN gt_pdu p1 ON p1.idempresa = g.idempresa AND p1.tabla = \'guia\'           AND p1.codigo = g.guialocal' +
                  '       LEFT OUTER JOIN gt_pdu p2 ON p2.idempresa = g.idempresa AND p2.tabla = \'puntoencuentro\' AND p2.codigo = g.puntoencuentro' +
                  '       LEFT OUTER JOIN gt_pdu p3 ON p3.idempresa = g.idempresa AND p3.tabla = \'agencia\'        AND p3.codigo = g.agencia' +
                  '       LEFT OUTER JOIN gt_pdu p4 ON p4.idempresa = g.idempresa AND p4.tabla = \'puntoencuentro\' AND p4.codigo = g.puntofinal' +
                  '       LEFT OUTER JOIN gt_pdu p5 ON p5.idempresa = g.idempresa AND p5.tabla = \'busempresa\'     AND p5.codigo = g.busempresa' +
                  '       LEFT OUTER JOIN gt_pdu p6 ON p6.idempresa = g.idempresa AND p6.tabla = \'guiacorreo\'     AND p6.codigo = g.guiacorreo' +
                  '       LEFT OUTER JOIN gt_pdu p7 ON p7.idempresa = g.idempresa AND p7.tabla = \'formapago\'      AND p7.codigo = g.formapago' +
                  '       LEFT OUTER JOIN gt_pdu p8 ON p8.idempresa = g.idempresa AND p8.tabla = \'facilitagrupo\'  AND p8.codigo = g.facilitagrupo' +
                  '       LEFT OUTER JOIN (SELECT idgrupo, string_agg(descripcion, \' + \') monumentostext' +
                  '                          FROM (select g.idgrupo, m.descripcion from gt_grupo g join gt_monumento m ON m.idempresa = g.idempresa AND m.codigo = ANY(monumentos) where g.idempresa = $1 AND idgrupo = ANY($2)) foo' +
                  '                         GROUP BY 1) mons ON g.idgrupo = mons.idgrupo' +
                  '       LEFT OUTER JOIN (SELECT idgrupo, string_agg(nombre, \' + \') idiomastext' +
                  '                          FROM (select g.idgrupo, p.nombre from gt_grupo g join gt_pdu p ON p.idempresa = g.idempresa AND p.tabla = \'idioma\' AND p.codigo = ANY(g.idiomas) where g.idempresa = $1 AND idgrupo = ANY($2)) foo' +
                  '                         GROUP BY 1) tblidiomas ON g.idgrupo = tblidiomas.idgrupo' +
                  '       LEFT OUTER JOIN (SELECT idgrupo, string_agg(nombre, \' + \') tipovisitatext' +
                  '                          FROM (select g.idgrupo, p.nombre from gt_grupo g join gt_pdu p ON p.idempresa = g.idempresa AND p.tabla = \'tipovisita\' AND p.codigo = ANY(g.tipovisita) where g.idempresa = $1 AND idgrupo = ANY($2)) foo' +
                  '                         GROUP BY 1) tbltipovisita ON g.idgrupo = tbltipovisita.idgrupo' +
                  '      ,gt_usuario u' +
                  ' WHERE g.idempresa = $1' +
                  '   AND g.idgrupo   = ANY($2)' +
                  '   AND u.idusuario = g.idusuario' +
                  ' ORDER BY g.anulado ASC, g.fechahora ASC';
  var params = [idempresa, ids, clienttimezone];
  console.log('##################################################:', ids);
  Utils.log(statement + ' - ' + params);
  client.query(statement, params, function(err, result) {
    if(err){
      cb(err, null, null, null, null);
    }
    else{
      if(result.rowCount > 0){
        var g = result.rows[0];
        //Impresión de un solo grupo
        var grupo =  {
                          table: {
                            widths: ['30%','70%'],
                            body: [
                                [{ text: 'GUÍA:'}, { text: g.guialocaltext || ' ' }],
                                [{ text: 'FECHA:'}, { text: g.grupofecha || ' ' }],
                                [{ text: 'HORA:'}, { text: g.grupohora || ' ' }],
                                [{ text: 'PUNTO ENCUENCUENTRO:'}, { text: g.puntoencuentrotext || ' ' }],
                                [{ text: 'PAX:'}, { text: g.pax || ' ' }],
                                [{ text: 'AGENCIA:'}, { text: g.agenciatext || ' ' }],
                                [{ text: 'REFERENCIA:'}, { text: g.ref || ' ' }],
                                [{ text: 'IDIOMAS:'}, { text: g.idiomastext || ' ' }],
                                [{ text: 'MONUMENTOS:'}, { text: g.monumentostext || ' ' }],
                                [{ text: 'ENTRADAS INCLUÍDAS:'}, { text: g.entradasincluidastext || ' ' }],
                                [{ text: 'TIPO VISITA:'}, { text: g.tipovisitatext || ' ' }],
                                [{ text: 'HORA FIN:'}, { text: g.grupohorafinal || ' ' }],
                                [{ text: 'LUGAR FINALIZACIÓN:'}, { text: g.puntofinaltext || ' ' }],
                                [{ text: 'DÍA COMPLETO:'}, { text:  g.repitecompletotext || ' ' }],
                                [{ text: 'REPITE:'}, { text: g.repitetext || ' ' }],
                                [{ text: 'EMPRESA AUTOBUSES:'}, { text: g.busempresatext || ' ' }],
                                [{ text: 'DATOS AUTOBÚS:'}, { text: g.busdatos || ' ' }],
                                [{ text: 'TELÉFONO DE CONTACTO:'}, { text: g.telefono || ' ' }],
                                [{ text: 'GUÍA CORREO:'}, { text: g.guiacorreotext || ' ' }],
                                [{ text: 'FORMA DE PAGO:'}, { text: g.formapagotext || ' ' }],
                                [{ text: 'CANTIDAD CONVENIDA:'}, { text: g.importeed + ' €' }],
                                [{ text: 'OBSERVACIONES:'}, { text: g.observaciones || ' ' }],
                                [{ text: 'FACILITA GRUPO:'}, { text: g.facilitagrupotext || ' ' }],
                                [{ text: 'ÚLTIMA MODIFICACIÓN:'}, { text: g.nombrecompleto + ' el ' + g.grupomodificacion }],
                            ]
                          },
                          //layout: 'noBorders'
                        };
        //Listado de grupos
        var grupos =  {
              table: {
                widths: ['*'],
                body: [
                  [' '],
                  [
                    [
                      {
                        table: {
                          widths: ['*','*','*','*','*','*','*'],
                          body: [
                            ['Agencia', 'Referencia', 'Monumentos', 'EI', {text:'Pax', alignment:'right'}, 'Idiomas', 'Guía'],
                            ['Punto de encuentro', 'Fecha/Hora', 'Tipo de visita', 'Repite', {text:'Cantidad convenida', alignment:'right'}, 'Día Completo', 'Forma pago'],
                            [{text: 'Lugar fin', border: [false, false, false, true]},
                             {text: 'Res./Conf.', border: [false, false, false, true]},
                             {text: 'Hora', border: [false, false, false, true]},
                             {text: 'Observaciones', colSpan: 4, border: [false, false, false, true]},
                             //{text: ' ', border: [false, false, false, true]},
                             //{text: ' ', border: [false, false, false, true]},
                             //{text: ' ', border: [false, false, false, true]}
                             ]
                          ],
                        },
                        //layout: 'noBorders',
                        layout: {
                          defaultBorder: false,
                        }
                      }
                    ],
                  ]
                ]
              },
              layout: 'noBorders',
            };
        //console.log('grupos.table.body:', grupos.table.body[1][0][0]);
        for (var i = 0; i < result.rows.length; i++) {
          grupos.table.body[1][0][0].table.body.push(
            [result.rows[i].agenciatext || ' '
            ,result.rows[i].ref || ' '
            ,result.rows[i].monumentostext || ' '
            ,result.rows[i].entradasincluidastext || ' '
            ,{text:result.rows[i].pax || ' ', alignment:'right'}
            ,result.rows[i].idiomastext || ' '
            ,result.rows[i].guialocaltext || ' '
          ]);
          grupos.table.body[1][0][0].table.body.push(
            [result.rows[i].puntoencuentrotext + ' '
            ,result.rows[i].grupofecha + ' ' + result.rows[i].grupohora || ' '
            ,result.rows[i].tipovisitatext || ' '
            ,result.rows[i].repitetext || ' '
            ,{text:result.rows[i].importeed + '€', alignment:'right'}
            ,result.rows[i].repitecompletotext || ' '
            ,result.rows[i].formapagotext || ' '
          ]);
          grupos.table.body[1][0][0].table.body.push(
            [{text: result.rows[i].puntofinaltext || ' ', border: [false, false, false, true]}
            ,{text: result.rows[i].confirmadotext || ' ', border: [false, false, false, true]}
            ,{text: result.rows[i].grupohorafinal || ' ', border: [false, false, false, true]}
            ,{text: result.rows[i].observaciones || ' ', colSpan: 4, border: [false, false, false, true]}
            //,{text: result.rows[i].observaciones.substr(10,10) || ' ', border: [false, false, false, true]}
            //,{text: result.rows[i].observaciones.substr(20,10) || ' ', border: [false, false, false, true]}
            //,{text: result.rows[i].observaciones.substr(30,10) || ' ', border: [false, false, false, true]}
          ]);
        }

        cb(null, ids, grupo, grupos, result.rowCount);
      }
      else{
        cb(null, ids, '', '', 0);
      }
    }
  });
}

function gethorariosmonumentos(client, idempresa, idgrupo, clienttimezone, cb){
  var statement = 'SELECT fechahora FROM gt_grupo WHERE idempresa = $1 AND idgrupo = $2';
  var params = [idempresa, idgrupo];
  Utils.log(statement + ' - ' + params);
  client.query(statement, params, function(err, result) {
    if(err){
      cb(err, null);
    }
    else{
      console.log('result.fechahora:', result.rows[0].fechahora);
      console.log('result.fechahora.date:', new Date(result.rows[0].fechahora));
      var st = Utils.getHorariosMonumentos(idempresa, ['CAT','ALC','PIL'], new Date(result.rows[0].fechahora), clienttimezone);
      Utils.log(st.statement + ' - ' + st.params);
      client.query(st.statement, st.params, function(err, result) {
        if(err){
          cb(err, null);
        }
        else{
          if(result.rowCount > 0){
            var horariosBody = [];
            for (var i = 0; i < result.rows.length; i++) {
              if(i==0){
                horariosBody.push([{text: 'HORARIOS'}, {text: ' '}]);
              }
              var times = 'CERRADO';
              if(result.rows[i].abierto){
                times = '';
                var localeOptions = {hour: '2-digit', minute:'2-digit', timeZone: clienttimezone, hour12: false};
                if(result.rows[i].h1) {times += new Date(result.rows[i].h1).toLocaleTimeString([], localeOptions) + ' ';}
                if(result.rows[i].h2) {times += new Date(result.rows[i].h2).toLocaleTimeString([], localeOptions) + ' ';}
                if(result.rows[i].h3) {times += new Date(result.rows[i].h3).toLocaleTimeString([], localeOptions) + ' ';}
                if(result.rows[i].h4) {times += new Date(result.rows[i].h4).toLocaleTimeString([], localeOptions) + ' ';}
              }
              horariosBody.push([{text: result.rows[i].codigo}, {text: times}]);
            }
            var horariosmonumentos =  {
                              table: {
                                widths: ['30%','70%'],
                                body: horariosBody
                              },
                              //layout: 'noBorders'
                            };
            console.log('horariosmonumentos:', horariosmonumentos);
            cb(null, horariosmonumentos);
          }
          else{
            cb(null, '');
          }
        }
      });
    }
  });
}

function getfooter(client, idempresa, idgrupo, clienttimezone, cb){
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

function getPdf(header, grupo, horariosmonumentos, footer, orientation){
  var pageFooters = getPageFooters(header, grupo, horariosmonumentos, footer, orientation);
  var PdfPrinter = require('pdfmake');
  var printer = new PdfPrinter(Utils.FONTS);
  var docOrientation = orientation;
  var docContent = [];
  docContent.push(header, ' ', grupo, ' ', horariosmonumentos, ' ', footer);

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
function getPageFooters(header, grupo, horariosmonumentos, footer, orientation){
  var pageFooters = [];
  var PdfPrinter = require('pdfmake');
  var printer = new PdfPrinter(Utils.FONTS);

  var docOrientation = orientation;
  var docContent = [];
  docContent.push(header, ' ', grupo, ' ', horariosmonumentos, ' ', footer);

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

exports.printGrupos = function (client, idempresa, filtro, clienttimezone, idusuario, cb) {
  console.log('####################printGrupos:', filtro);
  getIdGrupos(client, idempresa, filtro, clienttimezone, idusuario, function (err, ids, total){
    if (err){
      cb(err,null);
    }
    else{
      var title = 'LISTADO DE GRUPOS\n'
      if(filtro.fechaini && filtro.fechainiformat){
        //title = title + filtro.fechaini.substr(0,10);
        //title = title + new Date(filtro.fechaini).toLocaleDateString("es-ES", {timeZone: clienttimezone});
        title = title + filtro.fechainiformat;
      }
      else{
        title = title + 'Desde siempre'
      }
      if(filtro.fechaini != filtro.fechafin){
        if(filtro.fechafin && filtro.fechafinformat){
          //title = title + ' a ' + filtro.fechafin.substr(0,10);
          //title = title + ' a ' + new Date(filtro.fechafin).toLocaleDateString("es-ES", {timeZone: clienttimezone});;
          title = title + ' a ' + filtro.fechafinformat;
        }
        else{
          title = title + ' en adelante';
        }
      }
      title = title + '\nNúmero de grupos: ' + total;
      getheader(client, idempresa, 0, title, function (err, idgrupo, header){
        if (err){
          cb(err,null);
        }
        else{
          getgrupos(client, idempresa, ids, clienttimezone, function (err, ids, grupo, grupos, cont){
            if (err){
              cb(err,null);
            }
            else{
              getfootergrupos(client, filtro, cont, total, clienttimezone, function (err, footer){
                if(err){
                  cb(err,null);
                }
                else{
                  var pdfDoc = getPdf(header, grupos, ' ', footer, 'landscape');
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

function getIdGrupos(client, idempresa, filtro, clienttimezone, idusuario, cb){
  var st = Utils.getGruposStatementIds(idempresa, filtro, 0, 50000, clienttimezone, idusuario);
  Utils.log(st.statement + ' - ' + st.params);
  client.query(st.statement, st.params, function(err, result) {
    if(err){
      cb(err, null);
    }
    else{
      var total = result.rowCount;
      var ids = [];
      for (var i = 0; i < result.rows.length && i < 500; i++) {
        ids.push(result.rows[i].idgrupo);
      }
      cb(null, ids, total);
    }
  });
}

/*
function getgrupos(client, idempresa, ids, clienttimezone, cb){
  var statement = 'SELECT g.*, p.nombre,' +
                  '       array_to_string(g.idiomas, \'+\') idiomastext,' +
                  '       array_to_string(monumentos, \'+\') monumentostext,' +
                  '       TO_CHAR(g.fechahora AT TIME ZONE $3,\'DD-MM-YYYY HH24:MI\') grupofechahora' +
                  '  FROM gt_grupo g' +
                  '       LEFT OUTER JOIN gt_pdu p ON p.idempresa = g.idempresa AND p.tabla = \'guia\' AND p.codigo = g.guialocal' +
                  ' WHERE g.idempresa = $1' +
                  '   AND g.idgrupo   = ANY($2)' +
                  ' ORDER BY g.fechahora ASC';
  var params = [idempresa, ids, clienttimezone];
  Utils.log(statement + ' - ' + params);
  client.query(statement, params, function(err, result) {
    if(err){
      cb(err, null, null);
    }
    else{
      if(result.rowCount > 0){
        var grupos =  {
                          table: {
                            widths: ['8%','*','*','*','*','8%','8%','*'],
                            body: []
                          }
                        };
        grupos.table.body.push(['AGENCIA', 'REF.', 'IDIOMAS', 'FECHA/HORA', 'MONUMENTOS', 'P.ENC.', 'PAX', 'GUÍA']);
        for (var i = 0; i < result.rows.length; i++) {
          grupos.table.body.push(
            [result.rows[i].agencia + ' '
            ,result.rows[i].ref + ' '
            ,(result.rows[i].idiomastext || ' ') + ' '
            ,result.rows[i].grupofechahora + ' '
            ,(result.rows[i].monumentostext || ' ') + ' '
            ,result.rows[i].puntoencuentro + ' '
            ,result.rows[i].pax + ' '
            ,(result.rows[i].nombre || ' ') + ' '
          ]);
        }
        cb(null, grupos, result.rowCount);
      }
      else{
        cb(null, '', result.rowCount);
      }
    }
  });
}
*/

function getfootergrupos(client, filtro, cont, total, clienttimezone, cb){
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
        //footer.push([{ text: 'Número de grupos mostrados: ' + cont + ' de ' + total, alignment: 'right' }]);
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