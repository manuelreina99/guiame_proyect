var pg = require('pg');                          // postgress database
var Verify = require('./verify');
var bcrypt = require("bcrypt-node");             // hash passwords

// Fix for parsing of numeric fields
//var types = require('pg').types;
//types.setTypeParser(1700, 'text', parseFloat);

const url = require('url')
const params = url.parse(process.env.DATABASE_URL);
const auth = params.auth.split(':');

const config = {
  user: auth[0],
  password: auth[1],
  host: params.hostname,
  port: params.port,
  database: params.pathname.split('/')[1]
};

env = process.env.NODE_ENV || 'development';
if (env === 'production') {
  //config.ssl = true;
  config.ssl = {
    rejectUnauthorized: false
  }
}

var pool = new pg.Pool(config);
pool.on('error', function (err, client) {
  // if an error is encountered by a client while it sits idle in the pool
  // the pool itself will emit an error event with both the error and
  // the client which emitted the original error
  // this is a rare occurrence but can happen if there is a network partition
  // between your application and the database, the database restarts, etc.
  // and so you might want to handle it and at least log it out
  console.error('idle client error', err.message, err.stack)
})

exports.pool = pool;

exports.ROL_READ   = 0;
exports.ROL_WRITE  = 1;
exports.ROL_SERIE2 = 3;
exports.ROL_BOSS   = 6;
exports.ROL_ADMIN  = 9;
exports.MONTHS_NAMES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

exports.SELECT_LIMIT = 200;
exports.SECONDS_TO_EXPIRE_TOKEN = 50400; //14 horas

exports.FONTS = {
  Roboto: {
    normal: './fonts/Roboto-Regular.ttf',
    bold: './fonts/Roboto-Medium.ttf',
    italics: './fonts/Roboto-Italic.ttf',
    bolditalics: './fonts/Roboto-Italic.ttf'
  }
};

// Generic error handler used by all endpoints.
exports.handleError = function (res, done, reason, message, code) {
  done();
  console.log("ERROR: " + reason);
  res.status(code || 500).json({"error": message, "reason": reason});
};

exports.log = function (text) {
  var verbose = process.env.VERBOSE === 'true';
  //console.log('process.env.VERBOSE:' + verbose);
  if(verbose){
    console.log('pg-sql: ' + text.replace(/\s\s+/g, ' '));
  }
};

//https://developer.mozilla.org/en-US/docs/Web/API/Notification/Notification
exports.sendPushNotification = function(payload, pushSubscription){

  var webPush = require('web-push')

  webPush.setVapidDetails(
    'mailto:' + process.env.CONTACT_EMAIL,
    process.env.PUSH_PUBLIC_KEY,
    process.env.PUSH_PRIVATE_KEY
  )

  console.log('________________________________payload________________________:', payload);
  return new Promise((resolve, reject) => {
    webPush.sendNotification(pushSubscription, JSON.stringify(payload))
      .then(function (response) {
        console.log('Push ok:', JSON.stringify(payload));
        resolve(response);
      })
      .catch(function (error) {
        console.log('Push error: ', error);
        reject(error);
      })
  });
};

exports.formatFecha = function(fecha){
  fecha = new Date(fecha);
  fecha.setMinutes(fecha.getMinutes() - fecha.getTimezoneOffset());
  fecha = fecha.toISOString().slice(0, 10) + ' ' + fecha.toISOString().slice(11, 16);
  return fecha;
};

exports.yyyymmdd = function(fecha){
  var add1 = false;
  //console.log('fecha:' + fecha + ' offset:' + new Date().getTimezoneOffset());
  if (fecha.length >= 13 && (fecha.substring(10,19) == 'T22:00:00' || fecha.substring(10,19) == 'T23:00:00') && (new Date().getTimezoneOffset() == 0)){
    add1 = true;
  }
  var workDate = new Date(fecha);
  if (add1){
    workDate.setTime( workDate.getTime() + 1 * 86400000 );
  }
  //console.log('workDate:' + workDate);
  var dd = workDate.getDate();
  var mm = workDate.getMonth()+1; //January is 0!
  var yyyy = workDate.getFullYear();

  if(dd<10) {
      dd='0'+dd
  }

  if(mm<10) {
      mm='0'+mm
  }

  return yyyy + '-' + mm + '-' + dd;
};

