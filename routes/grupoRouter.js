// Routes '/grupo

var express = require('express');
var bodyParser = require('body-parser');
var Utils = require('../utils');
var Verify = require('../verify');
var grupoRouter = express.Router({mergeParams: true}); //mergeParams preserve the req.params values from the parent router.
var pgTransact = require('pg-transact');

grupoRouter.use(bodyParser.json());

grupoRouter.route('/')
.put(Verify.verifyRead, Verify.verifyWrite, function(req, res) {
  Utils.pool.connect(function(err, client, done) {
    if(err){
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      client.req = req;
      pgTransact(client, saveGrupo, done).then(
        function successCallback(idgrupo) {
          var idSavedGrupo = idgrupo;
          var statement = getGrupoStatement();
          var params = [req.decoded.idultimaempresa, idSavedGrupo, req.headers['client-timezone']];
          Utils.log(statement + ' - ' + params);
          client.query(statement, params, function(err, result) {
            if (err || result.rowCount == 0){
              Utils.handleError(res, done, ((err && err.message) ? err.message : 'rowCount == 0'), 'Error getting grupo.');
            }
            else{
              done();
              result.rows[0].importe = parseFloat(result.rows[0].importe);
              res.status(200).json(result.rows[0]);
            }
          });
        },
        function errorCallback(err) {
          Utils.handleError(res, done, ((err && err.message) ? err.message : 'rowCount == 0'), "Error al guardar grupo " + req.body.grupo.idgrupo);
        }
      );
    }
  });
})

grupoRouter.route('/filter')
.put(Verify.verifyRead, function(req, res) {
  console.log('#############################');
  console.log('buscaGrupos:', req.body.filtro);
  console.log('#############################');
  Utils.pool.connect(function(err, client, done) {
    if(err){
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var page = 1;
      if(req.body.filtro && req.body.filtro.page){
        page = req.body.filtro.page;
      }
      if(req.body.filtro && req.body.filtro.numpages && (req.body.filtro.numpages < req.body.filtro.page)){
        page = req.body.filtro.numpages;
      }
      // leer gt_empresa.maxdocs
      var statement = 'SELECT maxdocs FROM gt_empresa WHERE idempresa = $1';
      var params = [req.decoded.idultimaempresa];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Error getting maxdocs.");
        }
        else{
          if(result.rowCount > 0){
            // leer ids con getIdSt = getIdSt + ' OFFSET ' + maxdocs * (req.body.page - 1) + ' LIMIT ' + maxdocs;
            var maxdocs = result.rows[0].maxdocs;
            var st = Utils.getGruposStatementIds(req.decoded.idultimaempresa, req.body.filtro, maxdocs * (page - 1), maxdocs, req.headers['client-timezone'], req.decoded.idusuario);
            Utils.log(st.statement + ' - ' + st.params);
            client.query(st.statement, st.params, function(err, result) {
              if (err){
                Utils.handleError(res, done, err.message, "Error getting ids grupos.");
              }
              else{
                var ids = result.rows.map(row => row.idgrupo);
                // leer docs con ids
                var st = Utils.getGruposStatement(req.decoded.idultimaempresa, ids, req.headers['client-timezone'], req.decoded.idusuario);
                Utils.log(st.statement + ' - ' + st.params);
                client.query(st.statement, st.params, function(err, result) {
                  if (err){
                    Utils.handleError(res, done, err.message, "Error getting ids grupos.");
                  }
                  else{
                    var resFilter = {grupos : result.rows};
                    // leer contadores
                    var st = Utils.getGruposStatementIds(req.decoded.idultimaempresa, req.body.filtro, 0, 50000, req.headers['client-timezone'], req.decoded.idusuario);
                    Utils.log(st.statement + ' - ' + st.params);
                    client.query(st.statement, st.params, function(err, result) {
                      if (err){
                        Utils.handleError(res, done, err.message, "Error getting ids grupos.");
                      }
                      else{
                        resFilter.cont = result.rowCount;
                        resFilter.numpages = Math.ceil(result.rowCount / maxdocs);
                        let manana = 0;
                        let tarde = 0;
                        resFilter.contmanana = 0;
                        resFilter.conttarde = 0;
                        resFilter.contanulados = 0;
                        for (let index = 0; index < resFilter.grupos.length; index++) {
                          resFilter.grupos[index].orden = '-';
                          if(resFilter.grupos[index].hora < '1300'){ //TO-DO: parametrizar
                            resFilter.grupos[index].tarde = false;
                            if(!resFilter.grupos[index].anulado){
                              resFilter.contmanana++;
                              resFilter.grupos[index].orden = ++manana;
                            }
                          }
                          else{
                            resFilter.grupos[index].tarde = true;
                            if(!resFilter.grupos[index].anulado){
                              resFilter.conttarde++;
                              resFilter.grupos[index].orden = ++tarde;
                            }
                          }
                          if(resFilter.grupos[index].anulado){
                            resFilter.contanulados++;
                          }
                        }
                        resFilter.grupos.horariosmonumentos =  null;
                        if(req.body.filtro && req.body.filtro.fechaini){
                          var dayofweek = new Date(req.body.filtro.fechaini).getDay();
                          var monumentos = ['CAT','ALC','PIL','MAE'];
                          st = Utils.getHorariosMonumentos(req.decoded.idultimaempresa, monumentos, req.body.filtro.fechaini, req.headers['client-timezone']);

                          //Utils.log(st.statement + ' - ' + st.params);
                          client.query(st.statement, st.params, function(err, result) {
                            if (err){
                              Utils.handleError(res, done, err.message, "Error getting grupo getHorariosMonumentos.");
                            }
                            else{
                              resFilter.horariosmonumentos = result.rows;
                              statement = 'SELECT descripcion FROM gt_fecha' +
                                          ' WHERE idempresa = $1' +
                                          '   AND TO_CHAR(fecha AT TIME ZONE $2, \'YYYY-MM-DD\') = TO_CHAR($3 AT TIME ZONE $2, \'YYYY-MM-DD\')' +
                                          '   AND festivo IS false';
                              params = [req.decoded.idultimaempresa, req.headers['client-timezone'], req.body.filtro.fechaini];
                              Utils.log(statement + ' - ' + params);
                              client.query(statement, params, function(err, result) {
                                if (err){
                                  Utils.handleError(res, done, err.message, "Error getting grupo getHorariosMonumentos.");
                                }
                                else{
                                  done();
                                  resFilter.incidencias = result.rows;
                                  res.status(200).json(resFilter);
                                }
                              });
                            }
                          });
                        }
                        else{
                          done();
                          res.status(200).json(resFilter);
                        }
                      }
                    });
                  }
                });
              }
            });
          }
          else{
            Utils.handleError(res, done, "", "Ops, algo no ha ido bien.");
          }

        }
      });
    }
  });
})

