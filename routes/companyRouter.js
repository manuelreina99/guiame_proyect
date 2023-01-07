// Routes '/companies

var express = require('express');
var bodyParser = require('body-parser');
var Utils = require('../utils');
var Verify = require('../verify');
var pgTransact = require('pg-transact');
var bcrypt = require("bcrypt-node");             // hash passwords
var empresaRouter = express.Router({mergeParams: true}); //mergeParams preserve the req.params values from the parent router.

empresaRouter.use(bodyParser.json());
empresaRouter.route('/')

// get all of a user's companies
.get(Verify.verifyRead, function(req, res) {
  Utils.pool.connect(function(err, client, done) {
    if(err) {
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var statement = 'SELECT e.idempresa, e.nombre, e.nombrecompleto, e.idprofilepicture, eu.status' +
                      '  FROM gt_empresa e, gt_empresausuario eu' +
                      ' WHERE e.idempresa = eu.idempresa AND eu.idusuario = $1' +
                      ' ORDER BY e.nombrecompleto';
      var params = [req.decoded.idusuario];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if(err) {
          Utils.handleError(res, done, err.message, "Error getting empresas.");
        }
        else{
          done();
          res.status(200).json(result.rows);
        }
      });
    }
  });
})

.put(Verify.verifyRead, Verify.verifyWrite, Verify.verifyBoss, function(req, res) {
  Utils.pool.connect(function(err, client, done) {
    if(err) {
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var statement = 'UPDATE gt_empresa SET' +
                      '       nombrecompleto   = $1,' +
                      '       identificacion   = $2,' +
                      '       telefono         = $3,' +
                      '       fax              = $4,' +
                      '       email            = $5,' +
                      '       web              = $6,' +
                      '       direccion        = $7,' +
                      '       poblacion        = $8,' +
                      '       provincia        = $9,' +
                      '       codigopostal     = $10,' +
                      '       idprofilepicture = $11,' +
                      ' WHERE idempresa = (SELECT idempresa FROM gt_empresausuario eu' +
                      '                     WHERE eu.idusuario = $12' +
                      '                       AND eu.idempresa = $13)';
      var params = [req.body.fullname,
                    req.body.oficialid,
                    req.body.phone,
                    req.body.fax,
                    req.body.email,
                    req.body.web,
                    req.body.address,
                    req.body.town,
                    req.body.province,
                    req.body.zipcode,
                    req.body.idprofilepicture,
                    req.decoded.idusuario,
                    req.decoded.idultimaempresa];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if(err) {
          Utils.handleError(res, done, err.message, "Error updating empresa.");
        }
        else{
          done();
          res.status(200).json(result.rows);
        }
      });
    }
  });
});

empresaRouter.route('/basicInfo')
.get(Verify.verifyRead, function(req, res) {
  Utils.pool.connect(function(err, client, done) {
    if(err) {
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var statement = 'SELECT e.*, u.nombrecompleto user FROM gt_empresa c, gt_usuario u' +
                      ' WHERE e.idempresa = $1' +
                      '   AND u.idusuario = $2';
      var params = [req.decoded.idultimaempresa, req.decoded.idusuario];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if(err) {
          Utils.handleError(res, done, err.message, "Error getting basic info from empresa.");
        }
        else{
          done();
          res.status(200).json(result.rows[0]);
        }
      });
    }
  });
})

empresaRouter.route('/appingreso')
.get(Verify.verifyRead, function(req, res) {
  Utils.pool.connect(function(err, client, done) {
    if(err) {
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var statement = 'SELECT * FROM gt_appingreso' +
                      ' WHERE idempresa = $1' +
                      ' ORDER BY fecha DESC';
      var params = [req.decoded.idultimaempresa];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if(err) {
          Utils.handleError(res, done, err.message, "Error getting apuntes from empresa.");
        }
        else{
          done();
          res.status(200).json(result.rows);
        }
      });
    }
  });
})

.put(Verify.verifyRead, Verify.verifyWrite, Verify.verifyAdmin, function(req, res) {
  Utils.pool.connect(function(err, client, done) {
    if(err) {
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      console.log('apunte:',req.body.apunte);
      var statement = 'INSERT INTO gt_appingreso (idempresa, fecha, importe, descripcion, idusuario)' +
                      ' VALUES($1, $2, $3, $4, $5)';
      var params = [req.decoded.idultimaempresa
                   ,req.body.apunte.fecha
                   ,req.body.apunte.importe
                   ,req.body.apunte.descripcion
                   ,req.decoded.idusuario
                   ];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if(err) {
          Utils.handleError(res, done, err.message, "Error inserting apunte in empresa.");
        }
        else{
          done();
          res.status(200).json(result.rows);
        }
      });
    }
  });
})