exports.verboseFecha = function(fecha){
  verboseFecha = fecha.substr(0,2);
  verboseFecha = verboseFecha + ' de ';
  switch(fecha.substr(3,2)){
    case '01': verboseFecha = verboseFecha + 'Enero'; break;
    case '02': verboseFecha = verboseFecha + 'Febrero'; break;
    case '03': verboseFecha = verboseFecha + 'Marzo'; break;
    case '04': verboseFecha = verboseFecha + 'Abril'; break;
    case '05': verboseFecha = verboseFecha + 'Mayo'; break;
    case '06': verboseFecha = verboseFecha + 'Junio'; break;
    case '07': verboseFecha = verboseFecha + 'Julio'; break;
    case '08': verboseFecha = verboseFecha + 'Agosto'; break;
    case '09': verboseFecha = verboseFecha + 'Septiembre'; break;
    case '10': verboseFecha = verboseFecha + 'Octubre'; break;
    case '11': verboseFecha = verboseFecha + 'Noviembre'; break;
    case '12': verboseFecha = verboseFecha + 'Diciembre'; break;
  }
  verboseFecha = verboseFecha + ' de ' + fecha.substr(6,4);
  return verboseFecha;
};

exports.trocearTexto = function(texto){
  var ll = 80; // longitud de linea
  var result = [];
  //reemplazar saltos de lineas por espacios
  texto = texto.replace(/\n/g, " ");

  for (var i = 1; i <= 4; i++) {
    // intentamos no cortar la ultima palabra de la linea
    var pos = texto.substring(0,ll).lastIndexOf(' ');
    // si el ultimo blanco esta muy lejos del final cortamos la palabra
    if (pos < (ll - 20)){
      pos = ll;
    }
    result[i] = texto.substring(0, pos);
    texto = texto.substring(pos);
  }
  return result;
};

exports.loginStatement = function(){
  var statement = 'SELECT u.*, e.nombre companyname, e.idprofilepicture empresaidprofilepicture,' +
                  '       eu.rol, p.irpf, p.codigo usuariocodigo, master.password masterpassword,' +
                  '       eu.facturadefaulttext, eu.status' +
                  '  FROM gt_usuario u, gt_empresa e,' +
                  '       gt_empresausuario eu' +
                  '       LEFT OUTER JOIN gt_pdu p ON p.idempresa = eu.idempresa AND p.tabla = \'guia\' AND p.idusuarioapp = eu.idusuario' +
                  '       LEFT OUTER JOIN gt_usuario master ON master.idusuario = 100' +
                  ' WHERE u.idultimaempresa = e.idempresa ' +
                  '   AND u.idusuario = eu.idusuario' +
                  '   AND e.idempresa = eu.idempresa';
  return statement;
};

exports.getLoginUser = function(row){
  var token = Verify.getToken(JSON.stringify(row));
  //console.log('getToken después del pete.');
  var user = {
        idusuario: row.idusuario,
        nombre: row.nombre,
        usuariocodigo: row.usuariocodigo,
        rol: row.rol,
        idultimaempresa : row.idultimaempresa,
        nombreempresa : row.companyname,
        idprofilepicture : row.idprofilepicture,
        empresaidprofilepicture: row.empresaidprofilepicture,
        irpf: parseFloat(row.irpf),
        facturadefaulttext: row.facturadefaulttext,
        tokenId: token
      };
  user.tokenExpiresIn = new Date();
  user.tokenExpiresIn.setSeconds(user.tokenExpiresIn.getSeconds() + parseInt(process.env.SECONDS_TO_EXPIRE_TOKEN));
  return user;
};