grupoRouter.route('/guia/check')
.put(Verify.verifyRead, function(req, res) {
  console.log('#############################');
  console.log('/guia/check/guia   :', req.body.guia);
  console.log('/guia/check/fecha  :', req.body.fecha);
  console.log('/guia/check/idiomas:', req.body.idiomas);
  console.log('/guia/check/idgrupo:', req.body.idgrupo);
  console.log('#############################');
  Utils.pool.connect(function(err, client, done) {
    if(err){
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var statement = 'SELECT idiomas::text[] FROM gt_pdu WHERE idempresa = $1 AND tabla = $2 AND codigo = $3';
      var params = [req.decoded.idultimaempresa, 'guia', req.body.guia];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Error consultando idiomas del guia.");
        }
        else{
          var text = '';
          if(result.rowCount <= 0 && req.body.idiomas && req.body.idiomas.length > 0){
            text = req.body.guia + ' no habla ' + req.body.idiomas  + '.';
          }
          else{
            var idiomasGuia = [];
            if(result.rowCount > 0 && result.rows[0].idiomas && result.rows[0].idiomas.length > 0){
              idiomasGuia = result.rows[0].idiomas.toString().split(',');
            }
            var idiomasGrupo = req.body.idiomas || [];
            var idiomasNotTalked = [];
            console.log('idiomasGuia :', idiomasGuia);
            console.log('idiomasGrupo:', idiomasGrupo);
            console.log('idiomasNotTalked:', idiomasNotTalked);
            for (var i = 0; i < idiomasGrupo.length; i++) {
              if(!idiomasGuia.includes(idiomasGrupo[i])){
                idiomasNotTalked.push(idiomasGrupo[i]);
              }
            }
            console.log('idiomasNotTalked:', idiomasNotTalked);
            if(idiomasNotTalked.length > 0){
              text = req.body.guia + ' no habla ' + idiomasNotTalked.toString() + '.';
            }
          }
          statement = 'SELECT * FROM gt_grupo' +
                      ' WHERE idempresa = $1' +
                      '   AND TO_CHAR(fechahora AT TIME ZONE $5,\'YYYYMMDD\') = TO_CHAR($2 AT TIME ZONE $5,\'YYYYMMDD\')' +
                      '   AND guialocal = $3' +
                      '   AND idgrupo <> $4';
          params = [req.decoded.idultimaempresa, req.body.fecha, req.body.guia, req.body.idgrupo, req.headers['client-timezone']];
          Utils.log(statement + ' - ' + params);
          client.query(statement, params, function(err, result) {
            if (err){
              Utils.handleError(res, done, err.message, "Error consultando disponibilidad de fechas del guia.");
            }
            else{
              console.log('result.grupos.rowCount:', result.rowCount);
              if(result.rowCount > 0){
                if(text.length > 0){
                  text = text + ' ';
                }
                text = text + req.body.guia + ' ya tiene otro(s) grupo(s) este día.';
              }
              var statement = Utils.getReservaGuiaStatement(false);
              var params = [req.decoded.idultimaempresa, req.body.fecha, 'guia', req.headers['client-timezone']];
              Utils.log(statement + ' - ' + params);
              client.query(statement, params, function(err, result) {
                if (err){
                  Utils.handleError(res, done, err.message, "Error al guiasasignables.");
                }
                else{
                  done();
                  var dispGuia = result.rows.filter(function (el) {
                    return el.codigo == req.body.guia;
                  });
                  if(dispGuia.length <= 0 || dispGuia[0].jornada == '#' || dispGuia[0].jornada == 'N'){
                    if(text.length > 0){
                      text = text + ' ';
                    }
                    text = text + req.body.guia + ' no está disponible este día.';
                  }
                  console.log('getReservaGuiaStatement.dispGuia:', dispGuia);
                  res.status(200).json(text);
                }
              });
            }
          });
        }
      });
    }
  });
})