empresaRouter.route('/defectoguardias')
.get(Verify.verifyRead, function(req, res) {
  Utils.pool.connect(function(err, client, done) {
    if(err) {
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var statement = 'SELECT p.codigo, p.nombre, p.guardiaorden, p.guardianumdias, u.nombre picturename, u.idprofilepicture, e.inicioguardia' +
                      '  FROM gt_pdu p, gt_usuario u, gt_empresa e' +
                      ' WHERE p.idempresa = $1' +
                      '   AND p.tabla = $2'+
                      '   AND fijo IS true' +
                      '   AND u.idusuario = p.idusuarioapp' +
                      '   AND e.idempresa = p.idempresa' +
                      ' ORDER BY guardiaorden';
      var params = [req.decoded.idultimaempresa, 'guia'];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if(err) {
          Utils.handleError(res, done, err.message, "Error getting defectoguardias.");
        }
        else{
          done();
          var defectoguardias = {fechainicio: new Date(), usuarios: []}
          if(result.rowCount > 0){
            defectoguardias = {fechainicio: result.rows[0].inicioguardia, usuarios: result.rows}
          }
          res.status(200).json(defectoguardias);
        }
      });
    }
  });
})

.put(Verify.verifyRead, Verify.verifyWrite, function(req, res) {
  Utils.pool.connect(function(err, client, done) {
    if(err) {
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var statement = 'UPDATE gt_empresa SET inicioguardia = $1, idusuario = $2 WHERE idempresa = $3';
      console.log('req.decoded:', req.decoded);
      var params = [req.body.fechainicio, req.decoded.idusuario, req.decoded.idultimaempresa];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if(err) {
          Utils.handleError(res, done, err.message, "Error getting defectoguardias.");
        }
        else{
          var maxUpdates = req.body.usuarios.length;
          var contUpdates = 0;
          for (var i = 0; i < req.body.usuarios.length; i++) {
            statement = 'UPDATE gt_pdu SET guardiaorden = $1, guardianumdias = $2, idusuario = $3 WHERE idempresa = $4 AND tabla = $5 AND codigo = $6';
            params = [req.body.usuarios[i].guardiaorden
                     ,req.body.usuarios[i].guardianumdias
                     ,req.decoded.idusuario
                     ,req.decoded.idultimaempresa
                     ,'guia'
                     ,req.body.usuarios[i].codigo];
            Utils.log(statement + ' - ' + params);
            client.query(statement, params, function(err, result) {
              if(err) {
                Utils.handleError(res, done, err.message, "Error getting defectoguardias.");
              }
              else{
                contUpdates++;
                if(contUpdates >= maxUpdates){
                  done();
                  res.status(200).json();
                }
              }
            });
          }
        }
      });
    }
  });
})