exports.getGruposStatementIds = function(idempresa, filtro, offset, maxdocs, clienttimezone, idusuario) {
  let result = { statement : '', params : [] };

  result.statement =  'SELECT g.idgrupo' +
                      '  FROM gt_grupo g' +
                      ' WHERE g.idempresa = $1' +
                      '   AND TO_CHAR(g.fechahora AT TIME ZONE $16,\'YYYYMMDD\') >= TO_CHAR($2 AT TIME ZONE $16,\'YYYYMMDD\')' +
                      '   AND TO_CHAR(g.fechahora AT TIME ZONE $16,\'YYYYMMDD\') <= TO_CHAR($3 AT TIME ZONE $16,\'YYYYMMDD\')' +
                      '   AND upper(g.ref) LIKE $4' +
                      '   AND g.agencia     >= $5  AND g.agencia     <= $6' +
                      '   AND g.guialocal   >= $7  AND g.guialocal   <= $8';
  if(filtro && filtro.facturado && filtro.facturado == 'si'){
    result.statement += ' AND (    EXISTS (select * from gt_factura f where g.idgrupo = ANY(f.grupos) AND f.idusuarioemisor = $19)' +
                        //TO-DO: 103 es ITA, parametrizar
                        '      OR ($19 = 103 AND (select coalesce(factpormatriz,false) from gt_pdu where idempresa = $1 and tabla = \'agencia\' and codigo = g.agencia) is false)' +
                        '     )';
  }
  if(filtro && filtro.facturado && filtro.facturado == 'no'){
    result.statement += ' AND NOT EXISTS (select * from gt_factura f where g.idgrupo = ANY(f.grupos) AND f.idusuarioemisor = $19)' +
                        //TO-DO: 103 es ITA, parametrizar
                        ' AND (   ($19 <> 103)' +
                        //TO-DO: 103 es ITA, parametrizar
                        '      OR ($19 = 103 AND (select coalesce(factpormatriz,false) from gt_pdu where idempresa = $1 and tabla = \'agencia\' and codigo = g.agencia) is true)' +
                        '     )';
  }
  result.statement += '   AND g.formapago   >= $9 AND g.formapago   <= $10' +
                      '   AND g.tipofactura >= $11 AND g.tipofactura <= $12' +
                      '   AND g.confirmado  >= $13 AND g.confirmado  <= $14' +
                      '   AND ($15 = ANY(g.idiomas) OR $15 = \'\')' +
                      '   AND (g.anulado     = $17  OR g.anulado      = $18)' +
                      '   AND $19 = $19' +
                      ' ORDER BY g.fechahora ASC' +
                      ' OFFSET ' + offset + ' LIMIT ' + maxdocs;

  let fecMin = '1900-01-01';
  let fecMax = '2100-12-31';
  let agenciaMin = '';
  let agenciaMax = 'ZZZZZZZZZZZZZZZZZZZZ';
  let guiaMin = '';
  let guiaMax = 'ZZZZZZZZZZZZZZZZZZZZ';
  let ref = '%%';
  let formapagoMin = '';
  let formapagoMax = 'ZZZZZZZZZZZZZZZZZZZZ';
  let tipofacturaMin = '';
  let tipofacturaMax = 'ZZZZZZZZZZZZZZZZZZZZ';
  let confirmadoMin = false;
  let confirmadoMax = true;
  let idioma = '';
  let anuladoMin = false;
  let anuladoMax = true;

  if(filtro && filtro.fechaini){
    fecMin = filtro.fechaini;
  }
  if(filtro && filtro.fechafin){
    fecMax = filtro.fechafin;
  }
  if(filtro && filtro.tipo === 'year' && filtro.fecha){
    fecMin = filtro.fecha.substr(0,4) + '-01-01';
    fecMax = filtro.fecha.substr(0,4) + '-12-31';
  }
  if(filtro && filtro.ref){
    ref = '%' + filtro.ref.toUpperCase() + '%';
  }
  if(filtro && filtro.agencia){
    agenciaMin = filtro.agencia;
    agenciaMax = filtro.agencia;
  }
  if(filtro && filtro.guia){
    guiaMin = filtro.guia;
    guiaMax = filtro.guia;
  }
  if(filtro && filtro.formapago && filtro.formapago != 'todos'){
    formapagoMin = filtro.formapago;
    formapagoMax = filtro.formapago;
  }
  if(filtro && filtro.tipofactura && filtro.tipofactura != 'todos'){
    tipofacturaMin = filtro.tipofactura;
    tipofacturaMax = filtro.tipofactura;
  }
  if(filtro && filtro.confirmado && filtro.confirmado == 'si'){
    confirmadoMin = true;
    confirmadoMax = true;
  }
  if(filtro && filtro.confirmado && filtro.confirmado == 'no'){
    confirmadoMin = false;
    confirmadoMax = false;
  }
  if(filtro && filtro.idioma){
    idioma = filtro.idioma;
  }
  if(filtro && filtro.anulado && filtro.anulado == 'si'){
    anuladoMin = true;
    anuladoMax = true;
  }
  if(filtro && filtro.anulado && filtro.anulado == 'no'){
    anuladoMin = false;
    anuladoMax = false;
  }

  result.params = [idempresa, fecMin, fecMax, ref, agenciaMin, agenciaMax, guiaMin, guiaMax,
                   formapagoMin, formapagoMax, tipofacturaMin, tipofacturaMax, confirmadoMin, confirmadoMax, idioma, clienttimezone, anuladoMin, anuladoMax, idusuario];
  return result;
};