grupoRouter.route('/generateserie')
.put(Verify.verifyRead, function(req, res) {
  console.log('#############################');
  console.log('/grupos/generateserie/grupos:', req.body.grupos);
  console.log('#############################');
  Utils.pool.connect(function(err, client, done) {
    if(err){
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      if(req.body.grupos && req.body.grupos.length > 0 && req.body.grupos.length <= 100){
        var contSeries = req.body.grupos[0].numgruposdia || 1;
        var contInserts = 0;
        for (var i = 0; i < contSeries; i++) {
          var statement = 'INSERT INTO gt_grupo (idempresa, fechahora, ref, agencia, formapago, tipofactura, idusuario)' +
                          '            SELECT $1, day, $2, $3, p.formapago, p.tipofactura, $4 FROM' +
                          '                   generate_series($5::timestamp with time zone, $6::timestamp with time zone, \'7 day\') day' +
                          '            LEFT OUTER JOIN gt_pdu p ON p.idempresa = $1 AND p.tabla = \'agencia\' AND p.codigo = $3';
          var params = [req.decoded.idultimaempresa
                       ,req.body.grupos[0].ref
                       ,req.body.grupos[0].agencia
                       ,req.decoded.idusuario
                       ,req.body.grupos[0].fecha
                       ,req.body.grupos[req.body.grupos.length - 1].fecha];
          Utils.log(statement + ' - ' + params);
          client.query(statement, params, function(err, result) {
            if (err){
              Utils.handleError(res, done, err.message, "Error generando serie de grupos.");
            }
            else{
              contInserts++;
              if(contInserts >= contSeries){
                done();
                console.log('/grupos/generateserie/grupos:', result.rowCount);
                res.status(200).json();
              }
            }
          });
        }
      }
      else{
        done();
        res.status(200).json();
      }
    }
  });
})

grupoRouter.route('/markasreaded')
.put(Verify.verifyRead, function(req, res) {
  if(!req.body.idgrupo){
    req.body.idgrupo = 0;
  }
  console.log('#############################');
  console.log('/grupos/markasreaded:', req.body);
  console.log('#############################');
  Utils.pool.connect(function(err, client, done) {
    if(err){
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var statement = getGrupoStatement();
      var params = [req.decoded.idultimaempresa, req.body.idgrupo, req.headers['client-timezone']];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Error markasreaded getting grupo.");
        }
        else{
          if(result.rowCount > 0){
            result.rows[0].importe = parseFloat(result.rows[0].importe);
            var grupo = result.rows[0];
            grupo.exists = true;
            grupo.tarde = false;
            if(grupo.hora >= '1300'){ //TO-DO: parametrizar
              grupo.tarde = true;
            }
            //TO-DO:
            //grupo.orden = ??;
            //grupo.idprofilepicture = ??;
            var statement = 'SELECT g.ref, g.agencia, to_char(g.fechahora AT TIME ZONE $4, \'YYYY-MM-DD HH24:MI\') fechaed, u.pushsubscription' +
                            '  FROM gt_grupo g, gt_usuario u, gt_empresausuario eu' +
                            ' WHERE g.idempresa = $1 AND g.idgrupo = $2 AND u.idusuario = $3' +
                            '   AND eu.idempresa = g.idempresa AND eu.idusuario = u.idusuario';
            var params = [req.decoded.idultimaempresa, req.body.idgrupo, req.body.idfrom, req.headers['client-timezone']];
            Utils.log(statement + ' - ' + params);
            client.query(statement, params, function(err, result) {
              if (err){
                Utils.handleError(res, done, err.message, "Error enviando confirmación de lectura 1.");
              }
              else{
                done();
                if(result.rowCount > 0){
                  var payload = {
                    "notification":{
                      "title": req.decoded.nombrecompleto + ' dice:',
                      "body": '¡Recibido! (' + result.rows[0].ref + ' / ' + result.rows[0].agencia + ' / ' + result.rows[0].fechaed + ')',
                      "icon": "/images/users/" + req.decoded.idprofilepicture + ".jpg",
                      "badge": "/images/users/" + req.decoded.idprofilepicture + ".jpg",
                      "lang": "es",
                      "renotify": true,
                      "tag":+ new Date(),
                      "data":{
                        "idgrupo": 0,
                      },
                      "actions": [
                        {"action": 'close', title: 'Cerrar', "icon": 'images/xmark.png'},
                      ]
                    }
                  };
                  Utils.sendPushNotification(payload, result.rows[0].pushsubscription).then(
                      function successCallback(response) {
                        grupo.notificationSent = true;
                        res.status(200).json(grupo);
                    }, function errorCallback(response) {
                        grupo.notificationSent = false;
                        res.status(200).json(grupo);
                    });
                }
                else{
                  res.status(200).json({exists: false});
                }
              }
            });
          }
          else{
            done();
            res.status(200).json({exists: false});
          }
        }
      });
    }
  });
})

grupoRouter.route('/clonar')
.put(Verify.verifyRead, function(req, res) {
  if(!req.body.idgrupo){
    req.body.idgrupo = 0;
  }
  console.log('#############################');
  console.log('/grupos/clonar:', req.body);
  console.log('#############################');
  Utils.pool.connect(function(err, client, done) {
    if(err){
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var statement = 'INSERT INTO gt_grupo' +
                      '   (idempresa, fechahora, ref, puntoencuentro, agencia, idiomas, monumentos, pax, confirmado, puntofinal,' +
                      '    repite, repitecompleto, repitefecha, entradasincluidas, telefono, facilitagrupo, busempresa, busdatos,' +
                      '    guiacorreo, formapago, tipofactura, importe, observaciones, idusuario, tipovisita, horafinal)' +
                      ' SELECT idempresa, fechahora, ref, puntoencuentro, agencia, idiomas, monumentos, pax, confirmado, puntofinal,' +
                      '        repite, repitecompleto, repitefecha, entradasincluidas, telefono, facilitagrupo, busempresa, busdatos,' +
                      '        guiacorreo, formapago, tipofactura, importe, observaciones, $4, tipovisita, horafinal' +
                      '   FROM gt_grupo g' +
                      '   CROSS JOIN generate_series(1,$3)' +
                      '   WHERE idempresa = $1 AND idgrupo = $2';
      var params = [req.decoded.idultimaempresa, req.body.idgrupo, req.body.num, req.decoded.idusuario];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Error clonando grupo " + req.body.idgrupo + ' ' + req.body.num + ' veces.');
        }
        else{
          done();
          res.status(200).json();
        }
      });
    }
  });
})

