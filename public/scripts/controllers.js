'use strict';

angular.module('guiame')

.controller('HeaderController', ['$scope', '$rootScope', 'AuthService', '$location', 'ROL_BOSS', 'ROL_ADMIN', 'ngDialog', '$state',
 function ($scope, $rootScope, AuthService, $location, ROL_BOSS, ROL_ADMIN, ngDialog, $state) {

    //console.log('HeaderController:', $location.path());
    $rootScope.loggedIn = false;
    $scope.season = {season : false, img: ''};
    $scope.ROL_BOSS = ROL_BOSS;
    $scope.ROL_ADMIN = ROL_ADMIN;
    $scope.showCabecera = !$location.path().includes('forgotpassword') &&
                          !$location.path().includes('requestnewpassword');

    $rootScope.showBuscarArticulos = false;
    $rootScope.notifyOk = {type: 'success', title: '&nbsp;', content: '', timeout: 1000 }; //time in ms
    $rootScope.notifyNok = {type: 'error', title: '&nbsp;', content: '', timeout: 2000 }; //time in ms

    if(AuthService.isAuthenticated()) {
        $rootScope.bg = 'none';
        $rootScope.loggedIn = true && $scope.showCabecera;
        $scope.user = AuthService.getUser();
        AuthService.getFilters();
        $rootScope.weather = {};
    }

    $scope.logOut = function(confirm) {
        //console.log('logout');
        if(!confirm){
            AuthService.logout();
            $rootScope.loggedIn = false;
            $rootScope.bg = 'bg';
        }
        else{
            var message = '<div class="dialog-contents">' +
                'Vas a cerrar sesión ¿Estás seguro?<br/><br/>' +
                '<button class="btn" ng-click="closeThisDialog()" title="Cancelar">No</button>' +
                '<span class="float-right">&nbsp;&nbsp;</span>' +
                '<button class="btn btn-primary float-right" ng-click="confirm()" title="Cerrar sesión">Sí</button>' +
                '<br/><br/>' +
                '</div>';
            ngDialog.openConfirm({ template: message, plain: 'true'}).then(
                function successCallback(response) {
                    AuthService.logout();
                    $rootScope.loggedIn = false;
                    $rootScope.bg = 'bg';
                }
            );
        }
    };

    $rootScope.$on('login:Successful', function () {
        $rootScope.bg = 'none';
        $rootScope.loggedIn = true && $scope.showCabecera;
        $scope.user = AuthService.getUser();
        //$location.path('/home');
        $state.reload();
        AuthService.getFilters();
    });

    
    $rootScope.modalErrorInstance = null;
    $rootScope.modalErrorOptions = {
          animation: false,
          templateUrl: 'views/errorModal.html',
          size: 'lg'
        }

    $rootScope.cerrarErrorModal = function () {
        $rootScope.modalErrorInstance.dismiss('cancel');
    };
}])

.controller('LoginController', ['$scope', '$rootScope', '$location', 'AuthService', '$localStorage', 'ErrorService',
    function ($scope,  $rootScope, $location, AuthService, $localStorage, ErrorService) {

    $rootScope.active = 'Inicio';
    $scope.userinfo = $localStorage.getObject('userinfo', null);
    if ($scope.userinfo == null) {
        $scope.userinfo = {username: '', tokenId: ''};
    }
    else{
        $scope.userinfo.username = '';
    }

    $rootScope.bg = 'bg';

    $scope.loginData = {username: $scope.userinfo.username, password: ''};
    $scope.email = {name: '', email: '', message: ''};
    $scope.year = new Date().getFullYear();
    $scope.error = false;
    $scope.desactivado = false;

    $scope.doLogin = function() {
        AuthService.login($scope.loginData);
    }

    $scope.doEMail = function(){
        console.log('send email:', $scope.email);
    }

    $rootScope.$on('login:Unsuccessful', function () {
        $scope.error = true;
        $scope.desactivado = false;
    })

    $rootScope.$on('login:Deactivated', function () {
        $scope.desactivado = true;
        $scope.error = false;
    })

    if(AuthService.isAuthenticated()){
        $location.path('/grupos');
    }
}])

