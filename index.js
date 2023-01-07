var express = require('express');                // express server
var cors = require('cors')
var path = require('path');
var bodyParser = require('body-parser');
var app = express();
app.use(cors());

app.set('port', (process.env.PORT || 5000));

env = process.env.NODE_ENV || 'development';

var forceSsl = function (req, res, next) {
	if (req.headers['x-forwarded-proto'] !== 'https') {
		return res.redirect(['https://', req.get('Host'), req.url].join(''));
	}
	return next();
};

if (env === 'production') {
	app.use(forceSsl);
}

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());

var userRouter = require('./routes/userRouter');
var companyRouter = require('./routes/companyRouter');
var pduRouter = require('./routes/pduRouter');
var grupoRouter = require('./routes/grupoRouter');
var facturaRouter = require('./routes/facturaRouter');
var printRouter = require('./routes/printRouter');
var emailRouter = require('./routes/emailRouter');

app.use('/users', userRouter);
app.use('/companies', companyRouter);
app.use('/pdus', pduRouter);
app.use('/grupos', grupoRouter);
app.use('/facturas', facturaRouter);
app.use('/print', printRouter);
app.use('/email', emailRouter);

//Include all angular router to make refresh (f5) work
app.get('/login', function(request, response) {response.sendFile(path.join(__dirname, 'public/index.html'));});
app.get('/home', function(request, response) {response.sendFile(path.join(__dirname, 'public/index.html'));});
app.get('/info', function(request, response) {response.sendFile(path.join(__dirname, 'public/index.html'));});
app.get('/profile', function(request, response) {response.sendFile(path.join(__dirname, 'public/index.html'));});

app.get('/', function(request, response) {
  response.sendFile(path.join(__dirname, 'dist'));
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
  console.log('Timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
  var Getup = require('./getup');
  Getup.pushGetup();
});