grupoRouter.route('/sendpushtoguia')
.put(Verify.verifyRead, function(req, res) {
  if(!req.body.idgrupo){
    req.body.idgrupo = 0;
  }
  console.log('#############################');
  console.log('/grupos/sendpushtoguia:', req.body);
  console.log('#############################');
  Utils.pool.connect(function(err, client, done) {
    if(err){
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var statement = 'SELECT g.ref, g.agencia, g.puntoencuentro, g.idiomas, to_char(g.fechahora AT TIME ZONE $3, \'YYYY-MM-DD HH24:MI\') fechaed,' +
                      '       u.nombrecompleto, u.pushsubscription' +
                      ' FROM gt_grupo g, gt_pdu p, gt_usuario u' +
                      ' WHERE g.idempresa = $1 AND g.idgrupo = $2' +
                      '   AND g.guialocal = p.codigo AND p.idempresa = g.idempresa AND p.tabla = \'guia\'' +
                      '   AND p.idusuarioapp = u.idusuario';
      var params = [req.decoded.idultimaempresa, req.body.idgrupo, req.headers['client-timezone']];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Error sendpushtoguia grupo " + req.body.idgrupo + ' ' + req.body.num + ' veces.');
        }
        else{
          done();
          var payload = {
            "notification":{
              "title": req.decoded.nombrecompleto + ' dice:',
              "icon": "/images/users/" + req.decoded.idprofilepicture+ ".jpg",
              "badge": "/images/users/" + req.decoded.idprofilepicture+ ".jpg",
              "lang": "es",
              "renotify": true,
              "tag":+ new Date(),
              "data":{
                "idgrupo": req.body.idgrupo,
                "from": req.decoded.nombrecompleto,
                "idfrom": req.decoded.idusuario,
              },
              "actions": [
                {"action": 'close', title: 'Cerrar', "icon": 'images/xmark.png'},
              ]
            }
          };

          var user = (result.rowCount > 0 ? result.rows[0] : null);

          if(user && user.pushsubscription){
            payload.notification.body= 'Hola ' + user.nombrecompleto + ', tienes asignado el grupo ' + user.ref + ' (' + user.agencia + ')\n';
            payload.notification.body+= 'Fecha/Hora: ' + user.fechaed + '\n';
            payload.notification.body+= 'Pto.Enc: ' + user.puntoencuentro + ', Idiomas: ' + user.idiomas + '\n';
            Utils.sendPushNotification(payload, user.pushsubscription).then(
                function successCallback(response) {
                  res.status(200).json(true);
              }, function errorCallback(response) {
                  res.status(200).json(false);
            });
          }
          else{
            res.status(200).json(false);
          }
        }
      });
    }
  });
})