empresaRouter.route('/excepcionesguardias')
.get(Verify.verifyRead, function(req, res) {
  Utils.pool.connect(function(err, client, done) {
    if(err) {
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var statement = getExcepcionesGuardiasStatement();
      var params = [req.decoded.idultimaempresa, 'guia'];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if(err) {
          Utils.handleError(res, done, err.message, "Error getting excepcionesguardias.");
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
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      console.log('req.body.excepcion:', req.body.excepcion);
      var statement = 'INSERT INTO gt_guardia (idempresa, fechaini, fechafin, idusuarioguardia, idusuario)' +
                      '            SELECT $1, $2, $3, idusuarioapp, $5' +
                      '              FROM gt_pdu WHERE idempresa = $1 AND tabla = \'guia\' AND codigo = $4';
      var params = [req.decoded.idultimaempresa
                   ,req.body.excepcion.fechaini
                   ,req.body.excepcion.fechafin
                   ,req.body.excepcion.codigousuario
                   ,req.decoded.idusuario];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if(err) {
          Utils.handleError(res, done, err.message, "Error insert gt_guardia.");
        }
        else{
          var statement = getExcepcionesGuardiasStatement();
          var params = [req.decoded.idultimaempresa, 'guia'];
          Utils.log(statement + ' - ' + params);
          client.query(statement, params, function(err, result) {
            if(err) {
              Utils.handleError(res, done, err.message, "Error getting excepcionesguardias.");
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

empresaRouter.route('/excepcionesguardias/:idguardia')
.delete(Verify.verifyRead, Verify.verifyWrite, function(req, res) {
  Utils.pool.connect(function(err, client, done) {
    if(err) {
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      console.log('req.body.excepcion:', req.body.excepcion);
      var statement = 'DELETE FROM gt_guardia WHERE idempresa = $1 AND idguardia = $2';
      var params = [req.decoded.idultimaempresa, req.params.idguardia];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if(err) {
          Utils.handleError(res, done, err.message, "Error delete gt_guardia.");
        }
        else{
          var statement = getExcepcionesGuardiasStatement();
          var params = [req.decoded.idultimaempresa, 'guia'];
          Utils.log(statement + ' - ' + params);
          client.query(statement, params, function(err, result) {
            if(err) {
              Utils.handleError(res, done, err.message, "Error getting excepcionesguardias.");
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


empresaRouter.route('/quienestadeguardia')
.put(Verify.verifyRead, function(req, res) {
  Utils.pool.connect(function(err, client, done) {
    if(err) {
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      if(!req.body.fechaini){
        req.body.fechaini = new Date();
      }
      var statement = 'SELECT p.codigo, p.nombre, u.idprofilepicture' +
                      '  FROM gt_guardia g' +
                      '       LEFT OUTER JOIN gt_pdu p ON p.idempresa = g.idempresa AND p.tabla = \'guia\' AND p.idusuarioapp = g.idusuarioguardia' +
                      '       LEFT OUTER JOIN gt_usuario u ON u.idusuario = g.idusuarioguardia' +
                      ' WHERE g.idempresa = $1' +
                      '   AND TO_CHAR(g.fechaini AT TIME ZONE $3,\'YYYYMMDD\') <= TO_CHAR($2 AT TIME ZONE $3,\'YYYYMMDD\')' +
                      '   AND TO_CHAR(g.fechafin AT TIME ZONE $3,\'YYYYMMDD\') >= TO_CHAR($2 AT TIME ZONE $3,\'YYYYMMDD\')';
      var params = [req.decoded.idultimaempresa, req.body.fechaini, req.headers['client-timezone']];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if(err) {
          Utils.handleError(res, done, err.message, "Error getting quienestadeguardia of " + req.body.fechaini);
        }
        else{
          var usuarioGuardia = null;
          if(result.rowCount > 0){
            done();
            usuarioGuardia = result.rows[0];
            res.status(200).json(usuarioGuardia);
          }
          else{
            statement = 'SELECT e.idempresa, (($1 AT TIME ZONE $4)::date - inicioguardia AT TIME ZONE $4) diffdias,' +
                        '       SUM(p.guardianumdias), mod((($1 AT TIME ZONE $4)::date - (inicioguardia AT TIME ZONE $4)::date), SUM(p.guardianumdias)) diasciclo' +
                        '  FROM gt_empresa e, gt_pdu p' +
                        ' WHERE e.idempresa = $2 AND p.idempresa = e.idempresa AND p.tabla = $3 AND p.fijo IS true' +
                        ' GROUP BY e.idempresa';
            params = [req.body.fechaini, req.decoded.idultimaempresa, 'guia', req.headers['client-timezone']];
            Utils.log(statement + ' - ' + params);
            client.query(statement, params, function(err, result) {
              if(err) {
                Utils.handleError(res, done, err.message, "Error getting quienestadeguardia of " + req.body.fechaini);
              }
              else{
                var diasCiclo = (result.rowCount > 0 ? result.rows[0].diasciclo : 0);
                statement = 'SELECT p.codigo, p.nombre, p.guardianumdias FROM gt_pdu p WHERE idempresa = $1 AND tabla = $2 AND fijo IS true ORDER BY guardiaorden';
                params = [req.decoded.idultimaempresa, 'guia'];
                Utils.log(statement + ' - ' + params);
                client.query(statement, params, function(err, result) {
                  if(err) {
                    Utils.handleError(res, done, err.message, "Error getting quienestadeguardia of " + req.body.fechaini);
                  }
                  else{
                    done();
                    //console.log('diasCiclo:', diasCiclo);
                    //console.log('result.rows:', result.rows);
                    if(diasCiclo < 0){
                      usuarioGuardia = null;
                    }
                    else{
                      for (var i = 0; i < result.rows.length; i++) {
                        if(result.rows[i].guardianumdias > diasCiclo){
                          usuarioGuardia = result.rows[i];
                          break;
                        }
                        else{
                          diasCiclo = diasCiclo - result.rows[i].guardianumdias;
                        }
                      }
                    }
                    res.status(200).json(usuarioGuardia);
                  }
                });
              }
            });
          }
        }
      });
    }
  });
})

// Change current user's active empresa
empresaRouter.route('/setempresa')
.put(Verify.verifyRead, function(req, res) {
  if (req.body.id == null){
    Utils.handleError(res, function(){}, "Bad request", "Must provide idempresa.", 400);
  }
  else{
    Utils.pool.connect(function(err, client, done) {
      if(err) {
        Utils.handleError(res, done, err.message, "error fetching client from pool");
      }
      else{
        var statement = 'SELECT * FROM gt_usuario u, gt_empresausuario eu, gt_empresa e' +
                        ' WHERE u.idusuario = $1' +
                        '   AND u.idusuario = eu.idusuario AND e.idempresa = eu.idempresa AND eu.idempresa = $2 AND eu.status = TRUE';
        var params = [req.decoded.idusuario, req.body.id];
        Utils.log(statement + ' - ' + params);
        client.query(statement, params, function(err, result) {
          if (err){
            Utils.handleError(res, done, err.message, "Error setting empresa.");
          }
          else
          {
            if(result.rows.length > 0){
              var statement = 'UPDATE gt_usuario SET idultimaempresa = $1 WHERE idusuario = $2';
              var params = [req.body.id, req.decoded.idusuario];
              Utils.log(statement + ' - ' + params);
              client.query(statement, params, function(err, result) {
                if (err){
                  Utils.handleError(res, done, err.message, "Error setting empresa.");
                }
                else
                {
                  var statement = Utils.loginStatement() + ' AND u.idusuario = $1';
                  var params = [req.decoded.idusuario];
                  Utils.log(statement + ' - ' + params);
                  client.query(statement, params, function(err, result) {
                    if (err){
                      Utils.handleError(res, done, err.message, "Error setting empresa. Bad token.");
                    }
                    else{
                      done();
                      var user = Utils.getLoginUser(result.rows[0]);
                      // get user's companies count
                      var statement = 'SELECT count(*) numcompanies' +
                                      '  FROM gt_empresausuario' +
                                      ' WHERE idusuario = $1';
                      var params = [user.idusuario];
                      Utils.log(statement + ' - ' + params);
                      client.query(statement, params, function(err, result) {
                        done();
                        if (err){
                          Utils.handleError(res, done, err.message, "Login failed (select count).");
                        }
                        else{
                          user.numcompanies = parseInt(result.rows[0].numcompanies);
                          user.isLoggedIn = true;
                          res.status(200).json(user);
                        }
                      });
                    }
                  });
                }
              });
            }
            else{
              Utils.handleError(res, done, 'Ponte en contacto con nosotros', 'Ops! Se ha producido un error al cambiar de empresa.');
            }
          }
        });
      }
    });
  }
})

// all users can send contacts emails, registered or not
empresaRouter.route('/contactemail')
.put(function(req, res) {
  Utils.pool.connect(function(err, client, done) {
    if(err) {
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var helper = require('sendgrid').mail;
      var from_email = new helper.Email(req.body.email);
      var to_email = new helper.Email(process.env.CONTACT_EMAIL);
      if (!req.body.nombre){
        req.body.nombre = 'anonymous';
      }
      var subject = 'Pean Stack Client Email from WWW (' + req.body.nombre + ')';
      var content = new helper.Content('text/plain', req.body.body);
      var mail = new helper.Mail(from_email, subject, to_email, content);
       
      var sg = require('sendgrid')(process.env.SENDGRID_API_KEY);
      var request = sg.emptyRequest({
        method: 'POST',
        path: '/v3/mail/send',
        body: mail.toJSON(),
      });


      sg.API(request, function(err, response) {
        if (err){
          console.log(err.response.body.errors);
          Utils.handleError(res, done, err.message, "Error sending email from contactemail router (sendgrid).");
        }
        else{
          res.status(response.statusCode).json(response);
        }
      });
    }
  });
})

empresaRouter.route('/reservaguias')
.put(Verify.verifyRead, Verify.verifyWrite, function(req, res) {
  console.log('/reservaguias.put-req.body:',req.body);
  Utils.pool.connect(function(err, client, done) {
    if(err) {
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var statement = 'INSERT INTO gt_reservaguia (idempresa, fecha, guia, jornada, idusuario) VALUES ($1, $2, $3, $4, $5)';
      var params = [req.decoded.idultimaempresa,
                    req.body.fecha,
                    req.body.guia,
                    req.body.jornada,
                    req.decoded.idusuario];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if(err) {
          if(err.code == 23505){
            var statement = 'UPDATE gt_reservaguia SET jornada = $4, idusuario = $5 WHERE idempresa = $1 AND fecha = $2 AND guia = $3';
            var params = [req.decoded.idultimaempresa,
              req.body.fecha,
              req.body.guia,
              req.body.jornada,
              req.decoded.idusuario];
            Utils.log(statement + ' - ' + params);
            client.query(statement, params, function(err, result) {
              if(err) {
                Utils.handleError(res, done, err.message, "Error insert gt_reservaguia 2.");
              }
              else{
                done();
                res.status(200).json();
              }
            });

          }
          else{
            Utils.handleError(res, done, err.message, "Error insert gt_reservaguia.");
          }
        }
        else{
          done();
          res.status(200).json();
        }
      });
    }
  });
})

.post(Verify.verifyRead, Verify.verifyWrite, function(req, res) {
  Utils.pool.connect(function(err, client, done) {
    if(err){
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var statement;
      var params;
      if(req.body.fijo && req.body.jornada == 'C'){
        statement = 'INSERT INTO gt_reservaguia (idempresa, fecha, guia, jornada, idusuario) VALUES ($1, $2, $3, $4, $5)';
        var params = [req.decoded.idultimaempresa, req.body.fecha, req.body.guia, 'N', req.decoded.idusuario];
      }
      else{
        statement = 'DELETE FROM gt_reservaguia g WHERE idempresa = $1 AND fecha = $2 AND guia = $3';
        params = [req.decoded.idultimaempresa, req.body.fecha, req.body.guia];
      }
      Utils.log(statement+ ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Error deleting grupo.");
        }
        else{
          done();
          res.status(200).json();
        }
      });
    }
  });
})

empresaRouter.route('/reservaguias/:date')
.get(Verify.verifyRead, function(req, res) {
  //console.log('/reservaguias/:date', req.params.date);
  console.log('/reservaguias.get-req.params:',req.params);
  Utils.pool.connect(function(err, client, done) {
    if(err) {
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var statement = Utils.getReservaGuiaStatement(true);
      var params = [req.decoded.idultimaempresa, req.params.date, 'guia', req.headers['client-timezone']];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if(err) {
          Utils.handleError(res, done, err.message, "Error getting reservaguias of " + req.params.date);
        }
        else{
          var reservas = result.rows;
          statement = 'SELECT guialocal, count(*) numgrupos' +
                      '  FROM gt_grupo' +
                      ' WHERE idempresa = $1' +
                      '   AND to_char(fechahora AT TIME ZONE $2, \'YYYY-MM-DD\') = $3' +
                      '   AND anulado IS false' +
                      ' GROUP BY guialocal';
          var params = [req.decoded.idultimaempresa, req.headers['client-timezone'], req.params.date];
          client.query(statement, params, function(err, result) {
            if (err){
              Utils.handleError(res, done, err.message, "Error getting reservaguias num grupos.");
            }
            else{
              done();
              //console.log(result.rows);
              var totalGrupos = 0;
              var totalGruposAsignadosAGuiasReservados = 0;
              var totalGruposAsignadosAGuiasNoReservados = 0;
              var totalGruposNoAsignados = 0;
              for (var i = 0; i < result.rows.length; i++) {
                result.rows[i].numgrupos = parseInt(result.rows[i].numgrupos);
                for (var j = 0; j < reservas.length; j++) {
                  if(result.rows[i].guialocal == reservas[j].codigo){
                    reservas[j].numgrupos = (reservas[j].numgrupos ? reservas[j].numgrupos + result.rows[i].numgrupos : result.rows[i].numgrupos);
                    totalGruposAsignadosAGuiasReservados = totalGruposAsignadosAGuiasReservados + result.rows[i].numgrupos;
                  }
                }
                if(result.rows[i].guialocal == ''){
                  totalGruposNoAsignados = totalGruposNoAsignados + result.rows[i].numgrupos;
                }
                totalGrupos = totalGrupos + result.rows[i].numgrupos;
              }
              totalGruposAsignadosAGuiasNoReservados = totalGrupos - totalGruposAsignadosAGuiasReservados - totalGruposNoAsignados;
              res.status(200).json(
                  { reservas: reservas,
                    totalGrupos: totalGrupos,
                    totalGruposAsignadosAGuiasReservados: totalGruposAsignadosAGuiasReservados,
                    totalGruposAsignadosAGuiasNoReservados: totalGruposAsignadosAGuiasNoReservados,
                    totalGruposNoAsignados: totalGruposNoAsignados
                  }
                );
            }
          });
        }
      });
    }
  });
})

empresaRouter.route('/guiasasignables')
.post(Verify.verifyRead, function(req, res) {
  console.log('guiasasignables: ' + req.body.fecha);
  if(req.body.fecha){
    req.body.fecha = req.body.fecha.substr(0,10);
  }
  else{
    req.body.fecha = new Date().toISOString().substr(0,10);
  }
  Utils.pool.connect(function(err, client, done) {
    if(err) {
      //return console.error('error fetching client from pool', err);
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var statement = Utils.getReservaGuiaStatement(false);
      var params = [req.decoded.idultimaempresa, req.body.fecha, 'guia', req.headers['client-timezone']];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Error al guiasasignables.");
        }
        else{
          done();
          res.status(200).json(result.rows);
        }
      });
    }
  });
})

empresaRouter.route('/estadisticas')
.put(Verify.verifyRead, Verify.verifyWrite, function(req, res) {
  console.log('/estadisticas.put-req.body:', req.body);
  Utils.pool.connect(function(err, client, done) {
    if(err) {
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      if(!req.body.params.anio){
        req.body.params.anio = 2008;
      }
      var statement = '';
      if(!req.body.params || !req.body.params.group || req.body.params.group == 'anio'){
        statement = 'SELECT to_char(fechahora AT TIME ZONE $3,\'YYYY\') anio, COUNT(*) cont' +
                    '  FROM gt_grupo' +
                    ' WHERE idempresa = $1' +
                    '   AND to_char(fechahora AT TIME ZONE $3,\'YYYY\') >= $2' +
                    '   AND anulado IS false' +
                    ' GROUP BY to_char(fechahora AT TIME ZONE $3,\'YYYY\')' +
                    ' ORDER BY 1 DESC';
      }
      else{
        statement = 'SELECT to_char(g.fechahora AT TIME ZONE $3,\'YYYY\') anio, g.guialocal, COUNT(*) cont' +
                    '  FROM gt_grupo g' +
                    '       LEFT OUTER JOIN gt_pdu p ON p.idempresa = g.idempresa AND p.tabla = \'guia\' AND p.codigo = g.guialocal' +
                    ' WHERE g.idempresa = $1' +
                    '   AND g.anulado IS false' +
                    '   AND to_char(g.fechahora AT TIME ZONE $3,\'YYYY\') >= $2' +
                    '   AND p.fijo IS true' +
                    ' GROUP BY to_char(g.fechahora AT TIME ZONE $3,\'YYYY\'), g.guialocal' +
                    ' ORDER BY 1 DESC, 3 DESC';
      }
      var params = [req.decoded.idultimaempresa, req.body.params.anio, req.headers['client-timezone']];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if(err) {
          Utils.handleError(res, done, err.message, "Error getting estadisticas.");
        }
        else{
          done();
          res.status(200).json(result.rows);
        }
      });
    }
  });
})

empresaRouter.route('/register')
.put(function(req, res) {
  console.log('/register.put-req.body:', req.body);
  Utils.pool.connect(function(err, client, done) {
    if(err) {
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      req.body.insert = false;
      var sanitize = Utils.sanitizeRegisterBody(req.body);
      Utils.sanitizeRegisterBody(req.body)
      .then(sanitize => {
        if(sanitize.datosOk){
          client.req = req;
          pgTransact(client, registerCompany, done).then(
            function successCallback(idempresa, idusuario) {
              done();
              res.status(200).json({idempresa: idempresa, idusuario: idusuario});
            },
            function errorCallback(err) {
              Utils.handleError(res, done, ((err && err.message) ? err.message : 'rowCount == 0'), "Error en el registro de nuevo usuario.");
            }
          );
        }
        else{
          Utils.handleError(res, done, sanitize.error, "Error en el registro de nuevo usuario.");
        }
      })
      .catch(err => {
        Utils.handleError(res, done, err, "Error en el registro de nuevo usuario.");
      })
    }
  });
})

function getExcepcionesGuardiasStatement(){
  return  'SELECT g.*, p.codigo, p.nombre, u.nombre picturename, u.idprofilepicture' +
          '  FROM gt_guardia g, gt_pdu p, gt_usuario u' +
          ' WHERE g.idempresa = $1' +
          '   AND g.idusuarioguardia = u.idusuario' +
          '   AND p.idempresa = g.idempresa AND p.tabla = $2 AND p.idusuarioapp = g.idusuarioguardia' +
          ' ORDER BY guardiaorden';
}

function registerCompany(client, cb){
  // everything in here is run as a transaction
  var req = client.req;

  var statement = 'INSERT INTO gt_empresa (idempresa, nombre, nombrecompleto, maxdocs, idprofilepicture, idusuario)' +
                  ' SELECT MAX(idempresa) + 1, $1, $2, 50, $3, 100 FROM gt_empresa RETURNING idempresa';
                  //'                VALUES ($1, $2, 50, $3, 100) RETURNING idempresa';
  var params = [req.body.empresanombre, req.body.empresanombrecompleto, 'TEST'];
  Utils.log(statement + ' - ' + params);
  client.query(statement, params, function(err, result) {
    if (err){
      return cb(err, null, null);
    }
    else{
      var idempresa = parseInt(result.rows[0].idempresa);
      statement = 'INSERT INTO gt_empresausuario (idempresa, idusuario, rol, usuario) values ($1, 100, 9, 100)';
      params = [idempresa];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
          return cb(err, null, null);
        }
        else{
          var password = bcrypt.hashSync(req.body.password);
          statement = 'INSERT INTO gt_usuario (idusuario, nombre, nombrecompleto, password, idultimaempresa, idprofilepicture, email, usuario)' +
                      ' SELECT MAX(idusuario) + 1, $1, $2, $3, $4, $5, $6, 100 FROM gt_usuario RETURNING idusuario';
          params = [req.body.usuarionombre, req.body.usuarionombrecompleto, password, idempresa, '64567', req.body.email];
          Utils.log(statement + ' - ' + params);
          client.query(statement, params, function(err, result) {
            if (err){
              return cb(err, null, null);
            }
            else{
              var idusuario = parseInt(result.rows[0].idusuario);
              statement = 'INSERT INTO gt_empresausuario (idempresa, idusuario, rol, usuario) values ($1, $2, 6, 100)';
              params = [idempresa, idusuario];
              Utils.log(statement + ' - ' + params);
              client.query(statement, params, function(err, result) {
                if (err){
                  return cb(err, null, null);
                }
                else{
                  statement = 'INSERT INTO gt_pdu (idempresa, tabla, codigo, nombre, email, idiomas, irpf, orden, idusuarioapp, fijo, guardiaorden, guardianumdias, idusuario)' +
                              '  SELECT $1::numeric, \'guia\', $2, $3, $4, $5, 15, 1, $6, true, 1, 7, 100';
                  params = [idempresa, req.body.usuarionombre, req.body.usuarionombrecompleto, req.body.email, ['ES'], idusuario];
                  Utils.log(statement + ' - ' + params);
                  client.query(statement, params, function(err, result) {
                    if (err){
                      return cb(err, null, null);
                    }
                    else{
                      statement = 'INSERT INTO gt_pdu (idempresa, tabla, codigo, nombre, idusuario)' +
                                  '  SELECT $1::numeric, \'agencia\', \'AGE1\', \'AGENCIA DE PRUEBAS\', 100 UNION ALL' +
                                  '  SELECT $1::numeric, \'formapago\', \'CON\', \'CONTADO\', 100 UNION ALL' +
                                  '  SELECT $1::numeric, \'formapago\', \'TAR\', \'TARJETA\', 100 UNION ALL' +
                                  '  SELECT $1::numeric, \'tipofactura\', \'TEST\', \'TIPO DE FACTURA DE PRUEBAS\', 100 UNION ALL' +
                                  '  SELECT $1::numeric, \'tipofactura\', \'OFC\', \'FACTURA OFICIAL\', 100 UNION ALL' +
                                  '  SELECT $1::numeric, \'tipovisita\', \'TVI1\', \'TIPO DE VISITA DE PRUEBAS\', 100 UNION ALL' +
                                  '  SELECT $1::numeric, \'idioma\', \'ES\', \'ESPAÑOL\', 100 UNION ALL' +
                                  '  SELECT $1::numeric, \'idioma\', \'IN\', \'INGLÉS\', 100 UNION ALL' +
                                  '  SELECT $1::numeric, \'puntoencuentro\', \'ENC1\', \'PUNTO DE ENCUENTRO DE PRUEBAS\', 100 UNION ALL' +
                                  '  SELECT $1::numeric, \'guiacorreo\', \'GCO1\', \'GUÍA CORREO DE PRUEBAS\', 100 UNION ALL' +
                                  '  SELECT $1::numeric, \'facilitagrupo\', \'FGR1\', \'FACILITA GRUPO DE PRUEBAS\', 100 UNION ALL' +
                                  '  SELECT $1::numeric, \'busempresa\', \'BUS1\', \'EMPRESA AUTOBUSES DE PRUEBAS\', 100 UNION ALL' +
                                  '  SELECT $1::numeric, \'provincia\', \'SE\', \'SEVILLA\', 100';
                      params = [idempresa];
                      Utils.log(statement + ' - ' + params);
                      client.query(statement, params, function(err, result) {
                        if (err){
                          return cb(err, null, null);
                        }
                        else{
                          statement = 'INSERT INTO gt_monumento(' +
                                      '   idempresa, codigo, descripcion, precio, tel1, tel2, observaciones, lunes, lh1, lh2, lh3, lh4,' +
                                      '   martes, mh1, mh2, mh3, mh4, miercoles, xh1, xh2, xh3, xh4, jueves, jh1, jh2, jh3, jh4,' +
                                      '   viernes, vh1, vh2, vh3, vh4, sabado, sh1, sh2, sh3, sh4, domingo, dh1, dh2, dh3, dh4, idusuario)' +
                                      ' SELECT $1, codigo, descripcion, precio, tel1, tel2, observaciones, lunes, lh1, lh2, lh3, lh4,' +
                                      '   martes, mh1, mh2, mh3, mh4, miercoles, xh1, xh2, xh3, xh4, jueves, jh1, jh2, jh3, jh4,' +
                                      '   viernes, vh1, vh2, vh3, vh4, sabado, sh1, sh2, sh3, sh4, domingo, dh1, dh2, dh3, dh4, idusuario' +
                                      '   FROM gt_monumento WHERE idempresa = $2 AND codigo = $3';
                          params = [idempresa, 100, 'CAT'];
                          Utils.log(statement + ' - ' + params);
                          client.query(statement, params, function(err, result) {
                            if (err){
                              return cb(err, null, null);
                            }
                            else{
                              statement = 'INSERT INTO gt_tarifa(' +
                                          '  idempresa, codigo, descripcion, precios, monumentolaborable, monumentofestivo,' +
                                          '  horalaborable, horafestivo, idiomalaborable, idiomafestivo, idusuario)' +
                                          '  VALUES ($1, $2, $3, $4, 30, 50, 30, 50, 30, 50, 100)';
                              var precios = [{tipovisita:'TVI1', paxdesde:1, paxhasta:50, laborable:100, festivo:150}];
                              params = [idempresa, '001', 'TARIFA DE EJEMPLO', precios];
                              Utils.log(statement + ' - ' + params);
                              client.query(statement, params, function(err, result) {
                                if (err){
                                  return cb(err, null, null);
                                }
                                else{
                                  statement = 'UPDATE gt_pdu SET tarifa = $1, formapago = $2, tipofactura = $3' +
                                              ' WHERE idempresa = $4 AND tabla = $5 AND codigo = $6';
                                  params = ['001', 'CON', 'OFC', idempresa, 'agencia', 'AGE1'];
                                  Utils.log(statement + ' - ' + params);
                                  client.query(statement, params, function(err, result) {
                                    if (err){
                                      return cb(err, null, null);
                                    }
                                    else{
                                      return cb(err, idempresa, idusuario);
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
              });
            }
          });
        }
      });
    }
  });
}

;

module.exports = empresaRouter;