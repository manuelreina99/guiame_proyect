// Routes '/users'

var express = require('express');
var bodyParser = require('body-parser');
var Utils = require('../utils');
var Verify = require('../verify');
var bcrypt = require("bcrypt-node");             // hash passwords
var userRouter = express.Router();

userRouter.use(bodyParser.json());
userRouter.route('/')

// Get all users
.get(
  Verify.verifyRead, Verify.verifyWrite, Verify.verifyAdmin,
  function(req, res) {
    Utils.pool.connect(function(err, client, done) {
      if(err) {
        //return console.error('error fetching client from pool', err);
        Utils.handleError(res, done, err.message, "error fetching client from pool");
      }
      else{
        client.query('SELECT * FROM gt_usuario ORDER BY nombre', function(err, result) {
          if (err){
            Utils.handleError(res, done, err.message, "Error getting gt_usuario.");
          }
          else{
            done();
            res.status(200).json(result.rows);
          }
        });
      }
    });
})

.post(
  Verify.verifyRead, Verify.verifyWrite, function(req, res) {
  if (req.body.nombrecompleto == null || req.body.email == null) {
    Utils.handleError(res, function(){}, "Datos incorrectos", "Datos incorrectos", 400);
  }
  else{
    Utils.pool.connect(function(err, client, done) {
      if(err) {
        Utils.handleError(res, done, err.message, "error fetching client from pool");
      }
      else{
        var statement = 'UPDATE gt_usuario SET nombrecompleto = $1, email = $2 WHERE idusuario = $3';
        var params = [req.body.nombrecompleto, req.body.email, req.decoded.idusuario];
        Utils.log(statement + ' - ' + params);
        client.query(statement, params, function(err, result) {
          if (err){
            Utils.handleError(res, done, err.message, "Error actualizando usuario 1");
          }
          else{
            statement = 'UPDATE gt_pdu SET nombre = $1, email = $2 WHERE idempresa = $3 AND tabla = $4 AND idusuarioapp = $5';
            params = [req.body.nombrecompleto, req.body.email, req.decoded.idultimaempresa, 'guia', req.decoded.idusuario];
            Utils.log(statement + ' - ' + params);
            client.query(statement, params, function(err, result) {
              if (err){
                Utils.handleError(res, done, err.message, "Error actualizando usuario 2");
              }
              else{
                statement = 'UPDATE gt_empresausuario SET facturadefaulttext = $1 WHERE idempresa = $2 AND idusuario = $3';
                params = [req.body.facturadefaulttext, req.decoded.idultimaempresa, req.decoded.idusuario];
                Utils.log(statement + ' - ' + params);
                client.query(statement, params, function(err, result) {
                  if (err){
                    Utils.handleError(res, done, err.message, "Error actualizando usuario 3");
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
      }
    });
  }
});

userRouter.route('/register')
// Creates a new user
.post(
  Verify.verifyRead, Verify.verifyWrite, Verify.verifyAdmin,
  function(req, res) {
  if (req.body.name == null || req.body.password == null || req.body.fullname == null) {
    Utils.handleError(res, function(){}, "Invalid user", "Must provide name, password and fullname.", 400);
  }
  else{
    var password = bcrypt.hashSync(req.body.password);
    Utils.pool.connect(function(err, client, done) {
      if(err) {
        Utils.handleError(res, done, err.message, "error fetching client from pool");
      }
      else{
        var statement = 'SELECT * FROM gt_usuario WHERE lower(nombre) = $1';
        var params = [req.body.name.toLowerCase()];
        Utils.log(statement + ' - ' + params);
        client.query(statement, params, function(err, result) {
          if (err){
            Utils.handleError(res, done, err.message, "Error registrando usuario (select 1).");
          }
          else{
            if (result.rowCount > 0){
              Utils.handleError(res, done, "Bad request", req.body.name + ' ya existe.', 409);
            }
            else{
              var statement = 'INSERT INTO gt_usuario (nombre, password, nombrecompleto, usuario) VALUES($1, $2, $3, $4)';
              var params = [req.body.nombre, password, req.body.nombrecompleto, req.decoded.idusuario];
              Utils.log(statement + ' - ' + params);
              client.query(statement, params, function(err, result) {
                if (err){
                  Utils.handleError(res, done, err.message, "Error registrando usuario (insert).");
                }
                else
                {
                  var statement = 'SELECT * FROM gt_usuario where nombre = $1';
                  var params = [req.body.name];
                  Utils.log(statement + ' - ' + params);
                  client.query(statement, params, function(err, result) {
                    if (err){
                      Utils.handleError(res, done, err.message, "Error registrando usuario (select 2).");
                    }
                    else{
                      done();
                      var token = Verify.getToken(result.rows[0]);
                      result.rows[0].tokenId = token;
                      res.status(200).json(result.rows[0]);
                    }
                  })
                }
              });
            }
          }
        });
      }
    });
  }
});

userRouter.route('/login')
// User login
.post(function(req, res) {
  Utils.pool.connect(function(err, client, done) {
    if(err) {
      //return console.error('error fetching client from pool', err);
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var statement = Utils.loginStatement() + ' AND (u.nombre = $1 OR u.email = $1)';
      var params = [req.body.username];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Login failed. Bad user.");
        }
        else{
          console.log('result.rows.length:',result.rows.length);
          console.log('bcrypt.hashSync("demo"):',bcrypt.hashSync('demo'));
          if (result.rows.length > 0 && req.body.password &&
              (bcrypt.compareSync(req.body.password, result.rows[0].password))
          ){
            if(!result.rows[0].status){ //usuario desactivado para la empresa
              Utils.handleError(res, done, 'Usuario desactivado.', "Login failed. Usuario desactivado.", 401);
            }
            else{
              var user = Utils.getLoginUser(result.rows[0]);
              // get user's companies count
              var statement = 'SELECT count(*) numcompanies' +
                              '  FROM gt_empresausuario' +
                              ' WHERE idusuario = $1';
              var params = [user.idusuario];
              Utils.log(statement + ' - ' + params);
              client.query(statement, params, function(err, result) {
                if (err){
                  Utils.handleError(res, done, err.message, "Login failed (select count).");
                }
                else{
                  user.numcompanies = parseInt(result.rows[0].numcompanies);
                  user.isLoggedIn = true;
                  statement = 'UPDATE gt_usuario SET tslastlogin = now() WHERE idusuario = $1'
                  var params = [user.idusuario];
                  client.query(statement, params, function(err, result) {
                    if (err){
                      Utils.handleError(res, done, err.message, "Login failed (update tslaslogin).");
                    }
                    else{
                      done();
                      res.status(200).json(user);
                    }
                  });
                }
              });
            }
          }
          else{
            Utils.handleError(res, done, 'Bad user or password.', "Login failed. Bad user or password.");
          }
        }
      });
    }
  });
});

userRouter.route('/idiomas')

// Get all languages of a user
.get(Verify.verifyRead, function(req, res) {
  Utils.pool.connect(function(err, client, done) {
    if(err) {
      //return console.error('error fetching client from pool', err);
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var statement = getLangugesStatement();
      var params = [req.decoded.idultimaempresa, req.decoded.idusuario];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Error reading languages.");
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
    if (err){
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var statement = 'UPDATE gt_empresausuario' +
                      '   SET idiomas = array_append(idiomas,$3)' +
                      ' WHERE idempresa = $1 AND idusuario = $2';
      var params = [req.decoded.idultimaempresa, req.decoded.idusuario, req.body.langcode];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Error actualizando gt_empresausuario.");
        }
        else{
          var statement = 'UPDATE gt_pdu SET idiomas = (SELECT idiomas FROM gt_empresausuario WHERE idempresa = $1 AND idusuario = $2) WHERE idempresa = $1 AND tabla = $3 AND observaciones = $4';
          var params = [req.decoded.idultimaempresa, req.decoded.idusuario, 'guia', req.decoded.idusuario.toString()];
          Utils.log(statement + ' - ' + params);
          client.query(statement, params, function(err, result) {
            if (err){
              Utils.handleError(res, done, err.message, "Error leyendo idiomas.");
            }
            else{
              var statement = getLangugesStatement();
              var params = [req.decoded.idultimaempresa, req.decoded.idusuario];
              Utils.log(statement + ' - ' + params);
              client.query(statement, params, function(err, result) {
                if (err){
                  Utils.handleError(res, done, err.message, "Error leyendo idiomas.");
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
      var statement = 'UPDATE gt_empresausuario' +
                      '   SET idiomas = array_remove(idiomas,$3)' +
                      ' WHERE idempresa = $1 AND idusuario = $2';
      var params = [req.decoded.idultimaempresa, req.decoded.idusuario, req.body.langcode];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Error actualizando gt_empresausuario.");
        }
        else{
          var statement = 'UPDATE gt_pdu SET idiomas = (SELECT idiomas FROM gt_empresausuario WHERE idempresa = $1 AND idusuario = $2) WHERE idempresa = $1 AND tabla = $3 AND observaciones = $4';
          var params = [req.decoded.idultimaempresa, req.decoded.idusuario, 'guia', req.decoded.idusuario.toString()];
          Utils.log(statement + ' - ' + params);
          client.query(statement, params, function(err, result) {
            if (err){
              Utils.handleError(res, done, err.message, "Error leyendo idiomas.");
            }
            else{
              var statement = getLangugesStatement();
              var params = [req.decoded.idultimaempresa, req.decoded.idusuario];
              Utils.log(statement + ' - ' + params);
              client.query(statement, params, function(err, result) {
                if (err){
                  Utils.handleError(res, done, err.message, "Error leyendo idiomas.");
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
    }
  });
})

userRouter.route('/push/subscribe')
.post(Verify.verifyRead, Verify.verifyWrite, function(req, res) {
  Utils.pool.connect(function(err, client, done) {
    if(err){
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      console.log('req.body.pushSubscription:', req.body.pushSubscription);
      var statement = 'UPDATE gt_usuario' +
                      '   SET pushsubscription = $1' +
                      ' WHERE idusuario = $2';
      var params = [req.body.pushSubscription, req.decoded.idusuario];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Error updating pushsubscription.");
        }
        else{
          done();
          var payload = {
            "notification": {
              "title": "Hola " + req.decoded.nombrecompleto + ".",
              "body" : "Gracias por suscribirte a las notificaciones de Guíame en este dispositivo." +
                       "\nCualquier suscripción anterior en otro dispositivo queda anulada.",
              "icon" : "images/logo-144x144.png",
              "badge": "images/logo-144x144.png",
              "data" : { "url" : process.env.APP_URL },
              "actions": [
                  {"action": 'close', title: 'Cerrar', "icon": 'images/xmark.png'},
                ]
            }
          };

          Utils.sendPushNotification(payload, req.body.pushSubscription);
          res.status(200).json([]);
        }
      });
    }
  });
});

userRouter.route('/push/unsubscribe')
.post(Verify.verifyRead, Verify.verifyWrite, function(req, res) {
  Utils.pool.connect(function(err, client, done) {
    if(err){
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var statement = 'UPDATE gt_usuario' +
                      '   SET pushsubscription = null' +
                      ' WHERE idusuario = $1';
      var params = [req.decoded.idusuario];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Error updating pushsubscription.");
        }
        else{
          done();
          res.status(200).json([]);
        }
      });
    }
  });
});

userRouter.route('/idiomas/idonthave')

// Get all languages of a user
.get(Verify.verifyRead, function(req, res) {
  Utils.pool.connect(function(err, client, done) {
    if(err) {
      //return console.error('error fetching client from pool', err);
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      //source: http://flag-icon-css.lip.is/
      var statement = 'SELECT p.codigo, p.nombre AS name,' +
                      '       \'https://lipis.github.io/flag-icon-css/flags/4x3/\' || p.observaciones || \'.svg\' url' +
                      '  FROM gt_pdu p' +
                      ' WHERE p.idempresa = $1 AND tabla = \'idioma\'' +
                      '   AND p.codigo NOT IN (SELECT unnest(idiomas) FROM gt_empresausuario WHERE idusuario = $2)' +
                      ' ORDER BY p.nombre';
      var params = [req.decoded.idultimaempresa, req.decoded.idusuario];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Error leyendo idiomas que no tengo.");
        }
        else{
          done();
          res.status(200).json(result.rows);
        }
      });
    }
  });
})

// A user changes his/her own password
userRouter.route('/password')
.put(Verify.verifyRead, Verify.verifyWrite, function(req, res) {
  if (req.body.password == null){
    Utils.handleError(res, function(){}, "Invalid password", "Must provide a password.", 400);
  }
  else{
    var password = bcrypt.hashSync(req.body.password);
    Utils.pool.connect(function(err, client, done) {
      if(err) {
        //return console.error('error fetching client from pool', err);
        Utils.handleError(res, done, err.message, "error fetching client from pool");
      }
      else{
        var statement = 'UPDATE gt_usuario SET password = $1, tslastpassword = now() WHERE idusuario = $2';
        var params = [password, req.decoded.idusuario];
        Utils.log(statement + ' - ' + params);
        client.query(statement, params, function(err, result) {
          if (err){
            Utils.handleError(res, done, err.message, "Error updating password.");
          }
          else
          {
            var statement = 'SELECT * FROM gt_usuario where idusuario = $1';
            var params = [req.decoded.idusuario];
            Utils.log(statement + ' - ' + params);
            client.query(statement, params, function(err, result) {
              if (err){
                Utils.handleError(res, done, err.message, "Error updating password.");
              }
              else{
                done();
                res.status(200).json(result.rows[0]);
              }
            })
          }
        });
      }
    });
  }
})

// admin changes :idusuario's password
userRouter.route('/password/:idusuario')
.put(Verify.verifyRead, Verify.verifyWrite, Verify.verifyAdmin, function(req, res) {
  if (req.body.password == null){
    Utils.handleError(res, function(){}, "Invalid password", "Must provide a password.", 400);
  }
  else{
    var password = bcrypt.hashSync(req.body.password);
    Utils.pool.connect(function(err, client, done) {
      if(err) {
        //return console.error('error fetching client from pool', err);
        Utils.handleError(res, done, err.message, "error fetching client from pool");
      }
      else{
        var statement = 'UPDATE gt_usuario SET password = $1 WHERE idusuario = $2';
        var params = [password, req.params.idusuario];
        Utils.log(statement + ' - ' + params);
        client.query(statement, params, function(err, result) {
          if (err){
            Utils.handleError(res, done, err.message, "Error updating password.");
          }
          else
          {
            var statement = 'SELECT * FROM gt_usuario where idusuario = $1';
            var params = [req.params.idusuario];
            Utils.log(statement + ' - ' + params);
            client.query(statement, params, function(err, result) {
              if (err){
                Utils.handleError(res, done, err.message, "Error updating password.");
              }
              else{
                done();
                res.status(200).json(result.rows[0]);
              }
            })
          }
        });
      }
    });
  }
})

userRouter.route('/forgot')
// Reset password for a user
.post(function(req, res) {
    if(req.body.email == null){
        Utils.handleError(res, "Invalid request", "Must provide a email.", 400);
    }
    else{
      Utils.pool.connect(function(err, client, done) {
        if(err) {
          //return console.error('error fetching client from pool', err);
          Utils.handleError(res, done, err.message, "error fetching client from pool");
        }
        else{
          var statement = 'SELECT idusuario, nombre, idprofilepicture, email' +
                          '  FROM gt_usuario where email = $1';
          var params = [req.body.email];
          Utils.log(statement + ' - ' + params);
          client.query(statement, params, function(err, result) {
            if (err){
              Utils.handleError(res, done, err.message, 'Error obteniendo datos del usuario');
            }
            else{
              if (result.rowCount > 0){
                var userEmail = result.rows[0].email;
                var resetPasswordToken = Verify.getToken(JSON.stringify(result.rows[0]));
                var resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
                statement = 'UPDATE gt_usuario' +
                            '   SET resettoken   = $1' +
                            '      ,resetexpires = $2' +
                            ' WHERE idusuario    = $3';
                params = [resetPasswordToken, resetPasswordExpires, result.rows[0].idusuario];
                Utils.log(statement + ' - ' + params);
                client.query(statement, params, function(err, result) {
                  if(err) {
                    //return console.error('error fetching client from pool', err);
                    Utils.handleError(res, done, err.message, 'Error guardando token');
                  }
                  else{
                    done();
                    // send email with resettoken
                    const sgMail = require('@sendgrid/mail');
                    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
                    const msg = {
                      to: userEmail,
                      from: {
                        name: 'Guíame App',
                        email: 'carmaco.labs@gmail.com',
                      },
                      subject: 'Guíame Password Reset',
                      html:
                        'Recibes este email porque has solicitado una nueva password para Guíame.<br/><br/>' +
                        'Si no has sido tú, puedes ignorar este email.<br/><br/>' +
                        'Si quieres recibir una nueva password por email, pincha en el siguiente enlace:<br/><br/>' +
                        'https://' + req.headers.host + '/#/requestnewpassword?token=' + resetPasswordToken + '<br/><br/>' +
                        'La contraseña anterior quedará anulada.<br/><br/>' +
                        'Gracias y un saludo.<br/><br/>'
                    };
                    console.log('Solicitando envío email reset password para ' + userEmail);
                    sgMail.send(msg, (err, result) => {
                      if (err) {
                        console.log(err);
                        Utils.handleError(res, done, err.message, "Error enviando email para resetear password (sendgrid).");
                      }
                      else {
                        console.log('OK: Envío email reset password para ' + userEmail);
                        res.status(200).json(result);
                      }
                    });
                  }
                });
              }
              else{
                done();
                res.status(200).json({'reason':'Se ha enviado nueva password por email'});
              }
            }
          });
        }
      });
    }
});

userRouter.route('/reset/:token')
// Reset password for a user
.get(function(req, res) {
  Utils.pool.connect(function(err, client, done) {
    if(err) {
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      statement = 'SELECT * FROM gt_usuario WHERE resettoken = $1';
      params = [req.params.token];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Error al leer el token.");
        }
        else{
          if(result.rowCount > 0 && result.rows[0].resetexpires > Date.now()){
              var userEmail = result.rows[0].email;
              var newPassword = Math.random().toString(36).substr(2,8);
              var bdPassword = bcrypt.hashSync(newPassword);
              statement = 'UPDATE gt_usuario' +
                          '   SET password     = $1' +
                          '      ,resettoken   = null' +
                          '      ,resetexpires = null ' +
                          ' WHERE idusuario    = $2';
              params = [bdPassword, result.rows[0].idusuario];
              Utils.log(statement + ' - ' + params);
              client.query(statement, params, function(err, result) {
                if (err){
                  Utils.handleError(res, done, err.message, "Error al crear nueva password.");
                }
                else{
                  done();
                  // send mail with new password
                  const sgMail = require('@sendgrid/mail');
                  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
                  const msg = {
                    to: userEmail,
                    from: {
                      name: 'Guíame App',
                      email: 'carmaco.labs@gmail.com',
                    },
                    subject: 'Guíame Nueva Password',
                    html:
                      'Recibes este email porque has solicitado una nueva password para Guíame.<br/><br/>' +
                      'Tu nueva password es: <strong>' + newPassword + '</strong><br/><br/>' +
                      'Por favor, es muy recomendable que la cambies lo antes posible dentro de tu perfil en la aplicación.<br/><br/>' +
                      'Gracias y un saludo.<br/><br/>'
                  };
                  console.log('Solicitando envío email new password para ' + userEmail);
                  sgMail.send(msg, (err, result) => {
                    if (err) {
                      console.log(err);
                      Utils.handleError(res, done, err.message, "Error enviando email para resetear password (sendgrid).");
                    }
                    else {
                      console.log('OK: Envío email new password para ' + userEmail);
                      res.status(200).json(result);
                    }
                  });
                }
              })
          }
          else{
            done();
            res.status(400).json({error: 'Password reset token invalido o expirado.'});
          }
        }
      })
    }
  })
});

userRouter.route('/:idusuario')
// Get user by id
.get(Verify.verifyRead, Verify.verifyWrite, function(req, res) {
  Utils.pool.connect(function(err, client, done) {
    if(err) {
      //return console.error('error fetching client from pool', err);
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var statement = 'SELECT u.*, eu.facturadefaulttext FROM gt_usuario u, gt_empresausuario eu' +
                      ' WHERE u.idusuario = $1 AND u.idusuario = eu.idusuario AND eu.idempresa = $2';
      var params = [req.params.idusuario, req.decoded.idultimaempresa];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        if (err){
          Utils.handleError(res, done, err.message, "Error getting gt_usuario.");
        }
        else{
          done();
          res.status(200).json(result.rows[0]);
        }
      });
    }
  });
})

function getLangugesStatement(){
  //source: http://flag-icon-css.lip.is/
  return  'SELECT lang.codigo, nombre AS name,' +
          '       \'https://lipis.github.io/flag-icon-css/flags/4x3/\' || p.observaciones || \'.svg\' url' +
          '  FROM (SELECT unnest(idiomas) codigo FROM gt_empresausuario WHERE idusuario = $2) lang, gt_pdu p' +
          ' WHERE p.idempresa = $1 AND tabla = \'idioma\' AND lang.codigo = p.codigo' +
          ' ORDER BY nombre';
}

;

module.exports = userRouter;