grupoRouter.route('/:idgrupo')
.get(Verify.verifyRead, function(req, res) {
  Utils.pool.connect(function(err, client, done) {
    if(err){
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var statement = getGrupoStatement();
      var params = [req.decoded.idultimaempresa, req.params.idgrupo, req.headers['client-timezone']];
      Utils.log(statement+ ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Error getting grupo.");
        }
        else{
          done();
          //result.rows[0].guialocal = result.rows[0].guialocal;
          if(result.rowCount > 0){
            result.rows[0].importe = parseFloat(result.rows[0].importe);
            result.rows[0].facturado = false;
            for (var i = 0; i < result.rows[0].facturas.length; i++) {
              if(result.rows[0].facturas[i].idusuarioemisor == req.decoded.idusuario){
                result.rows[0].facturado = true;
              }
            }
            res.status(200).json(result.rows[0]);
          }
          else{
            console.log('Error obteniendo grupo con id ' + req.params.idgrupo + '. El grupo no existe.');
            Utils.handleError(res, done, '', 'No existe el grupo.', 403);
            //res.status(200).json({});
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
      //Obtenemos información de posibles grupos vinculados (anterior y posterior)
      var statement = 'SELECT coalesce(g1.idgrupo,0) idgrupoorigen, TO_CHAR(g1.fechahora,\'YYYYMMDD\') fechaorigen,' +
                      '       coalesce(g3.idgrupo,0) idgrupodestino, TO_CHAR(g3.fechahora,\'YYYYMMDD\') fechadestino' +
                      '  FROM gt_grupo g2' +
                      '       LEFT OUTER JOIN gt_grupo g1 ON g1.idempresa = g1.idempresa AND g1.idgrupo = g2.idgrupoorigen' +
                      '       LEFT OUTER JOIN gt_grupo g3 ON g3.idempresa = g2.idempresa AND g3.idgrupoorigen = g2.idgrupo' +
                      ' WHERE g2.idempresa = $1 AND g2.idgrupo = $2';
      var params = [req.decoded.idultimaempresa, req.params.idgrupo];
      Utils.log(statement+ ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Error getting info to delete grupo.");
        }
        else{
          var idgrupoorigen = (result.rows[0].idgrupoorigen > 0) ? result.rows[0].idgrupoorigen : null;
          var idgrupodestino = (result.rows[0].idgrupodestino > 0) ? result.rows[0].idgrupodestino : null;
          var fechaorigen = result.rows[0].fechaorigen;
          var fechadestino = result.rows[0].fechadestino;
          //Borramos el grupo
          statement = 'DELETE FROM gt_grupo g WHERE idempresa = $1 AND idgrupo = $2';
          params = [req.decoded.idultimaempresa, req.params.idgrupo];
          Utils.log(statement+ ' - ' + params);
          client.query(statement, params, function(err, result) {
            if (err){
              Utils.handleError(res, done, err.message, "Error deleting grupo.");
            }
            else{
              //Vinculamos grupo posterior al anterior (si procede)
              statement = 'UPDATE gt_grupo SET idgrupoorigen = $3 WHERE idempresa = $1 AND idgrupoorigen = $2';
              params = [req.decoded.idultimaempresa, req.params.idgrupo, idgrupoorigen];
              Utils.log(statement+ ' - ' + params);
              client.query(statement, params, function(err, result) {
                if (err){
                  Utils.handleError(res, done, err.message, "Error updating grupo detino.");
                }
                else{
                  //TO-DO: quitar if cuando se estabilice el tratamiento de los repite
                  idgrupoorigen = 0;
                  if(idgrupoorigen){
                    //Actualizamos grupo anterior (si procede)
                    var repite = (idgrupodestino > 0 && fechaorigen != fechadestino);
                    var repitefecha = null;
                    if(repite){
                      repitefecha = fechadestino;
                    }
                    var repitecompleto = (idgrupodestino > 0 && fechaorigen == fechadestino);
                    statement = 'UPDATE gt_grupo SET repite = $3, repitefecha = $4, repitecompleto = $5 WHERE idempresa = $1 AND idgrupo = $2';
                    params = [req.decoded.idultimaempresa, idgrupoorigen, repite, repitefecha, repitecompleto];
                    Utils.log(statement+ ' - ' + params);
                    client.query(statement, params, function(err, result) {
                      if (err){
                        Utils.handleError(res, done, err.message, "Error updating grupo origen.");
                      }
                      else{
                        done();
                        res.status(200).json(result);
                      }
                    });
                  }
                  else{
                    done();
                    res.status(200).json(result);
                  }
                }
              });
            }
          });
        }
      });
    }
  });
})

function getGrupoStatement(){
  return  'SELECT g.*, u.nombre modusuarionombre, f.facturas, g2.idgrupo idgrupodestino, p.idusuarioapp idusuarioguia,' +
          '       to_char(g.fechahora AT TIME ZONE $3, \'YYYY-MM-DD HH24:MI\') fechaed,' +
          '       to_char(g.fechahora AT TIME ZONE $3, \'HH24:MI\') hora' +
          '  FROM gt_grupo g' +
          '  LEFT OUTER JOIN gt_usuario u ON u.idusuario = g.idusuario' +
          '  LEFT OUTER JOIN (SELECT $2::int idgrupo,' +
          '                          ARRAY (SELECT json_build_object(\'id\', idfactura, \'idusuarioemisor\', idusuarioemisor, \'factura\', codigo || \'/\' || tipofactura || \'/\' || numero || \'/\' || TO_CHAR(fecha,\'YY\'))' +
          '                     FROM' +
          //'                          gt_factura' +
          '                          (SELECT f.*, foo.codigo FROM gt_factura f LEFT OUTER JOIN (SELECT * FROM gt_pdu p WHERE p.idempresa = $1 AND p.tabla = \'guia\') foo ON f.idusuarioemisor = foo.idusuarioapp) f' +
          '                    WHERE idempresa = $1 AND $2 = ANY(grupos)) facturas) AS f ON f.idgrupo = g.idgrupo' +
          '  LEFT OUTER JOIN gt_grupo g2 ON g2.idempresa = g.idempresa AND g2.idgrupoorigen = g.idgrupo' +
          '  LEFT OUTER JOIN gt_pdu p ON p.idempresa = g.idempresa AND p.tabla = \'guia\' AND p.codigo = g.guialocal' +
          ' WHERE g.idempresa = $1 AND g.idgrupo = $2';
}