exports.getGruposStatement = function(idempresa, ids, clienttimezone, idusuarioemisor) {
  let result = { statement : '', params : [] };

  result.statement = 'SELECT g.*, array_to_string(g.idiomas, \'+\') idiomastext, array_to_string(monumentos, \'+\') monumentostext, array_to_string(tipovisita, \'+\') tipovisitatext,' +
                  '       p1.nombre puntoencuentrodesc, p2.nombre guianombre, p2.idusuarioapp idusuarioguia, p3.nombre modusuarionombre,' +
                  '       coalesce(p4.idprofilepicture, \'00000\') idprofilepicture, to_char(fechahora AT TIME ZONE $3,\'HH24:MI\') hora,' +
                  '       CASE WHEN coalesce(foo.idusuarioemisor,0) = 0 THEN false ELSE true END facturado' +
                  '  FROM gt_grupo g' +
                  '  LEFT OUTER JOIN gt_pdu p1 ON p1.idempresa = g.idempresa AND p1.tabla = \'puntoencuentro\' AND p1.codigo = g.puntoencuentro' +
                  '  LEFT OUTER JOIN gt_pdu p2 ON p2.idempresa = g.idempresa AND p2.tabla = \'guia\' AND p2.codigo = g.guialocal'+
                  '  LEFT OUTER JOIN gt_usuario p3 ON p3.idusuario = g.idusuario' +
                  '  LEFT OUTER JOIN gt_usuario p4 ON p4.idusuario = p2.idusuarioapp' +
                  //TO-DO: puede devolver más de una factura y duplicar el grupo
                  '  LEFT OUTER JOIN (SELECT idusuarioemisor, grupos, max(fecha) FROM gt_factura WHERE idempresa = $1 GROUP BY idusuarioemisor, grupos) foo' +
                  '               ON foo.idusuarioemisor = $4 AND g.idgrupo = ANY(foo.grupos)' +
                  ' WHERE g.idempresa = $1' +
                  '   AND g.idgrupo = ANY($2)' +
                  ' ORDER BY g.anulado ASC, g.fechahora ASC';

  result.params = [idempresa, ids, clienttimezone, idusuarioemisor];
  return result;
};