.controller('CodigosController', ['$scope', 'PduService', 'ErrorService', '$rootScope', 'AuthService', '$window', 'ngDialog', '$state', '$timeout',
    function ($scope, PduService, ErrorService, $rootScope, AuthService, $window, ngDialog, $state, $timeout) {
    $scope.title = 'CÓDIGOS';
    $rootScope.pageTitle = 'CÓDIGOS';
    $rootScope.active = 'Opciones';
    $scope.loading = {progress: true, ok: false};

    $scope.tablas = [];
    $scope.codigos = [];
    $scope.currentForm = {};
    $scope.selectedTabla = null;
    $scope.selectedCodigo = null;
    $scope.error = {isError: false, text: ''};
    var pdusToRead = ['tarifa','provincia','formapago','tipofactura', 'idioma'];
    $scope.pdus = [];

    $scope.load = function(showOk){
        $scope.loading.progress = true;
        PduService.getPdus(pdusToRead).then(
            function successCallback(response) {
                $scope.pdus = response.data;
          }, function errorCallback(response) {
            ErrorService.showError(response);
          });
        PduService.getTablas().then(
            function successCallback(response) {
                showLoadedOk();
                $scope.tablas = response.data;
          }, function errorCallback(response) {
                ErrorService.showError(response);
          });
    }

    $scope.updateCodigos = function(tabla){
        $scope.selectedTabla = tabla;
        $scope.selectedCodigo = null
        $scope.codigos = [];
        if($scope.selectedTabla && $scope.selectedTabla.tabla){
            $scope.loading.progress = true;
            console.log('$scope.selectedTabla:', $scope.selectedTabla.tabla);
            PduService.getCodigosPdu($scope.selectedTabla.tabla).then(
                function successCallback(response) {
                    console.log('codigos:', response.data);
                    showLoadedOk();
                    $scope.codigos = response.data;
                    setCamposAMostrar();
                    if(!$scope.selectedCodigo && $scope.codigos.length){
                        $scope.updateSelectedCodigo($scope.codigos[0]);
                    }
              }, function errorCallback(response) {
                    ErrorService.showError(response);
              });
        }
    }

    function setCamposAMostrar(){
        $scope.selectedTablaCampos = 1;
        if($scope.selectedTabla.tabla == 'busempresa' ||
           $scope.selectedTabla.tabla == 'facilitagrupo' ||
           $scope.selectedTabla.tabla == 'guia' ||
           $scope.selectedTabla.tabla == 'proveedor' ||
           $scope.selectedTabla.tabla == 'guiacorreo'){
            $scope.selectedTablaCampos = 2;
        }
        if($scope.selectedTabla.tabla == 'agencia'){
            $scope.selectedTablaCampos = 3;
        }
    }

    $scope.updateSelectedCodigo = function(codigo){
        console.log('updateSelectedCodigo:', codigo);
        $scope.error.isError = false;
        $scope.currentForm.formCodigo.$setPristine();
        $scope.selectedCodigo = codigo;
    }

    $scope.upsertCodigo = function(showOk){
        console.log('upsertCodigo:', $scope.selectedCodigo);
        $scope.loading.progress = true;
        var nuevo = ($scope.selectedCodigo.idpdu == 0);
        PduService.upsertPdu($scope.selectedCodigo).then(
            function successCallback(response) {
                showLoadedOk();
                $scope.currentForm.formCodigo.$setPristine();
                console.log('res:', response.data);
                $scope.selectedCodigo.idpdu = response.data;
                if(nuevo){
                    $scope.codigos.push($scope.selectedCodigo);
                }
          }, function errorCallback(response) {
                ErrorService.showError(response);
          });
    }

    $scope.newPdu = function(){
        $scope.selectedCodigo = {idpdu : 0, tabla: $scope.selectedTabla.tabla};
    }

    $scope.deletePdu = function(showOk){
        var nuevo = ($scope.selectedCodigo.idpdu == 0);
        var message = '<div class="dialog-contents">' +
                    'Vas a borrar este código: ' + $scope.selectedCodigo.tabla + '/' + $scope.selectedCodigo.codigo + '/'+ $scope.selectedCodigo.nombre + '<br/><br/>' +
                    'Si se usa en algún grupo o factura, los dejarás inconsistentes.<br/><br/>' +
                    '¿Estás seguro?<br/><br/>' +
                    '<button class="btn" ng-click="closeThisDialog()">No</button>' +
                    '<span class="float-right">&nbsp;&nbsp;</span>' +
                    '<button class="btn btn-danger float-right" ng-click="confirm()">Sí</button>' +
                    '<br/><br/>' +
                    '</div>';
        ngDialog.openConfirm({ template: message, plain: 'true'}).then(
            function successCallback(response) {
                $scope.loading.progress = true;
                PduService.deletePdu($scope.selectedCodigo.idpdu).then(
                    function successCallback(response) {
                        showLoadedOk();
                        $scope.selectedCodigo = null;
                        $scope.updateCodigos($scope.selectedTabla);
                  }, function errorCallback(response) {
                        ErrorService.showError(response);
                  });
            }
        );
    }

    $scope.checkCodigo = function(form){
        $scope.error.isError = false;
        if(!$scope.selectedCodigo.codigo || $scope.selectedCodigo.codigo.length < 2){
            form.formCodigoCodigo.$setValidity("required", false);
            $scope.error.isError = true;
            $scope.error.text = 'El código debe ser de al menos dos caracteres';
        }
        else{
            for (var i = 0; i < $scope.codigos.length; i++) {
                if($scope.codigos[i].codigo.toUpperCase() == $scope.selectedCodigo.codigo.toUpperCase()){
                    form.formCodigoCodigo.$setValidity("required", false);
                    $scope.error.isError = true;
                    $scope.error.text = 'El código ' + $scope.selectedCodigo.codigo + ' ya existe';
                    break;
                }
            }
        }
    }

    $scope.alert = function(text){
        $window.alert(text);
    }

    $scope.goToTarifa = function(codigotarifa){
        $state.go('app.tarifas', {codigotarifa: codigotarifa} );
    }

    function showLoadedOk() {
        $scope.loading.progress = false;
        $scope.loading.ok = true;
        $timeout(function(){
            $scope.loading.ok = false;
        }, 3000);
    }

    if(AuthService.isAuthenticated()){
        $scope.load(false);
    }
}])