function getUpsertQuery(grupo, idempresa, idusuario){
  var result = {statement: '', params : []};
  if(!grupo.repite){
    grupo.repitefecha = null;
  }
  if(grupo.idgrupo == 0){
    result.statement=  'INSERT INTO gt_grupo (idempresa, ref, fechahora, guialocal, puntoencuentro, agencia, idiomas, monumentos, pax,'+
                       '                      confirmado, tipovisita, puntofinal, repite, repitefecha, repitecompleto, entradasincluidas,' +
                       '                      telefono, facilitagrupo, busempresa, busdatos, guiacorreo, formapago, tipofactura, importe,' +
                       '                      observaciones, horafinal, idgrupoorigen, anulado, observacionimportante, idusuario)' +
                       '              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,' +
                       '                      $21, $22, $23, $24, $25, $26, $27, $28, $29, $30) RETURNING idgrupo';
    result.params= [ idempresa,
                      grupo.ref,
                      grupo.fechahora,
                      grupo.guialocal,
                      grupo.puntoencuentro,
                      grupo.agencia,
                      grupo.idiomas,
                      grupo.monumentos,
                      grupo.pax || 0,
                      grupo.confirmado || false,
                      grupo.tipovisita || '',
                      grupo.puntofinal || '',
                      grupo.repite || false,
                      grupo.repitefecha,
                      grupo.repitecompleto || false,
                      grupo.entradasincluidas || false,
                      grupo.telefono || '',
                      grupo.facilitagrupo || '',
                      grupo.busempresa || '',
                      grupo.busdatos || '',
                      grupo.guiacorreo || '',
                      grupo.formapago || '',
                      grupo.tipofactura || '',
                      grupo.importe || 0,
                      grupo.observaciones || '',
                      grupo.horafinal,
                      grupo.idgrupoorigen,
                      grupo.anulado || false,
                      grupo.observacionimportante || false,
                      idusuario];
  }
  else{
    result.statement=  'UPDATE gt_grupo' +
                        '   SET ref                   =  $1,' +
                        '       fechahora             =  $2,' +
                        '       guialocal             =  $3,' +
                        '       puntoencuentro        =  $4,' +
                        '       agencia               =  $5,' +
                        '       idiomas               =  $6,' +
                        '       monumentos            =  $7,' +
                        '       pax                   =  $8,' +
                        '       confirmado            =  $9,' +
                        '       tipovisita            = $10,' +
                        '       puntofinal            = $11,' +
                        '       repite                = $12,' +
                        '       repitefecha           = $13,' +
                        '       repitecompleto        = $14,' +
                        '       entradasincluidas     = $15,' +
                        '       telefono              = $16,' +
                        '       facilitagrupo         = $17,' +
                        '       busempresa            = $18,' +
                        '       busdatos              = $19,' +
                        '       guiacorreo            = $20,' +
                        '       formapago             = $21,' +
                        '       tipofactura           = $22,' +
                        '       importe               = $23,' +
                        '       observaciones         = $24,' +
                        '       horafinal             = $25,' +
                        '       idgrupoorigen         = $26,' +
                        '       anulado               = $27,' +
                        '       observacionimportante = $28,' +
                        '       idusuario             = $29'  +
                        ' WHERE idempresa             = $30'  +
                        '   AND idgrupo               = $31'  +
                        ' RETURNING idgrupo';
    result.params= [  grupo.ref,
                      grupo.fechahora,
                      grupo.guialocal,
                      grupo.puntoencuentro,
                      grupo.agencia,
                      grupo.idiomas,
                      grupo.monumentos,
                      grupo.pax,
                      grupo.confirmado,
                      grupo.tipovisita,
                      grupo.puntofinal,
                      grupo.repite,
                      grupo.repitefecha,
                      grupo.repitecompleto,
                      grupo.entradasincluidas,
                      grupo.telefono,
                      grupo.facilitagrupo,
                      grupo.busempresa,
                      grupo.busdatos,
                      grupo.guiacorreo,
                      grupo.formapago,
                      grupo.tipofactura,
                      grupo.importe,
                      grupo.observaciones,
                      grupo.horafinal,
                      grupo.idgrupoorigen,
                      grupo.anulado || false,
                      grupo.observacionimportante || false,
                      idusuario,
                      idempresa,
                      grupo.idgrupo];
  }
  return result;
}

function saveGrupo(client, cb){
  // everything in here is run as a transaction
  var req = client.req;
  // Leemeos el grupo antes de actualizarlo
  var statement = 'SELECT * FROM gt_grupo WHERE idempresa = $1 AND idgrupo = $2';
  var params = [req.decoded.idultimaempresa, req.body.grupo.idgrupo];
  Utils.log(statement+ ' - ' + params);
  client.query(statement, params, function(err, result) {
    if (err){
      return cb(err, null);
    }
    else{
      var grupo_v0 = (result.rowCount > 0 ? result.rows[0] : {repite: false, repitecompleto: false});

      //Update grupo:
      var upsert = getUpsertQuery(req.body.grupo, req.decoded.idultimaempresa, req.decoded.idusuario);
      statement = upsert.statement;
      params = upsert.params;
      //console.log('############################################################');
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err || result.rowCount == 0){
          console.log(err);
          return cb(err, null);
        }
        else{
          var idgrupo = result.rows[0].idgrupo;
          req.body.grupo.idgrupo = idgrupo;
          //console.log('grupo_v0:', grupo_v0);
          //console.log('req.body.grupo:', req.body.grupo);
          if(!grupo_v0.repite && req.body.grupo.repite){
            var upsert = getUpsertQuery(getGrupoRepite(req.body.grupo), req.decoded.idultimaempresa, req.decoded.idusuario);
            statement = upsert.statement;
            params = upsert.params;
            Utils.log(statement + ' - ' + params);
            client.query(statement, params, function(err, result) {
              if (err){
                return cb(err, null);
              }
              else{
                req.body.grupo.repite = false;
                if(!grupo_v0.repitecompleto && req.body.grupo.repitecompleto){
                  var upsert = getUpsertQuery(getGrupoRepite(req.body.grupo), req.decoded.idultimaempresa, req.decoded.idusuario);
                  statement = upsert.statement;
                  params = upsert.params;
                  Utils.log(statement + ' - ' + params);
                  client.query(statement, params, function(err, result) {
                    if (err){
                      return cb(err, null);
                    }
                    else{
                      console.log('###1### idgrupo:', idgrupo);
                      cb(null, idgrupo);
                    }
                  });
                }
                else{
                  console.log('###2### idgrupo:', idgrupo);
                  cb(null, idgrupo);
                }
              }
            });
          }
          else{
            if(!grupo_v0.repitecompleto && req.body.grupo.repitecompleto){
              var upsert = getUpsertQuery(getGrupoRepite(req.body.grupo), req.decoded.idultimaempresa, req.decoded.idusuario);
              statement = upsert.statement;
              params = upsert.params;
              Utils.log(statement + ' - ' + params);
              client.query(statement, params, function(err, result) {
                if (err){
                  return cb(err, null);
                }
                else{
                  console.log('###3### idgrupo:', idgrupo);
                  cb(null, idgrupo);
                }
              });
            }
            else{
              console.log('###4### idgrupo:', idgrupo);
              cb(null, idgrupo);
            }
          }
        }
      });
    }
  });
}