exports.getFacturasStatement = function(idempresa, idusuario, rol, filtro, clienttimezone) {
  let result = { statement : '', params : [] };

  result.statement ='SELECT * FROM ( ' +
                    'SELECT distinct on (f.idfactura) f.*, COALESCE(g.guialocal,\'\') guialocal, g.agencia, g.fechahora fechahoragrupo, b.nombre emisor, (f2.total + f2.gastos) totalfacturavinculada' +
                    ' FROM gt_factura f' +
                    '      LEFT OUTER JOIN gt_grupo g ON g.idempresa = f.idempresa AND g.idgrupo = f.grupos[1]' +
                    '      LEFT OUTER JOIN gt_factura f2 ON f2.idempresa = f.idempresa AND f2.idfactura <> f.idfactura AND f2.idusuarioemisor <> f.idusuarioemisor AND f2.grupos = f.grupos' +
                    '    , gt_usuario b' +
                    ' WHERE f.idempresa = $1' +
                    '   AND f.idusuarioemisor = b.idusuario' +
                    '   AND TO_CHAR(f.fecha AT TIME ZONE $22,\'YYYYMMDD\') >= TO_CHAR($2 AT TIME ZONE $22,\'YYYYMMDD\')' +
                    '   AND TO_CHAR(f.fecha AT TIME ZONE $22,\'YYYYMMDD\') <= TO_CHAR($3 AT TIME ZONE $22,\'YYYYMMDD\')' +
                    '   AND upper(f.nombre) LIKE $4' +
                    '   AND upper(f.referencia) LIKE $25' +
                    '   AND f.idusuarioemisor >= $5' +
                    '   AND f.idusuarioemisor <= $6';
  console.log('rol:', rol);
  if(filtro.escompra){
    result.statement +=
                    '   AND (f.idusuarioemisor = $7 OR f.idusuarioemisor = $8 OR f.idusuarioemisor > 0)';
  }
  else{
    if(rol < this.ROL_BOSS){
      result.statement +=
                    '   AND (f.idusuarioemisor = $7 OR f.idusuarioemisor = $8)';
    }
    else{
      result.statement +=
                    '   AND f.fechamodificacion::text <> $7::text AND f.fechamodificacion::text <> $8::text'; //para que e verifique siempre
    }
  }
  result.statement +=
                    '   AND f.escompra = $9' +
                    '   AND COALESCE(g.guialocal,\'\')  >= $10 AND COALESCE(g.guialocal,\'\')  <= $11' +
                    '   AND f.agencia_honorarios_pagado >= $12 AND f.agencia_honorarios_pagado <= $13' +
                    '   AND f.agencia_gastos_pagado     >= $14 AND f.agencia_gastos_pagado     <= $15' +
                    '   AND f.guia_honorarios_pagado    >= $16 AND f.guia_honorarios_pagado    <= $17' +
                    '   AND f.guia_gastos_pagado        >= $18 AND f.guia_gastos_pagado        <= $19' +
                    '   AND f.tipofactura               >= $20 AND f.tipofactura               <= $21' +
                    '   AND COALESCE(g.agencia,\'\')    >= $23 AND COALESCE(g.agencia,\'\')    <= $24' +
                    ' ORDER BY f.idfactura, f.numero DESC, f.fecha DESC' +
                    ' ) foo ORDER BY foo.tipofactura DESC, foo.anio DESC, foo.numero DESC, foo.fecha DESC' +
                    ' LIMIT ' + this.SELECT_LIMIT;

  let fecMin = '1900-01-01';
  let fecMax = '2100-12-31';
  let receptor = '%%';
  let emisorMin = 0;
  let emisorMax = 99999999;
  let escompra = false;
  let guiaMin = '';
  let guiaMax = 'ZZZZZZZZZZZZZZZZZZZZ';
  let ahpMin = false;
  let ahpMax = true;
  let agpMin = false;
  let agpMax = true;
  let ghpMin = false;
  let ghpMax = true;
  let ggpMin = false;
  let ggpMax = true;
  let tipofacturaMin = '';
  let tipofacturaMax = 'ZZZZZZZZZZZZZZZZZZZZ';
  let agenciaMin = '';
  let agenciaMax = 'ZZZZZZZZZZZZZZZZZZZZ';
  let referencia = '%%';

  if(filtro && filtro.fechaini){
    fecMin = filtro.fechaini;
  }
  if(filtro && filtro.fechafin){
    fecMax = filtro.fechafin;
  }
  if(filtro && filtro.receptor){
    receptor = '%' + filtro.receptor.toUpperCase() + '%';
  }
  if(filtro && filtro.emisor){
    emisorMin = filtro.emisor;
    emisorMax = filtro.emisor;
  }
  if(filtro && filtro.escompra){
    escompra = filtro.escompra;
  }
  if(filtro && filtro.guia){
    guiaMin = filtro.guia;
    guiaMax = filtro.guia;
  }

  if(filtro && filtro.pagos && filtro.pagos == '1')  { ahpMin = true;  ahpMax = true; };
  if(filtro && filtro.pagos && filtro.pagos == '2')  { ahpMin = false; ahpMax = false; };
  if(filtro && filtro.pagos && filtro.pagos == '3')  { agpMin = true;  agpMax = true; };
  if(filtro && filtro.pagos && filtro.pagos == '4')  { agpMin = false; agpMax = false; };
  if(filtro && filtro.pagos && filtro.pagos == '5')  { ghpMin = true;  ghpMax = true; };
  if(filtro && filtro.pagos && filtro.pagos == '6')  { ghpMin = false; ghpMax = false; };
  if(filtro && filtro.pagos && filtro.pagos == '7')  { ggpMin = true;  ggpMax = true; };
  if(filtro && filtro.pagos && filtro.pagos == '8')  { ggpMin = false; ggpMax = false; };
  if(filtro && filtro.pagos && filtro.pagos == '9')  { ahpMin = true;  ahpMax = true; ghpMin = false; ghpMax = false; };
  if(filtro && filtro.pagos && filtro.pagos == '10') { agpMin = true;  agpMax = true; ggpMin = false; ggpMax = false;};


  if(filtro && filtro.tipofactura && filtro.tipofactura != 'todos'){
    tipofacturaMin = filtro.tipofactura;
    tipofacturaMax = filtro.tipofactura;
  }

  if(filtro && filtro.agencia){
    agenciaMin = filtro.agencia;
    agenciaMax = filtro.agencia;
  }

  if(filtro && filtro.referencia){
    referencia = '%' + filtro.referencia.toUpperCase() + '%';
  }

  result.params = [idempresa, fecMin, fecMax, receptor, emisorMin, emisorMax, idusuario, 103, escompra, guiaMin, guiaMax, //TO-DO: 103 es ITA, parametrizar
                   ahpMin, ahpMax, agpMin, agpMax, ghpMin, ghpMax, ggpMin, ggpMax, tipofacturaMin, tipofacturaMax, clienttimezone, agenciaMin, agenciaMax, referencia];
  return result;
};

