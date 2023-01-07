var Utils = require('./utils');

exports.pushGetup = function (){
  console.log('Getting up...')
  Utils.pool.connect(function(err, client, done) {
    if(err){
      done();
      console.log('getup.pushGetup:', err);
    }
    else{
      var statement = 'SELECT nombrecompleto, pushsubscription, to_char(now() AT TIME ZONE \'Europe/Madrid\',\'DD-MM-YY HH24:MI\') wakeuptime' +
                      ' FROM gt_usuario' +
                      ' WHERE idusuario = $1';
      var params = [100];
      Utils.log(statement + ' - ' + params);
      client.query(statement, params, function(err, result) {
        done();
        if (err){
          console.log('getup.pushGetup:', err);
        }
        else{
          env = process.env.NODE_ENV || 'development';
          if (env === 'production') {
            var payload = {
              "notification": {
                "title": 'Hola ' + result.rows[0].nombrecompleto,
                "body" : 'Guíame up & running at ' + result.rows[0].wakeuptime,
                "icon" : "images/logo-144x144.png",
                "badge": "images/logo-144x144.png",
                "data" : { "url" : process.env.APP_URL },
                "actions": [
                    {"action": 'close', title: 'Cerrar', "icon": 'images/xmark.png'},
                  ]
              }
            };
            Utils.sendPushNotification(payload, result.rows[0].pushsubscription);
          }
        }
      });
    }
  });
}