.controller('FechasController', ['$scope', 'PduService', 'ErrorService', '$rootScope', 'AuthService', '$window', '$stateParams',
    function ($scope, PduService, ErrorService, $rootScope, AuthService, $window, $stateParams) {
    $scope.title = 'INCIDENCIAS';
    $rootScope.pageTitle = 'INCIDENCIAS';
    $scope.esfestivo = false;
    if($stateParams.esfestivo && $stateParams.esfestivo == 'true'){
        $scope.title = 'FESTIVOS';
        $rootScope.pageTitle = 'FESTIVOS';
        $scope.esfestivo = true;
    }
    $rootScope.active = 'Opciones';
    $scope.loading = true;

    $scope.fechas = [];
    $scope.fecha = {fecha: null, descripcion: null, festivo: $scope.esfestivo};

    $scope.load = function(showOk){
        $scope.loading = true;
        PduService.getFechas($scope.esfestivo).then(
            function successCallback(response) {
                $scope.loading = false;
                $scope.fechas = response.data;
          }, function errorCallback(response) {
                ErrorService.showError(response);
          });
    }

    $scope.deleteFecha = function(idfecha, showOk){
        console.log('deleteFecha:', idfecha);
        $scope.loading = true;
        PduService.deleteFecha(idfecha).then(
            function successCallback(response) {
                $scope.loading = false;
                $scope.fechas = response.data;
          }, function errorCallback(response) {
                ErrorService.showError(response);
          });
    }

    $scope.addFecha = function(showOk){
        console.log('addFecha:', $scope.fecha);
        if($scope.fecha.fecha){
            $scope.loading = true;
            PduService.addFecha($scope.fecha).then(
                function successCallback(response) {
                    $scope.loading = false;
                    $scope.fechas = response.data;
              }, function errorCallback(response) {
                    ErrorService.showError(response);
              });
        }
    }

    $scope.goToTop = function(){
        $window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if(AuthService.isAuthenticated()){
        $scope.load(false);
    }
}])

.controller('MonumentosController', ['$scope', 'PduService', 'ErrorService', '$rootScope', 'AuthService', '$window',
    function ($scope, PduService, ErrorService, $rootScope, AuthService, $window) {
    $scope.title = 'MONUMENTOS';
    $rootScope.pageTitle = 'MONUMENTOS';
    $rootScope.active = 'Opciones';
    $scope.loading = true;

    $scope.monumentos = [];
    $scope.monumento = null;
    $scope.currentForm = {};
    $scope.newIncidencia = newIncidencia();
    $scope.codigorepetido = false;

    function newMonumento(){
        return {idmonumento: 0, codigo: null, descripcion: null, precio:0, tel1:'', tel2: '', observaciones:'',
                lunes    : false, lh1: null, lh2: null, lh3: null, lh4: null,
                martes   : false, mh1: null, mh2: null, mh3: null, mh4: null,
                miercoles: false, xh1: null, xh2: null, xh3: null, xh4: null,
                jueves   : false, jh1: null, jh2: null, jh3: null, jh4: null,
                viernes  : false, vh1: null, vh2: null, vh3: null, vh4: null,
                sabado   : false, sh1: null, sh2: null, sh3: null, sh4: null,
                domingo  : false, dh1: null, dh2: null, dh3: null, dh4: null};
    }

    function newIncidencia(){
        return {idmonumentoincidencia:0, idmonumento:0, fechadesde:null, fechahasta:null, h1:null, h2:null, h3:null, h4:null};
    }

    $scope.load = function(){
        $scope.loading = true;
        PduService.getMonumentos().then(
            function successCallback(response) {
                $scope.loading = false;
                $scope.monumentos = formatTimes(response.data);
                if(!$scope.monumento && $scope.monumentos.length){
                    $scope.monumento = $scope.monumentos[0];
                }
          }, function errorCallback(response) {
                ErrorService.showError(response);
          });
    }

    function formatTimes(monumentos){
        for (var i = 0; i < monumentos.length; i++) {
            monumentos[i].lh1 = (monumentos[i].lh1 ? new Date(monumentos[i].lh1) : null);
            monumentos[i].lh2 = (monumentos[i].lh2 ? new Date(monumentos[i].lh2) : null);
            monumentos[i].lh3 = (monumentos[i].lh3 ? new Date(monumentos[i].lh3) : null);
            monumentos[i].lh4 = (monumentos[i].lh4 ? new Date(monumentos[i].lh4) : null);
            monumentos[i].mh1 = (monumentos[i].mh1 ? new Date(monumentos[i].mh1) : null);
            monumentos[i].mh2 = (monumentos[i].mh2 ? new Date(monumentos[i].mh2) : null);
            monumentos[i].mh3 = (monumentos[i].mh3 ? new Date(monumentos[i].mh3) : null);
            monumentos[i].mh4 = (monumentos[i].mh4 ? new Date(monumentos[i].mh4) : null);
            monumentos[i].xh1 = (monumentos[i].xh1 ? new Date(monumentos[i].xh1) : null);
            monumentos[i].xh2 = (monumentos[i].xh2 ? new Date(monumentos[i].xh2) : null);
            monumentos[i].xh3 = (monumentos[i].xh3 ? new Date(monumentos[i].xh3) : null);
            monumentos[i].xh4 = (monumentos[i].xh4 ? new Date(monumentos[i].xh4) : null);
            monumentos[i].jh1 = (monumentos[i].jh1 ? new Date(monumentos[i].jh1) : null);
            monumentos[i].jh2 = (monumentos[i].jh2 ? new Date(monumentos[i].jh2) : null);
            monumentos[i].jh3 = (monumentos[i].jh3 ? new Date(monumentos[i].jh3) : null);
            monumentos[i].jh4 = (monumentos[i].jh4 ? new Date(monumentos[i].jh4) : null);
            monumentos[i].vh1 = (monumentos[i].vh1 ? new Date(monumentos[i].vh1) : null);
            monumentos[i].vh2 = (monumentos[i].vh2 ? new Date(monumentos[i].vh2) : null);
            monumentos[i].vh3 = (monumentos[i].vh3 ? new Date(monumentos[i].vh3) : null);
            monumentos[i].vh4 = (monumentos[i].vh4 ? new Date(monumentos[i].vh4) : null);
            monumentos[i].sh1 = (monumentos[i].sh1 ? new Date(monumentos[i].sh1) : null);
            monumentos[i].sh2 = (monumentos[i].sh2 ? new Date(monumentos[i].sh2) : null);
            monumentos[i].sh3 = (monumentos[i].sh3 ? new Date(monumentos[i].sh3) : null);
            monumentos[i].sh4 = (monumentos[i].sh4 ? new Date(monumentos[i].sh4) : null);
            monumentos[i].dh1 = (monumentos[i].dh1 ? new Date(monumentos[i].dh1) : null);
            monumentos[i].dh2 = (monumentos[i].dh2 ? new Date(monumentos[i].dh2) : null);
            monumentos[i].dh3 = (monumentos[i].dh3 ? new Date(monumentos[i].dh3) : null);
            monumentos[i].dh4 = (monumentos[i].dh4 ? new Date(monumentos[i].dh4) : null);
        }
        return monumentos;
    }

    $scope.updateSelectedMonumento = function(monumento){
        console.log('updateSelectedMonumento:', monumento);

        $scope.monumento.incidencias = null;
        $scope.loading = true;
        PduService.getIncidenciasMonumento($scope.monumento.idmonumento).then(
            function successCallback(response) {
                $scope.loading = false;
                console.log('response.data:', response.data);
                $scope.monumento.incidencias = response.data;
                updateDatesIncidencias();
          }, function errorCallback(response) {
                ErrorService.showError(response);
          });
    }

    function updateDatesIncidencias(){
        console.log('$scope.monumento.incidencias:', $scope.monumento.incidencias);
        for (var i = 0; i < $scope.monumento.incidencias.length; i++) {
            $scope.monumento.incidencias[i].fechadesde = ( $scope.monumento.incidencias[i].fechadesde ? new Date($scope.monumento.incidencias[i].fechadesde) : null);
            $scope.monumento.incidencias[i].fechahasta = ( $scope.monumento.incidencias[i].fechahasta ? new Date($scope.monumento.incidencias[i].fechahasta) : null);
            $scope.monumento.incidencias[i].h1         = ( $scope.monumento.incidencias[i].h1         ? new Date($scope.monumento.incidencias[i].h1) : null);
            $scope.monumento.incidencias[i].h2         = ( $scope.monumento.incidencias[i].h2         ? new Date($scope.monumento.incidencias[i].h2) : null);
            $scope.monumento.incidencias[i].h3         = ( $scope.monumento.incidencias[i].h3         ? new Date($scope.monumento.incidencias[i].h3) : null);
            $scope.monumento.incidencias[i].h4         = ( $scope.monumento.incidencias[i].h4         ? new Date($scope.monumento.incidencias[i].h4) : null);
        }
        console.log('$scope.monumento.incidencias:', $scope.monumento.incidencias);
    }

    $scope.newMonumento = function(){
        $scope.monumento = newMonumento();
    }

    $scope.deleteMonumento = function(){
        $scope.loading = true;
        PduService.deleteMonumento($scope.monumento.idmonumento).then(
            function successCallback(response) {
                $scope.loading = false;
                $scope.monumentos = response.data;
                $scope.monumento = null;
          }, function errorCallback(response) {
                ErrorService.showError(response);
          });
    }

    $scope.upsertMonumento = function(){
        var nuevo = ($scope.monumento.idmonumento == 0);
        console.log('$scope.monumento:', $scope.monumento);

        $scope.loading = true;
        PduService.upsertMonumento($scope.monumento).then(
            function successCallback(response) {
                $scope.loading = false;
                console.log('upsertMonumento:', response.data);
                $scope.monumentos = formatTimes(response.data);
                var tempIncidencias = $scope.monumento.incidencias;
                for (var i = 0; i < $scope.monumentos.length; i++) {
                    if($scope.monumentos[i].idmonumento == $scope.monumento.idmonumento ||
                       (nuevo && $scope.monumentos[i].codigo == $scope.monumento.codigo)){
                        $scope.monumento = $scope.monumentos[i];
                        $scope.monumento.incidencias = tempIncidencias;
                        break;
                    }
                }
          }, function errorCallback(response) {
                ErrorService.showError(response);
          });
    }

    $scope.upsertIncidencia = function(incidencia){
        incidencia.idmonumento = $scope.monumento.idmonumento;
        $scope.loading = true;
        PduService.upsertIncidencia(incidencia).then(
            function successCallback(response) {
                $scope.loading = false;
                $scope.monumento.incidencias = response.data;
                updateDatesIncidencias();
                $scope.newIncidencia = newIncidencia();
          }, function errorCallback(response) {
                ErrorService.showError(response);
          });
    }

    $scope.deleteIncidencia = function(id){
        $scope.loading = true;
        PduService.deleteIncidencia(id).then(
            function successCallback(response) {
                $scope.loading = false;
                $scope.monumento.incidencias = response.data;
                updateDatesIncidencias();
          }, function errorCallback(response) {
                ErrorService.showError(response);
          });
    }

    $scope.checkCodigo = function(){
        $scope.codigorepetido = false;
        if($scope.monumento.idmonumento == 0 && $scope.monumento.codigo && $scope.monumento.codigo.length > 0){
            for (var i = 0; i < $scope.monumentos.length; i++) {
                if($scope.monumentos[i].codigo.toUpperCase() == $scope.monumento.codigo.toUpperCase()){
                    $scope.codigorepetido = true;
                    break;
                }
            }
        }
    }

    $scope.goToTop = function(){
        $window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if(AuthService.isAuthenticated()){
        $scope.load(false);
    }
}])

.controller('TarifasController', ['$scope', 'PduService', 'ErrorService', '$rootScope', 'AuthService', 'PrintService', '$stateParams',
    function ($scope, PduService, ErrorService, $rootScope, AuthService, PrintService, $stateParams) {
    $scope.title = 'TARIFAS';
    $rootScope.pageTitle = 'TARIFAS';
    $rootScope.active = 'Opciones';
    $scope.loading = true;

    $scope.tarifas = [];
    $scope.tarifa = null;
    $scope.currentForm = {};
    $scope.codigorepetido = false;
    $scope.newPrecio = {tipovisita : '', paxdesde: 0, paxhasta: 0, laborable: 0, festivo: 0};
    var pdusToRead = ['tipovisita'];
    $scope.pdus = [];

    $scope.load = function(showOk){
        $scope.loading = true;
        PduService.getPdus(pdusToRead).then(
            function successCallback(response) {
                //console.log('pdus:', response.data);
                $scope.pdus = response.data;
          }, function errorCallback(response) {
            ErrorService.showError(response);
          });
        PduService.getTarifas().then(
            function successCallback(response) {
                $scope.loading = false;
                $scope.tarifas = response.data;
                console.log('$scope.tarifas:', $scope.tarifas);
                if($stateParams.codigotarifa){
                    for (var i = 0; i < $scope.tarifas.length; i++) {
                        if($scope.tarifas[i].codigo == $stateParams.codigotarifa){
                            $scope.tarifa = $scope.tarifas[i];
                            break;
                        }
                    }
                }
                else{
                    if($scope.tarifas.length){
                        $scope.tarifa = $scope.tarifas[0];
                    }
                }
          }, function errorCallback(response) {
                ErrorService.showError(response);
          });
    }

    $scope.upsertTarifa = function(showOk){
        //console.log('upsertTarifa:', $scope.tarifa);
        $scope.loading = true;
        var nuevo = ($scope.tarifa.idtarifa == 0);
        if($scope.newPrecio.tipovisita != ''){
            $scope.tarifa.precios.push($scope.newPrecio);
        }
        PduService.upsertTarifa($scope.tarifa).then(
            function successCallback(response) {
                $scope.loading = false;
                console.log('res:', response.data);
                $scope.tarifa.idtarifa = response.data;
                $scope.newPrecio = {tipovisita : '', paxdesde: 0, paxhasta: 0, laborable: 0, festivo: 0};
                if(nuevo){
                    $scope.tarifas.push($scope.tarifa);
                }
          }, function errorCallback(response) {
                ErrorService.showError(response);
          });
    }

    $scope.newTarifa = function(){
        $scope.tarifa = {idtarifa : 0, monumentolaborable: 0, monumentofestivo: 0, horalaborable: 0, horafestivo: 0, idiomalaborable: 0, idiomafestivo: 0, precios : []};
        $scope.newPrecio = {tipovisita : '', paxdesde: 0, paxhasta: 0, laborable: 0, festivo: 0};
    }

    $scope.deletePrecio = function(precio){
        //console.log('precios:', $scope.tarifa.precios);
        //console.log('precio a borrar:', precio);
        var tempPrecios = [];
        for (var i = 0; i < $scope.tarifa.precios.length; i++) {
            if($scope.tarifa.precios[i].tipovisita == precio.tipovisita && $scope.tarifa.precios[i].paxdesde == precio.paxdesde){
                //console.log('borrando:', $scope.tarifa.precios[i]);
            }
            else{
                tempPrecios.push($scope.tarifa.precios[i]);
            }
        }
        $scope.tarifa.precios = tempPrecios;
        $scope.upsertTarifa(true);
        //console.log('precios:', $scope.tarifa.precios);
    }

    $scope.checkCodigo = function(){
        $scope.codigorepetido = false;
        if($scope.tarifa.idtarifa == 0 && $scope.tarifa.codigo && $scope.tarifa.codigo.length > 0){
            for (var i = 0; i < $scope.tarifas.length; i++) {
                if($scope.tarifas[i].codigo.toUpperCase() == $scope.tarifa.codigo.toUpperCase()){
                    $scope.codigorepetido = true;
                    break;
                }
            }
        }
    }

    $scope.printTarifa = function(){
        console.log('printTarifa:', $scope.tarifa);
        PrintService.tarifa($scope.tarifa.idtarifa);
    }

    if(AuthService.isAuthenticated()){
        $scope.load(false);
    }
}])

.controller('ReservaGuiasController', ['$scope', 'CompanyService', 'ErrorService', '$rootScope', 'AuthService', 'PduService', '$window',
    function ($scope, CompanyService, ErrorService, $rootScope, AuthService, PduService, $window) {
    $scope.title = 'RESERVA DE GUÍAS';
    $rootScope.pageTitle = 'RESERVA DE GUÍAS';
    $rootScope.active = 'ReservaGuias';
    $scope.loading = true;

    $scope.filtro = {fecha : new Date()};

    $scope.datos = [];
    $scope.numGuiasDisponibles = 0;
    var pdusToRead = ['guia'];
    $scope.pdus = [];

    $scope.load = function(showOk){
        $scope.loading = true;
        PduService.getPdus(pdusToRead).then(
            function successCallback(response) {
                //console.log('pdus:', response.data);
                $scope.pdus = response.data;
          }, function errorCallback(response) {
            ErrorService.showError(response);
          });
        if(!$scope.filtro.fecha){
            $scope.filtro.fecha = new Date();
        }
        CompanyService.getReservas($scope.filtro.fecha).then(
            function successCallback(response) {
                console.log('datos:', response.data);
                $scope.loading = false;
                $scope.datos = response.data;
                $scope.numGuiasDisponibles = $scope.datos.reservas.filter( item => item.jornada != 'N').length;
                if(showOk){
                    ErrorService.showTooltip($scope, $rootScope.notifyOk);
                }
          }, function errorCallback(response) {
                ErrorService.showError(response);
          });
    }

    $scope.addDayToFiltroFecha = function(days){
        if($scope.filtro.fecha){
            $scope.filtro.fecha.setDate($scope.filtro.fecha.getDate() + days);
            $scope.filtro.fecha = new Date($scope.filtro.fecha);
            $scope.load(true);
        }
    }

    $scope.deleteReserva = function(idguia, fijo, jornada, showOk){
        $scope.loading = true;
        CompanyService.deleteReserva($scope.filtro.fecha, idguia, fijo, jornada).then(
            function successCallback(response) {
                console.log('datos:', response.data);
                $scope.loading = false;
                $scope.load(true);
                if(showOk){
                    ErrorService.showTooltip($scope, $rootScope.notifyOk);
                }
          }, function errorCallback(response) {
                ErrorService.showError(response);
          });
    }

    $scope.addReserva = function(showOk){
        $scope.newReserva.fecha = $scope.filtro.fecha;
        if($scope.filtro.fecha){
            $scope.loading = true;
            CompanyService.upsertReserva($scope.newReserva).then(
                function successCallback(response) {
                    $scope.loading = false;
                    $scope.newReserva = null;
                    $scope.load(showOk);
              }, function errorCallback(response) {
                    ErrorService.showError(response);
              });
        }
    }

    $scope.goToTop = function(){
        $window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    $scope.getWeekdayName = function(fecha){
        return PduService.getWeekdayName(fecha);
    }

    if(AuthService.isAuthenticated()){
        $scope.load(false);
    }
}])

.controller('MiPerfilController', ['$scope', 'CompanyService', 'ErrorService', '$rootScope', 'AuthService', 'PduService', 'ngDialog', '$location', '$timeout',
    function ($scope, CompanyService, ErrorService, $rootScope, AuthService, PduService, ngDialog, $location, $timeout) {
    $scope.title = 'MI PERFIL';
    $rootScope.pageTitle = 'MI PERFIL';
    $rootScope.active = 'MiPerfil';
    $scope.loading = {progress: true, ok: false};
    $scope.miperfil = {};
    $scope.supportsNotifications = false;
    $scope.supportsSW = false;
    $scope.newPassword = { pass1: '', pass2: ''};
    $scope.empresas = [];
    $scope.misDatos = {};

    if (('Notification' in window)) {
        $scope.supportsNotifications = true;
    }

    if ('serviceWorker' in navigator){
        $scope.supportsSW = true;
    }

    $scope.load = function(showOk){
        $scope.loading.progress = true;
        CompanyService.getEmpresas().then(
            function successCallback(response) {
                $scope.empresas = response.data;
                console.log('$scope.empresas:', $scope.empresas);
          }, function errorCallback(response) {
                ErrorService.showError(response);
          });
        AuthService.getUserInfoFromServer($rootScope.currentUser.id).then(
            function successCallback(response) {
                $scope.loading.progress = false;
                $scope.misDatos = response.data;
                console.log($scope.misDatos);
          }, function errorCallback(response) {
                ErrorService.showError(response);
          });
    }

    $scope.subscribeToPush = function(){
        return new Promise((resolve, reject) => {
          if (Notification.permission === 'denied') {
            $scope.miperfil.console = 'Push messages are blocked.';
            return reject(new Error('Push messages are blocked.'));
          }

          if (Notification.permission === 'granted') {
            return resolve();
          }

          if (Notification.permission === 'default') {
            Notification.requestPermission((result) => {
              if (result !== 'granted') {
                $scope.miperfil.console = 'Bad permission result';
                reject(new Error('Bad permission result'));
              }

              resolve();
            });
          }
        })
        .then(() => {
          // We need the service worker registration to access the push manager
          return navigator.serviceWorker.ready
          .then((serviceWorkerRegistration) => {
            return serviceWorkerRegistration.pushManager.subscribe(
              {
                userVisibleOnly: true,
                applicationServerKey: urlB64ToUint8Array('your_applicationServerKey'),
              }
            );
          })
          .then((subscription) => {
            $scope.loading.progress = true;
            AuthService.subscribePush(subscription).then(
                function successCallback(response) {
                    $scope.loading.progress = false;
                    $scope.miperfil = response.data;
                    ErrorService.showTooltip($scope, $rootScope.notifyOk);
              }, function errorCallback(response) {
                ErrorService.showError(response);
              });
          })
          .catch((subscriptionErr) => {
            $scope.miperfil.console = 'subscriptionErr';
            console.log(subscriptionErr);
          });
        })
        .catch((e) => {
          // Check for a permission prompt issue
          console.log(e);
        });
    }

    $scope.unsubscribeToPush = function(){
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration('./serviceWorker.js')
            .then(function(swReg) {
                swReg.pushManager.getSubscription()
                    .then(function(subscription) {
                        var isSubscribed = !(subscription === null);
                        if (isSubscribed) {
                            return subscription.unsubscribe();
                        }
            });
            $scope.loading.progress = true;
            AuthService.unsubscribePush().then(
                function successCallback(response) {
                    $scope.loading.progress = false;
                    $scope.miperfil = response.data;
                    var message =   '<div class="dialog-contents">' +
                                    'No recibirás más notificaciones de la aplicación hasta que te suscribas de nuevo<br/><br/>' +
                                    '<button class="btn btn-primary float-right" ng-click="closeThisDialog()">Ok</button>' +
                                    '<br/><br/>' +
                                    '</div>';
                    ngDialog.openConfirm({ template: message, plain: 'true'});
              }, function errorCallback(response) {
                ErrorService.showError(response);
              });
          });
      }
    }

    var urlB64ToUint8Array = function(base64String) {
      const padding = '='.repeat((4 - base64String.length % 4) % 4);
      const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);

      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    }

    $scope.changePass = function(){
        $scope.loading.progress = true;
        if($scope.newPassword && $scope.newPassword.pass1 && $scope.newPassword.pass2 && $scope.newPassword.pass1.length >= 6 && $scope.newPassword.pass1 == $scope.newPassword.pass2){
            AuthService.changePass($scope.newPassword.pass1).then(
                function successCallback(response) {
                    $scope.loading.progress = false;
                    var message =   '<div class="dialog-contents">' +
                                    'Password modificada con éxito<br/><br/>' +
                                    '<button class="btn btn-primary float-right" ng-click="closeThisDialog()">Ok</button>' +
                                    '<br/><br/>' +
                                    '</div>';
                    ngDialog.openConfirm({ template: message, plain: 'true'});
              }, function errorCallback(response) {
                ErrorService.showError(response);
              });
        }

    }

    $scope.setEmpresa = function(idempresa){
        console.log('setEmpresa.from:', AuthService.getUser().empresa.id);
        console.log('setEmpresa.to  :', idempresa);
        if (idempresa != AuthService.getUser().empresa.id){
            CompanyService.setEmpresa(idempresa).then(
                function successCallback(response) {
                    AuthService.setEmpresa(response.data);
                    $location.path('/home');
                }, function errorCallback(response) {
                    ErrorService.showError(response);
                });
        }
        else{
            $location.path('/home');
        }
    }

    $scope.updateUserDatos = function(){
        $scope.loading.progress = true;
        AuthService.updateUser($scope.misDatos).then(
            function successCallback(response) {
                $scope.loading.progress = false;
                showLoadedOk();
                $rootScope.currentUser.facturadefaulttext = $scope.misDatos.facturadefaulttext;
                AuthService.storeCurrentUser();
            }, function errorCallback(response) {
                ErrorService.showError(response);
            });
    }

    function showLoadedOk() {
        $scope.loading.progress = false;
        $scope.loading.ok = true;
        $timeout(function(){
            $scope.loading.ok = false;
        }, 3000);
    }

    if(AuthService.isAuthenticated()){
        $scope.load(false);
    }
}])

.controller('GuardiasController', ['$scope', 'CompanyService', 'ErrorService', '$rootScope', 'AuthService', 'PduService', 'ngDialog', '$window',
    function ($scope, CompanyService, ErrorService, $rootScope, AuthService, PduService, ngDialog, $window) {
    $scope.title = 'GUARDIAS';
    $rootScope.pageTitle = 'GUARDIAS';
    $rootScope.active = 'Opciones';
    $scope.loading = true;

    $scope.defectoGuardias = {fechainicio: new Date(), usuarios: []};
    $scope.excepcionesGuardias = [];
    var pdusToRead = ['guia'];
    $scope.guias = [];

    $scope.load = function(showOk){
        $scope.loading = true;
        CompanyService.getDefectoGuardias().then(
            function successCallback(response) {
                console.log('response:', response.data);
                $scope.loading = false;
                $scope.defectoGuardias = response.data;
                $scope.defectoGuardias.fechainicio = ($scope.defectoGuardias.fechainicio ? new Date($scope.defectoGuardias.fechainicio) : null);
          }, function errorCallback(response) {
                ErrorService.showError(response);
          });
        CompanyService.getExcepcionesGuardias().then(
            function successCallback(response) {
                console.log('response:', response.data);
                $scope.excepcionesGuardias = response.data;
          }, function errorCallback(response) {
                ErrorService.showError(response);
          });
        PduService.getPdus(pdusToRead).then(
            function successCallback(response) {
            $scope.guias = response.data.filter(function(el){return el.fijo});
            console.log('guias:', $scope.guias);
          }, function errorCallback(response) {
            ErrorService.showError(response);
          });
    }

    $scope.changeOrder = function(user, up){
        console.log('changeOrder:');
        var newIndex = up ? user.guardiaorden - 1 : user.guardiaorden + 1;
        for (var i = 0; i < $scope.defectoGuardias.usuarios.length; i++) {
            if($scope.defectoGuardias.usuarios[i].guardiaorden == newIndex){
                $scope.defectoGuardias.usuarios[i].guardiaorden = up ? $scope.defectoGuardias.usuarios[i].guardiaorden + 1 : $scope.defectoGuardias.usuarios[i].guardiaorden - 1;
            }
        }
        user.guardiaorden = newIndex;
    }

    $scope.saveDefectoGuardias = function(showOk){
        $scope.loading = true;
        CompanyService.saveDefectoGuardias($scope.defectoGuardias).then(
            function successCallback(response) {
                $scope.loading = false;
          }, function errorCallback(response) {
                ErrorService.showError(response);
          });
    }

    $scope.addExcepcion = function(){
        console.log($scope.newExc);
        var exc = $scope.newExc;
        if(!exc || !exc.fechaini || !exc.fechafin || !exc.codigousuario){
            var message = '<div class="dialog-contents">' +
                        'Informa todos los datos para dar de alta la excepción de guardia.<br/><br/>' +
                        '<button class="btn btn-primary float-right" ng-click="closeThisDialog()">Ok</button>' +
                        '<br/><br/>' +
                        '</div>';
            ngDialog.openConfirm({ template: message, plain: 'true'});
        }
        else{
            var periodoValido = true;
            var fi1 = null;
            var ff1 = null;
            var fi2 = formatDate(exc.fechaini);
            var ff2 = formatDate(exc.fechafin);
            for (var i = 0; i < $scope.excepcionesGuardias.length; i++) {
                fi1 = formatDate(new Date($scope.excepcionesGuardias[i].fechaini));
                ff1 = formatDate(new Date($scope.excepcionesGuardias[i].fechafin));
                console.log('fi1:',fi1);
                console.log('ff1:',ff1);
                console.log('fi2:',fi2);
                console.log('ff2:',ff2);
                if(!(fi2 <= ff2 && (ff2 < fi1 || fi2 > ff1))){
                    periodoValido = false;
                    break;
                }
            }
            if(!periodoValido){
                var message = '<div class="dialog-contents">' +
                        'El periodo informado se solapa con alguna excepción de guardia ya existente. Por favor, revisa las fechas.<br/><br/>' +
                        '<button class="btn btn-primary float-right" ng-click="closeThisDialog()">Ok</button>' +
                        '<br/><br/>' +
                        '</div>';
            ngDialog.openConfirm({ template: message, plain: 'true'});
            }
            else{
                //insert
                console.log('insert exc:', exc);
                $scope.loading = true;
                CompanyService.saveExcepcionGuardias(exc).then(
                    function successCallback(response) {
                        $scope.loading = false;
                        $scope.newExc = null;
                        $scope.excepcionesGuardias = response.data;
                  }, function errorCallback(response) {
                        ErrorService.showError(response);
                  });
            }
        }
    }

    function formatDate(date) {
        var d = new Date(date),
            month = '' + (d.getMonth() + 1),
            day = '' + d.getDate(),
            year = d.getFullYear();

        if (month.length < 2)
            month = '0' + month;
        if (day.length < 2)
            day = '0' + day;

        return parseFloat([year, month, day].join(''));
    }

    $scope.deleteExcepcion = function(idguardia){
        $scope.loading = true;
        CompanyService.deleteExcepcionGuardias(idguardia).then(
            function successCallback(response) {
                $scope.loading = false;
                $scope.newExc = null;
                $scope.excepcionesGuardias = response.data;
          }, function errorCallback(response) {
                ErrorService.showError(response);
          });
    }

    $scope.goToTop = function(){
        $window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if(AuthService.isAuthenticated()){
        $scope.load(false);
    }
}])

.controller('EstadisticasController', ['$scope', '$rootScope', 'CompanyService', 'ErrorService', 'AuthService', 'PduService', '$window',
    function ($scope, $rootScope, CompanyService, ErrorService, AuthService, PduService, $window) {
    $scope.title = 'ESTADÍSTICAS';
    $rootScope.pageTitle = 'ESTADÍSTICAS';
    $rootScope.active = 'Opciones';
    $scope.loading = true;

    var pdusToRead = ['guia'];
    $scope.guias = null;
    $scope.stats = null;
    $scope.params = {group: 'anio', order: 'anio', anio: 2008, switchguia: false};
    $scope.anios = [];
    //for (var i = 2008; i <= new Date().getFullYear(); i++) {
    for (var i = new Date().getFullYear(); i >= 2008; i--) {
        $scope.anios.push(i);
    }

    $scope.load = function(showOk){
        $scope.loading = true;
        PduService.getPdus(pdusToRead).then(
            function successCallback(response) {
            $scope.guias = response.data.filter(function(el){return el.fijo});
          }, function errorCallback(response) {
            ErrorService.showError(response);
          });
        CompanyService.getEstadisticas($scope.params).then(
            function successCallback(response) {
            $scope.loading = false;
            $scope.stats = response.data;
            updateCanvasData();
            console.log('$scope.stats:', $scope.stats);
          }, function errorCallback(response) {
            ErrorService.showError(response);
          });
    }

    var updateCanvasData = function (){
        $scope.colors = [
            "rgba(27,27,55,1)", "rgba(27,27,55,1)", "rgba(27,27,55,1)", "rgba(27,27,55,1)", "rgba(27,27,55,1)", "rgba(27,27,55,1)", "rgba(27,27,55,1)",
            "rgba(27,27,55,1)", "rgba(27,27,55,1)", "rgba(27,27,55,1)", "rgba(27,27,55,1)", "rgba(27,27,55,1)", "rgba(27,27,55,1)", "rgba(27,27,55,1)"]
        if($scope.params.group == 'anio'){
            $scope.labels = [];
            $scope.data = [];
            $scope.series = ['GRUPOS'];
            var serieAnio = [];
            for (var i = 0; i < $scope.stats.length; i++) {
                $scope.labels.push($scope.stats[i].anio);
                serieAnio.push($scope.stats[i].cont);
            }
            $scope.data.push(serieAnio);
        }
        else{
            $scope.labels = [];
            $scope.data = [];
            $scope.series = [];
            for (var i = 0; i < $scope.stats.length; i++) {
                if(!$scope.labels.includes($scope.stats[i].guialocal)){
                    $scope.labels.push($scope.stats[i].guialocal);    
                }
                if(!$scope.series.includes($scope.stats[i].anio)){
                    $scope.series.push($scope.stats[i].anio);    
                }
            }

            for (var i = 0; i < $scope.series.length; i++) {
                var serie = [];
                for (var j = 0; j < $scope.stats.length; j++) {
                    if($scope.series[i] == $scope.stats[j].anio){
                        serie.push($scope.stats[j].cont);
                    }
                }
                $scope.data.push(serie);
            }
            console.log('$scope.labels:', $scope.labels);
            console.log('$scope.series:', $scope.series);
            console.log('$scope.data  :', $scope.data);
        }
    }

    $scope.switchGuia = function(){
        if($scope.params.switchguia){
            $scope.params.group = 'guia';
        }
        else{
            $scope.params.group = 'anio';
        }
        $scope.load(true);
    }

    $scope.goToTop = function(){
        $window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if(AuthService.isAuthenticated()){
        $scope.load(false);
    }
}])

.controller('ApuntesController', ['$scope', 'CompanyService', 'ErrorService', '$rootScope', 'AuthService', '$window',
    function ($scope, CompanyService, ErrorService, $rootScope, AuthService, $window) {
    $scope.title = 'APUNTES';
    $rootScope.pageTitle = 'APUNTES';
    $rootScope.active = 'Opciones';
    $scope.loading = true;

    $scope.apuntes = [];
    $scope.totalapuntes = 0;
    $scope.apunte = {fecha: new Date(), descripcion: '', importe: 0};

    $scope.load = function(showOk){
        $scope.loading = true;
        CompanyService.getApuntes().then(
            function successCallback(response) {
                $scope.loading = false;
                $scope.apuntes = response.data;
                $scope.totalapuntes = 0;
                for (var i = 0; i < $scope.apuntes.length; i++) {
                    $scope.totalapuntes += parseFloat($scope.apuntes[i].importe);
                }
          }, function errorCallback(response) {
                ErrorService.showError(response);
          });
    }

    $scope.addApunte = function(){
        $scope.loading = true;
        CompanyService.addApunte($scope.apunte).then(
            function successCallback(response) {
                $scope.loading = false;
                $scope.apunte = {fecha: new Date(), descripcion: '', importe: 0};
                $scope.load();
          }, function errorCallback(response) {
                ErrorService.showError(response);
          });
    }

    $scope.goToTop = function(){
        $window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if(AuthService.isAuthenticated()){
        $scope.load(false);
    }
}])

.controller('ForgotPasswordController', ['$scope', 'AuthService', 'ErrorService', '$rootScope', '$location', 'ngDialog',
    function ($scope, AuthService, ErrorService, $rootScope, $location, ngDialog) {
    $scope.title = '¿HAS OLVIDADO TU CONTRASEÑA?';
    $rootScope.pageTitle = '¿HAS OLVIDADO TU CONTRASEÑA?';
    $rootScope.active = 'Opciones';
    $scope.loading = false;

    $scope.forgot = { email: ''};

    $scope.emailNewPassword = function(){
        $scope.loading = true;
        AuthService.forgotPassword($scope.forgot.email).then(
            function successCallback(response) {
                $scope.loading = false;
                var message = '<div class="dialog-contents">' +
                    '<br/><br/>Te hemos enviado un correo con instrucciones para recuperar tu password.<br/><br/>' +
                    '<button class="btn btn-primary float-right" ng-click="confirm()" title="Ok">OK</button>' +
                    '<br/><br/>' +
                    '</div>';
                ngDialog.openConfirm({ template: message, plain: 'true'}).then(
                    function successCallback(response) {
                        $location.path('/');
                    }
                );
          }, function errorCallback(response) {
                ErrorService.showError(response);
          });
    }
}])

.controller('RequestNewPasswordController', ['$scope', 'AuthService', 'ErrorService', '$rootScope', '$location', 'ngDialog', '$stateParams',
    function ($scope, AuthService, ErrorService, $rootScope, $location, ngDialog, $stateParams) {
    $scope.title = 'SOLICITANDO NUEVA CONTRASEÑA';
    $rootScope.pageTitle = 'SOLICITANDO NUEVA CONTRASEÑA';
    $rootScope.active = 'Opciones';
    $scope.loading = true;

    if($stateParams.token){
        AuthService.requestNewPassword($stateParams.token).then(
            function successCallback(response) {
                $scope.loading = false;
                var message = '<div class="dialog-contents">' +
                    '<br/><br/>Te hemos enviado un correo con tu nueva password.<br/><br/>' +
                    '<button class="btn btn-primary float-right" ng-click="confirm()" title="Ok">OK</button>' +
                    '<br/><br/>' +
                    '</div>';
                ngDialog.openConfirm({ template: message, plain: 'true'}).then(
                    function successCallback(response) {
                        $location.path('/');
                    }
                );
          }, function errorCallback(response) {
                $scope.loading = false;
                ErrorService.showError(response);
          });
    }

}])
;