/**
 * Obtiene la consulta para calcular el horario de un conjunto de monumentos en una fecha determinada, teniendo en cuenta las posibles incidencias de gt_monumentoincidencia.
 *
 * @param int      idempresa               Id de la empresa a consultar
 * @param string[] monumentos              Lista de códigos de monumentos a consultar
 * @param date     fecha                   Fecha en la que consultar los horarios
 *
 * @return { statement : '', params : [] } Statement y parámetros de la consulta
 */
exports.getHorariosMonumentos = function(idempresa, monumentos, fecha, clienttimezone) {
  let result = { statement : '', params : [] };
  var dayofweek = new Date(fecha).getDay();

  result.statement = '' +
            'SELECT * FROM (' +
            'SELECT *, ROW_NUMBER() OVER (PARTITION BY CODIGO ORDER BY CODIGO, INC DESC) ORDEN FROM' +
            '(' +
            ' SELECT codigo,' +
            ' CASE WHEN $2 = 1 THEN (lunes     AND (lh1 IS NOT NULL OR lh2 IS NOT NULL OR lh3 IS NOT NULL OR lh4 IS NOT NULL)) ELSE' +
            ' CASE WHEN $2 = 2 THEN (martes    AND (mh1 IS NOT NULL OR mh2 IS NOT NULL OR mh3 IS NOT NULL OR mh4 IS NOT NULL)) ELSE' +
            ' CASE WHEN $2 = 3 THEN (miercoles AND (xh1 IS NOT NULL OR xh2 IS NOT NULL OR xh3 IS NOT NULL OR xh4 IS NOT NULL)) ELSE' +
            ' CASE WHEN $2 = 4 THEN (jueves    AND (jh1 IS NOT NULL OR jh2 IS NOT NULL OR jh3 IS NOT NULL OR jh4 IS NOT NULL)) ELSE' +
            ' CASE WHEN $2 = 5 THEN (viernes   AND (vh1 IS NOT NULL OR vh2 IS NOT NULL OR vh3 IS NOT NULL OR vh4 IS NOT NULL)) ELSE' +
            ' CASE WHEN $2 = 6 THEN (sabado    AND (sh1 IS NOT NULL OR sh2 IS NOT NULL OR sh3 IS NOT NULL OR sh4 IS NOT NULL)) ELSE' +
            ' CASE WHEN $2 = 0 THEN (domingo   AND (dh1 IS NOT NULL OR dh2 IS NOT NULL OR dh3 IS NOT NULL OR dh4 IS NOT NULL)) END END END END END END END abierto,' +
            ' CASE WHEN $2 = 1 THEN lh1 ELSE' +
            ' CASE WHEN $2 = 2 THEN mh1 ELSE' +
            ' CASE WHEN $2 = 3 THEN xh1 ELSE' +
            ' CASE WHEN $2 = 4 THEN jh1 ELSE' +
            ' CASE WHEN $2 = 5 THEN vh1 ELSE' +
            ' CASE WHEN $2 = 6 THEN sh1 ELSE' +
            ' CASE WHEN $2 = 0 THEN dh1 END END END END END END END h1,' +
            ' CASE WHEN $2 = 1 THEN lh2 ELSE' +
            ' CASE WHEN $2 = 2 THEN mh2 ELSE' +
            ' CASE WHEN $2 = 3 THEN xh2 ELSE' +
            ' CASE WHEN $2 = 4 THEN jh2 ELSE' +
            ' CASE WHEN $2 = 5 THEN vh2 ELSE' +
            ' CASE WHEN $2 = 6 THEN sh2 ELSE' +
            ' CASE WHEN $2 = 0 THEN dh2 END END END END END END END h2,' +
            ' CASE WHEN $2 = 1 THEN lh3 ELSE' +
            ' CASE WHEN $2 = 2 THEN mh3 ELSE' +
            ' CASE WHEN $2 = 3 THEN xh3 ELSE' +
            ' CASE WHEN $2 = 4 THEN jh3 ELSE' +
            ' CASE WHEN $2 = 5 THEN vh3 ELSE' +
            ' CASE WHEN $2 = 6 THEN sh3 ELSE' +
            ' CASE WHEN $2 = 0 THEN dh3 END END END END END END END h3,' +
            ' CASE WHEN $2 = 1 THEN lh4 ELSE' +
            ' CASE WHEN $2 = 2 THEN mh4 ELSE' +
            ' CASE WHEN $2 = 3 THEN xh4 ELSE' +
            ' CASE WHEN $2 = 4 THEN jh4 ELSE' +
            ' CASE WHEN $2 = 5 THEN vh4 ELSE' +
            ' CASE WHEN $2 = 6 THEN sh4 ELSE' +
            ' CASE WHEN $2 = 0 THEN dh4 END END END END END END END h4,' +
            ' false inc' +
            ' FROM gt_monumento WHERE idempresa = $1 AND codigo = ANY($4)' +
            '' +
            ' UNION ALL' +
            '' +
            ' SELECT B.codigo,' +
            '        CASE WHEN (A.h1 IS NULL AND A.h2 IS NULL AND A.h3 IS NULL AND A.h4 IS NULL) THEN false ELSE true END abierto,' +
            '        A.h1,' +
            '        A.h2,' +
            '        A.h3,' +
            '        A.h4,' +
            '        true inc' +
            '   FROM gt_monumentoincidencia A, gt_monumento B' +
            '  WHERE A.idempresa = $1 AND A.idempresa = B.idempresa' +
            '    AND B.codigo = ANY($4)' +
            '    AND A.idmonumento = B.idmonumento' +
            '    AND (fechadesde AT TIME ZONE $5)::date <= ($3 AT TIME ZONE $5)::date' +
            '    AND (fechahasta AT TIME ZONE $5)::date >= ($3 AT TIME ZONE $5)::date' +
            ') AS HORARIOS_CON_INCIDENCIAS' +
            ') AS HORARIOS_UNIFICADOS ' +
            'WHERE ORDEN = 1';

  result.params = [idempresa, dayofweek, fecha, monumentos, clienttimezone];
  //console.log('getHorariosMonumentos.params:', result.params);

  return result;
};

