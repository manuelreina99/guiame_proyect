var jwt = require('jsonwebtoken');               // used to create, sign, and verify tokens
var Utils = require('./utils');

exports.getToken = function (user) {
    return jwt.sign(user, process.env.SECRET_KEY);
};

// check if the user is who he/she says he/she is
exports.verifyRead = function (req, res, next) {
    // check header or url parameters or post parameters for token
    var token = req.body.token || req.query.token || req.headers['x-access-token'];

    // decode token
    if (token) {
        // verifies secret and checks exp
        jwt.verify(token, process.env.SECRET_KEY, function (err, decoded) {
            if (err) {
                res.status(403).json({"error": 'You are not authenticated!'});
            } else {
                req.decoded = decoded;
                next();
            }
        });
    } else {
        // if there is no token return an error
        res.status(403).json({"error": 'No token provided!'});
    }
};

// check if the user can write
exports.verifyWrite = function (req, res, next) {
    //console.log('req.decoded:' + req.decoded);
    if (req.decoded.rol >= Utils.ROL_WRITE){
        next();
    }
    else{
        var error = {error: 'No estás autorizado para realizar esta operación.'}
        if(req.decoded.nombre == 'demo'){
            error.secondline = 'La Demo sólo permite operaciones de consulta';
        }
        res.status(401).json(error);
    }
};

// check if the user is a boss
exports.verifyBoss = function (req, res, next) {
    //console.log('req.decoded:' + req.decoded);
    if (req.decoded.rol >= Utils.ROL_BOSS || req.decoded.nombre == 'demo'){
        next();
    }
    else{
        res.status(401).json({"error": 'No estás autorizado para realizar esta operación.'});
    }
};

// check if the user can get aeat reports
exports.verifyAeat = function (req, res, next) {
    //console.log('req.decoded:' + req.decoded);
    if (req.decoded.rol >= Utils.ROL_BOSS || req.decoded.nombre == 'demo' || req.decoded.nombre == 'inma'){
        next();
    }
    else{
        res.status(401).json({"error": 'No estás autorizado para realizar esta operación.'});
    }
};

// check if the user is an admin
exports.verifyAdmin = function (req, res, next) {
    //console.log('req.decoded:' + req.decoded);
    if (req.decoded.rol >= Utils.ROL_ADMIN){
        next();
    }
    else{
        res.status(401).json({"error": 'No estás autorizado para realizar esta operación.'});
    }
};