function getGrupoRepite(grupo){
  console.log('getGrupoRepite1:', grupo);
  var result = JSON.parse(JSON.stringify(grupo));

  result.idgrupoorigen = grupo.idgrupo;
  result.idgrupo = 0;

  grupo.fechahora = new Date(grupo.fechahora);
  grupo.repitefecha = new Date(grupo.repitefecha);
  if(grupo.repite){ //otro día
    //result.fechahora = new Date(grupo.repitefecha);
    result.fechahora = new Date(grupo.repitefecha.getFullYear()
                               ,grupo.repitefecha.getMonth()
                               ,grupo.repitefecha.getDate()
                               ,grupo.fechahora.getHours()
                               ,grupo.fechahora.getMinutes()
                               ,0);
  }
  else{ //por la tarde
    //result.fechahora = new Date(grupo.fechahora);
    result.fechahora = new Date(grupo.fechahora.getFullYear(), grupo.fechahora.getMonth(), grupo.fechahora.getDate(), 16, 0, 0);
  }

  result.repite = false;
  result.repitefecha = null;
  result.repitecompleto = false;

  console.log('getGrupoRepite2:', result);

  return result;
}

//TO-DO: borrar cuando se estabilice la gestión de los repite
function saveGrupoConRepite(client, cb){
  // everything in here is run as a transaction
  var req = client.req;
  // Leemeos el grupo antes de actualizarso
  var statement = 'SELECT * FROM gt_grupo WHERE idempresa = $1 AND idgrupo = $2';
  var params = [req.decoded.idultimaempresa, req.body.grupo.idgrupo];
  Utils.log(statement+ ' - ' + params);
  client.query(statement, params, function(err, result) {
    if (err){
      return cb(err, null);
    }
    else{
      var grupo_v0 = result.rowCount > 0 ? result.rows[0] : null;

      //Update grupo:
      var upsert = getUpsertQuery(req.body.grupo, req.decoded.idultimaempresa, req.decoded.idusuario);
      statement = upsert.statement;
      params = upsert.params;
      console.log('############################################################');
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
          console.log(err);
          return cb(err, null);
        }
        else{
          var idgrupo = result.rows[0].idgrupo;
          //Update grupo destino
          //Update grupo origen
          //Obtenemos id del posible grupo origen
          statement = 'SELECT coalesce(g1.idgrupo,0) idgrupoorigen' +
                      '  FROM gt_grupo g2' +
                      '       LEFT OUTER JOIN gt_grupo g1 ON g1.idempresa = g1.idempresa AND g1.idgrupo = g2.idgrupoorigen' +
                      ' WHERE g2.idempresa = $1 AND g2.idgrupo = $2';
          params = [req.decoded.idultimaempresa, idgrupo];
          Utils.log(statement + ' - ' + params);
          client.query(statement, params, function(err, result) {
            if (err){
              return cb(err, null);
            }
            else{
              var idgrupoorigen = result.rows[0].idgrupoorigen;
              //Actualizamos fecha (manteniendo la hora) grupo posterior (si procede)
              statement = 'UPDATE gt_grupo g1' +
                          '   SET fechahora = TO_TIMESTAMP((SELECT CASE WHEN repite THEN TO_CHAR(repitefecha AT TIME ZONE $3,\'YYYYMMDD\') || TO_CHAR(g1.fechahora,\'HH24MI\')' +
                          '                               ELSE TO_CHAR(fechahora AT TIME ZONE $3,\'YYYYMMDD\') || TO_CHAR(g1.fechahora,\'HH24MI\')' +
                          '                        END fecha' +
                          '                     FROM gt_grupo g2 WHERE g2.idempresa = g1.idempresa AND g2.idgrupo = g1.idgrupoorigen),\'YYYYMMDDHH24MI\')' +
                          ' WHERE g1.idempresa = $1 AND g1.idgrupoorigen = $2';
              params = [req.decoded.idultimaempresa, idgrupo, req.headers['client-timezone']];
              Utils.log(statement + ' - ' + params);
              client.query(statement, params, function(err, result) {
                if (err){
                  return cb(err, null);
                }
                else{
                  //Actualizamos repite, repitefecha y repitecompleto del grupo anterior (si procede)
                  statement = 'UPDATE gt_grupo' +
                              '   SET repite = (SELECT CASE WHEN TO_CHAR(g1.fechahora,\'YYYYMMDD\') = TO_CHAR(g2.fechahora,\'YYYYMMDD\') THEN false ELSE true END' +
                              '           FROM gt_grupo g1, gt_grupo g2 WHERE g1.idempresa = $1 AND g1.idgrupo = $2 AND g2.idempresa = g1.idempresa AND g2.idgrupoorigen = g1.idgrupo),' +
                              '     repitefecha = (SELECT CASE WHEN TO_CHAR(g1.fechahora,\'YYYYMMDD\') = TO_CHAR(g2.fechahora,\'YYYYMMDD\') THEN null ELSE g2.fechahora END' +
                              '                FROM gt_grupo g1, gt_grupo g2 WHERE g1.idempresa = $1 AND g1.idgrupo = $2 AND g2.idempresa = g1.idempresa AND g2.idgrupoorigen = g1.idgrupo),' +
                              '     repitecompleto = (SELECT CASE WHEN TO_CHAR(g1.fechahora,\'YYYYMMDD\') = TO_CHAR(g2.fechahora,\'YYYYMMDD\') THEN true ELSE false END' +
                              '                   FROM gt_grupo g1, gt_grupo g2 WHERE g1.idempresa = $1 AND g1.idgrupo = $2 AND g2.idempresa = g1.idempresa AND g2.idgrupoorigen = g1.idgrupo)' +
                              ' WHERE idempresa = $1 AND idgrupo = $2';
                  params = [req.decoded.idultimaempresa, idgrupoorigen];
                  Utils.log(statement + ' - ' + params);
                  console.log('############################################################');
                  client.query(statement, params, function(err, result) {
                    if (err){
                      return cb(err, null);
                    }
                    else{
                      //Comprobar si hay que borrar o insertar el grupo destino
                      var operacionDestino = getOperacionDestino(grupo_v0, req.body.grupo);
                      if(operacionDestino == 'delete'){
                        statement = 'DELETE FROM gt_grupo WHERE idempresa = $1 AND idgrupoorigen = $2';
                        params = [req.decoded.idultimaempresa, idgrupo];
                        Utils.log(statement + ' - ' + params);
                        client.query(statement, params, function(err, result) {
                          if (err){
                            return cb(err, null);
                          }
                          else{
                            cb(null, idgrupo);
                          }
                        });
                      }
                      else{
                        if(operacionDestino == 'insert'){
                            //Modificamos req.body.grupo para insertarlo como grupo destino:
                            req.body.grupo.idgrupo = 0;
                            req.body.grupo.idgrupoorigen = idgrupo;
                            console.log('req.body.grupo.fechahora:', req.body.grupo.fechahora);
                            console.log('req.body.grupo.repitefecha:', req.body.grupo.repitefecha);
                            if(req.body.grupo.repite){
                              req.body.grupo.fechahora = new Date(req.body.grupo.fechahora);
                              req.body.grupo.repitefecha = new Date(req.body.grupo.repitefecha);
                              //req.body.grupo.fechahora = new Date(req.body.grupo.repitefecha.getFullYear(), req.body.grupo.repitefecha.getMonth(), req.body.grupo.repitefecha.getDate(), req.body.grupo.fechahora.getHours(), req.body.grupo.fechahora.getMinutes(), 0);
                              req.body.grupo.fechahora = req.body.grupo.repitefecha;
                            }
                            if(req.body.grupo.repitecompleto){
                              req.body.grupo.fechahora = new Date(req.body.grupo.fechahora);
                              req.body.grupo.fechahora = new Date(req.body.grupo.fechahora.getFullYear(), req.body.grupo.fechahora.getMonth(), req.body.grupo.fechahora.getDate(), 16, 0, 0);
                            }
                            console.log('req.body.grupo.fechahora:', req.body.grupo.fechahora);

                            //req.body.grupo.monumentos = null;
                            //req.body.grupo.guialocal = '';
                            req.body.grupo.repite = false;
                            req.body.grupo.repitefecha = null;
                            req.body.grupo.repitecompleto = false;
                            var upsert = getUpsertQuery(req.body.grupo, req.decoded.idultimaempresa, req.decoded.idusuario);
                            statement = upsert.statement;
                            params = upsert.params;
                            Utils.log(statement + ' - ' + params);
                            client.query(statement, params, function(err, result) {
                              if (err){
                                return cb(err, null);
                              }
                              else{
                                cb(null, idgrupo);
                              }
                            });
                        }
                        else{
                          cb(null, idgrupo);
                        }
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
  });
}

function getOperacionDestino(g0, g1){
  if(!g0){
    g0 = {repite : false, repitecompleto: false}
  }
  if(!g0.repite && !g0.repitecompleto && !g1.repite && !g1.repitecompleto){return 'delete';}
  if(!g0.repite && !g0.repitecompleto &&  g1.repite && !g1.repitecompleto){return 'insert';}
  if(!g0.repite && !g0.repitecompleto && !g1.repite &&  g1.repitecompleto){return 'insert';}
  if( g0.repite && !g0.repitecompleto && !g1.repite && !g1.repitecompleto){return 'delete';}
  if( g0.repite && !g0.repitecompleto &&  g1.repite && !g1.repitecompleto){return 'update_repite';}
  if( g0.repite && !g0.repitecompleto && !g1.repite &&  g1.repitecompleto){return 'update_completo';}
  if(!g0.repite &&  g0.repitecompleto && !g1.repite && !g1.repitecompleto){return 'delete';}
  if(!g0.repite &&  g0.repitecompleto &&  g1.repite && !g1.repitecompleto){return 'update_repite';}
  if(!g0.repite &&  g0.repitecompleto && !g1.repite &&  g1.repitecompleto){return 'update_completo';}
}

;

module.exports= grupoRouter;