exports.getReservaGuiaStatement = function(hasJornada){
  statement =
          'SELECT TODOS.IDEMPRESA, TODOS.IDGUIA, TODOS.CODIGO, TODOS.GUIANOMBRE, COALESCE(JORNADAS.JORNADA,\'#\') JORNADA, TODOS.FIJO, TODOS.NOMBRE, TODOS.IDIOMAS,' +
          '       TODOS.CODIGO GUIA,TODOS.GUIANOMBRE NOMBRE, $2 FECHA, 0 NUMGRUPOS FROM ' +
          '(' +
          '  SELECT IDEMPRESA, idusuarioapp IDGUIA, CODIGO, NOMBRE GUIANOMBRE, \'#\' JORNADA, FIJO, (CODIGO || \'-\' || NOMBRE) NOMBRE, IDIOMAS' +
          '    FROM GT_PDU' +
          '   WHERE IDEMPRESA = $1 AND TABLA = $3' +
          ') TODOS ' +
          'LEFT OUTER JOIN ' +
          '(' +
          '  SELECT IDEMPRESA, IDGUIA, GUIA, NOMBRE, FECHA, FIJO, MAX(JORNADA) JORNADA' +
          '    FROM(' +
          //   GUÍAS RESERVADOS MANUALMENTE
          '    SELECT A.IDEMPRESA, B.idusuarioapp IDGUIA, A.GUIA, NOMBRE, A.FECHA, A.JORNADA, B.FIJO' +
          '      FROM GT_RESERVAGUIA A, GT_PDU B' +
          '      WHERE A.IDEMPRESA = $1 AND (A.FECHA AT TIME ZONE $4)::date = ($2 AT TIME ZONE $4)::date' +
          '       AND A.IDEMPRESA = B.IDEMPRESA AND B.TABLA = $3 AND B.CODIGO = A.GUIA' +
          '    UNION ALL' +
          //   GUÍAS FIJOS
          '    SELECT $1, idusuarioapp IDGUIA, CODIGO, NOMBRE, $2 FECHA, \'C\', TRUE FIJO' +
          '      FROM GT_PDU' +
          '    WHERE IDEMPRESA = $1 AND TABLA = $3 AND FIJO IS TRUE' +
          '       AND CODIGO NOT IN (SELECT GUIA FROM GT_RESERVAGUIA WHERE IDEMPRESA = $1 AND (FECHA AT TIME ZONE $4)::date = ($2 AT TIME ZONE $4)::date)' +
          '    UNION ALL' +
          //   VACACIONES DE GUÍAS FIJOS
          '    SELECT A.IDEMPRESA, idusuarioapp IDGUIA, CODIGO, NOMBRE, $2 FECHA, \'V\' JORNADA, TRUE FIJO' +
          '     FROM GT_DESCANSOS A, GT_PDU B WHERE A.IDEMPRESA = $1 AND B.IDEMPRESA = A.IDEMPRESA AND A.IDGUIA = B.idusuarioapp AND TABLA = $3 AND FIJO IS TRUE' +
          '      AND (TSDESDE AT TIME ZONE $4)::date <= ($2 AT TIME ZONE $4)::date AND (TSHASTA AT TIME ZONE $4)::date >= ($2 AT TIME ZONE $4)::date' +
          ' ) RESERVAS_MANUALES_Y_VACACIONES' +
          '   GROUP BY IDEMPRESA, IDGUIA, GUIA, NOMBRE, FECHA, FIJO' +
          ') JORNADAS ' +
          'ON TODOS.IDEMPRESA = JORNADAS.IDEMPRESA AND TODOS.CODIGO = JORNADAS.GUIA ';
          if(hasJornada){
            statement = statement + ' WHERE JORNADAS.JORNADA IS NOT NULL';
          }
          statement = statement + ' ORDER BY TODOS.FIJO DESC, CASE WHEN JORNADAS.JORNADA IS NULL THEN 1 ELSE 0 END, COALESCE(JORNADAS.JORNADA,\'#\'), CODIGO';
  return statement;
};

