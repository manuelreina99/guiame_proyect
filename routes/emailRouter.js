// Routes '/email

var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var Utils = require('../utils');
var Verify = require('../verify');
var PrintFactura = require('../routes/printFactura');
var emailRouter = express.Router({mergeParams: true}); //mergeParams preserve the req.params values from the parent router.

emailRouter.use(bodyParser.json());

emailRouter.route('/factura')
.put(Verify.verifyRead, Verify.verifyWrite, function(req, res) {
  if(!req.body.idfactura){
    req.body.idfactura = 0;
  }
  console.log('emailRouter.factura:', req.body);
  Utils.pool.connect(function(err, client, done) {
    if(err){
      Utils.handleError(res, done, err.message, "error fetching client from pool");
    }
    else{
      var idsToPrint = [];
      idsToPrint.push(req.body.idfactura);
      PrintFactura.printFactura(client, req.decoded.idultimaempresa, idsToPrint, false, req.headers['client-timezone'], function(err, pdfDoc){
        if(err){
          Utils.handleError(res, done, err.message, "Error email factura.");
        }
        else{
          var statement = 'SELECT f.numero || \'/\' || f.anio factura,' +
                          '       f.nombre,' +
                          '       u.nombrecompleto,' +
                          '       u.email senderemail' +
                          '  FROM gt_factura f, gt_usuario u' +
                          ' WHERE f.idempresa = $1' +
                          '   AND f.idfactura = $2' +
                          '   AND f.idusuarioemisor = $3' +
                          '   AND u.idusuario = $3';
          var params = [req.decoded.idultimaempresa, req.body.idfactura, req.decoded.idusuario];
          Utils.log(statement + ' - ' + params);
          client.query(statement, params, function(err, result) {
            if (err){
              Utils.handleError(res, done, err.message, "Error email factura.");
            }
            else{
              if(result.rowCount > 0 && req.body.recipient && req.body.recipient.length > 3 && req.body.recipient.includes('@')){
                done();
                var fs = require('fs');
                const fileName =  path.join(process.cwd(), 'mail_' + req.decoded.idultimaempresa + '.pdf');
                const writeStream = fs.createWriteStream(fileName);
                pdfDoc.pipe(writeStream);
                pdfDoc.end();

                writeStream.on('finish', function () {
                  var senderEmail = result.rows[0].senderemail;
                  const sgMail = require('@sendgrid/mail');
                  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
                  const msg = {
                    to: req.body.recipient,
                    from: senderEmail,
                    subject: 'Factura ' + result.rows[0].factura,
                    //text: 'Estimado ' + result.rows[0].nombre,
                    html:
                      'Estimado ' + result.rows[0].nombre +
                      ', adjunto factura sobre servicios prestados.<br/><br/>' +
                      'Gracias y un saludo.<br/><br/>',
                    attachments: [
                      {
                        //content: new Buffer(fs.readFileSync(fileName)).toString('base64'),
                        content: Buffer.from(fs.readFileSync(fileName)).toString('base64'),
                        filename: 'Factura ' + result.rows[0].nombrecompleto + ', número: ' + result.rows[0].factura + '.pdf',
                        type: 'application/pdf',
                        disposition: 'attachment'
                      },
                    ],
                  };
                  //console.log(msg);
                  sgMail.send(msg, (err, result) => {
                    if (err) {
                      console.log(err);
                      Utils.handleError(res, done, err.message, "Error enviando factura por email (sendgrid).");
                    }
                    else {
                      fs.unlinkSync(fileName);
                      console.log('factura id ' + req.body.idfactura + ' emailed from user id ' + req.decoded.idusuario + ' to ' + req.body.recipient);
                      res.status(200).json(result);
                    }
                  });
                });
              }
              else{
                Utils.handleError(res, done, 'No se ha enviado la factura por email. No puedes enviar facturas que no sean tuyas.', 'Opps!', 400);
              }
            }
          });
        }
      });
    }
  });
})

;

module.exports = emailRouter;