exports.sanitizeRegisterBody = function(body){
  console.log('sanitizeRegisterBody:', body);
  var sanitize = {datosOk : true, error: '', idregister: 0};
  if(!body || !body.empresanombre || body.empresanombre.length < 3){
    sanitize.datosOk = false;
    sanitize.error = 'Empresa incorrecta';
  }
  if(!body || !body.empresanombrecompleto || body.empresanombrecompleto.length < 3){
    sanitize.datosOk = false;
    sanitize.error = 'Empresa incorrecta';
  }
  if(!body || !body.usuarionombre || body.usuarionombre.length < 6){
    sanitize.datosOk = false;
    sanitize.error = 'Usuario incorrecto';
  }
  if(!body || !body.usuarionombrecompleto || body.usuarionombrecompleto.length < 6){
    sanitize.datosOk = false;
    sanitize.error = 'Usuario incorrecto';
  }
  if(!body || !body.email || body.email.length < 6){
    sanitize.datosOk = false;
    sanitize.error = 'Email incorrecto';
  }
  if(!body || !body.password || body.password.length < 8){
    sanitize.datosOk = false;
    sanitize.error = 'Contraseña incorrecta';
  }
  return new Promise((resolve, reject) => {
    pool.connect(function(err, client, done) {
      if(err) {
        done();
        reject(err);
      }
      else{
        var statement = 'SELECT * FROM gt_empresa e, gt_usuario u WHERE upper(e.nombre) = $1 OR upper(u.nombre) = $2 OR upper(u.email) = $3';
        var params = [
          body.empresanombre.toUpperCase(),
          body.usuarionombre.toUpperCase(),
          body.email.toUpperCase()];
        console.log('pg-sql: ' + (statement + ' - ' + params).replace(/\s\s+/g, ' '));
        client.query(statement, params, function(err, result) {
          if (err){
            done();
            reject(err);
          }
          else{
            if(result.rowCount > 0){
              done();
              sanitize.datosOk = false;
              sanitize.error = 'Datos duplicados';
              console.log('sanitizeRegisterBody:', sanitize);
              resolve(sanitize);
            }
            else{
              if(body.insert){
                statement = 'INSERT INTO gt_register (empresanombre, empresanombrecompleto, usuarionombre, usuarionombrecompleto, password, email)' +
                            '                  VALUES($1, $2, $3, $4, $5, $6) RETURNING idregister';
                params = [
                  body.empresanombre
                 ,body.empresanombrecompleto
                 ,body.usuarionombre
                 ,body.usuarionombrecompleto
                 ,bcrypt.hashSync(body.password)
                 ,body.email
                ];
                console.log('pg-sql: ' + (statement + ' - ' + params).replace(/\s\s+/g, ' '));
                client.query(statement, params, function(err, result) {
                  done();
                  if (err){
                    reject(err);
                  }
                  else{
                    sanitize.idregister = result.rows[0].idregister;
                    console.log('sanitizeRegisterBody:', sanitize);
                    resolve(sanitize);
                  }
                });
              }
              else{
                done();
                sanitize.idregister = 0;
                console.log('sanitizeRegisterBody:', sanitize);
                resolve(sanitize);
              }
            }
          }
        });
      }
    });
  })
};