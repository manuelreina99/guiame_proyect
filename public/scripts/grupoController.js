'use strict';

angular.module('guiame')

.controller('GruposController', ['$scope', 'GrupoService', 'FacturaService', '$location', 'ErrorService', '$stateParams', '$state', '$rootScope', 'AuthService', 'PduService', 'ngDialog', 'CompanyService', 'ROL_BOSS', '$window', '$filter', 'PrintService', '$timeout',
    function ($scope, GrupoService, FacturaService, $location, ErrorService, $stateParams, $state, $rootScope, AuthService, PduService, ngDialog, CompanyService, ROL_BOSS, $window, $filter, PrintService, $timeout) {

    $scope.title = 'GRUPOS';
    $rootScope.pageTitle = 'GRUPOS';
    $rootScope.active = 'Grupos';
    $scope.loading = {progress: true, ok: false};

    $scope.resFilter = {grupos: [], contgrupos: 0, contmanana: 0, conttarde: 0, contanulados: 0, horariosmonumentos: [], incidencias: []};
    $scope.filtro = AuthService.getFilters();
    $scope.usuarioDeGuardia = null;
    var pdusToRead = ['agencia','guia', 'formapago', 'tipofactura', 'idioma'];
    $scope.pdus = [];
    $scope.guiasnofijos = null;

    $scope.load = function(showOk){
        $scope.loading.progress = true;
        PduService.getPdus(pdusToRead).then(
            function successCallback(response) {
                //console.log('pdus:', response.data);
                $scope.pdus = response.data;
          }, function errorCallback(response) {
            ErrorService.showError(response);
          });
        GrupoService.getGrupos($scope.filtro).then(
            function successCallback(response) {
                //console.log('resFilter:', response.data);
                showLoadedOk();
                $scope.resFilter = response.data;
                $scope.filtro.numpages = response.data.numpages;
                $scope.filtro.page = Math.max(Math.min($scope.filtro.page, $scope.filtro.numpages),1);
                AuthService.setFilters($scope.filtro);
                if(showOk){
                    ErrorService.showTooltip($scope, $rootScope.notifyOk);
                }
          }, function errorCallback(response) {
                ErrorService.showError(response);
          });
        if($scope.filtro.fechaini){
            CompanyService.getUsuarioDeGuardia($scope.filtro.fechaini).then(
                function successCallback(response) {
                    $scope.usuarioDeGuardia = response.data;
              }, function errorCallback(response) {
                ErrorService.showError(response);
              });
            CompanyService.getReservas($scope.filtro.fechaini).then(
                function successCallback(response) {
                    var cont = 0;
                    var total = 0;
                    $scope.guiasnofijos = [];
                    for (var i = 0; i < response.data.reservas.length; i++) {
                        if(!response.data.reservas[i].fijo){
                            total++;
                        }
                        if(!response.data.reservas[i].fijo && cont < 3){
                            $scope.guiasnofijos.push(response.data.reservas[i]);
                            cont++;
                        }
                    }
                    if(total > 3){
                        $scope.guiasnofijos[2] = {nombre: 'y ' + (total - 2) + ' más', jornada: null};
                    }
              }, function errorCallback(response) {
                    ErrorService.showError(response);
              });
        }
        else{
            $scope.usuarioDeGuardia = null;
            $scope.guiasnofijos = null;
        }
    }

    $scope.goToGrupo = function(idgrupo, fecha){
        $state.go('app.grupo', {id: idgrupo, fecha: fecha} );
    }

    $scope.addDayToFiltroFecha = function(fecha, days){
        if(fecha == 'fechaini' && $scope.filtro.fechaini){
            $scope.filtro.fechaini.setDate($scope.filtro.fechaini.getDate() + days);
            $scope.filtro.fechaini = new Date($scope.filtro.fechaini);
        }
        if(fecha == 'fechafin' && $scope.filtro.fechafin){
            $scope.filtro.fechafin.setDate($scope.filtro.fechafin.getDate() + days);
            $scope.filtro.fechafin = new Date($scope.filtro.fechafin);
        }
        if(fecha == 'fechas'){
            if($scope.filtro.fechaini){
                $scope.filtro.fechaini.setDate($scope.filtro.fechaini.getDate() + days);
                $scope.filtro.fechaini = new Date($scope.filtro.fechaini);
                $scope.filtro.fechafin = $scope.filtro.fechaini;
            }
            else{
                $scope.filtro.fechaini = null;
                $scope.filtro.fechafin = null;
            }
        }
        if(fecha == 'hoy'){
            $scope.filtro.fechaini = new Date();
            $scope.filtro.fechafin = new Date();
        }
        if(isValid($scope.filtro.fechaini) && isValid($scope.filtro.fechafin)){
            $scope.load(true);
            AuthService.setFilters($scope.filtro);
        }
    }

    function isValid(fecha) {
        let result = false;
        console.log('isValid:', fecha);
        if( (fecha == null) || (fecha &&
            fecha.getFullYear() >= 2000 &&
            fecha.getMonth()    >= 0    && fecha.getMonth() <= 11 &&
            fecha.getDate()     >= 1    && fecha.getDate()  <= 31)){
            result = true;
        }
        return result;
    }

    $scope.switchFiltro = function(){
        $scope.filtro.basico = !$scope.filtro.basico;
        if($scope.filtro.basico){
            $scope.filtro.fechafin = $scope.filtro.fechaini;
            $scope.filtro.ref = null;
            $scope.filtro.facturado = 'todos';
            $scope.filtro.formapago = 'todos';
            $scope.filtro.tipofactura = 'todos';
            $scope.filtro.confirmado = 'todos';
            $scope.filtro.anulado = 'todos';
            $scope.filtro.idioma = null;
        }
        $scope.load();
    }

    $scope.goToTop = function(){
        $window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    $scope.printHorariosMonumentos = function(index){
        var result = '';
        var h = null;
        if($scope.resFilter.horariosmonumentos && index <= $scope.resFilter.horariosmonumentos.length){
            h = $scope.resFilter.horariosmonumentos[index-1];
            result = h.codigo + ' ' +
                     (h.abierto ? '' : 'CERRADO') +
                     (h.h1 ? $filter('date')(h.h1,'HH:mm') + ' ' : '') +
                     (h.h2 ? $filter('date')(h.h2,'HH:mm') + ' ' : '') +
                     (h.h3 ? $filter('date')(h.h3,'HH:mm') + ' ' : '') +
                     (h.h4 ? $filter('date')(h.h4,'HH:mm') + ' ' : '')
        }
        return result;
    }

    $scope.print = function(){
        console.log('print:', $scope.filtro);
        PrintService.grupos($scope.filtro);
    }

    $scope.loadNewPage = function(inc){
        var newPage = $scope.filtro.page + inc;
        if(newPage > 0 && newPage <= $scope.filtro.numpages){
            $scope.filtro.page = newPage;
            $scope.load(true);
            AuthService.setFilters($scope.filtro);
        }
    }

    function showLoadedOk() {
        $scope.loading.progress = false;
        $scope.loading.ok = true;
        $timeout(function(){
            $scope.loading.ok = false;
        }, 3000);
    }

    $scope.getWeekdayName = function(fecha){
        return PduService.getWeekdayName(fecha);
    }

    if(AuthService.isAuthenticated()){
        $scope.load(false);
        $scope.filtro.show = ($window.innerWidth >= 576);
        if(!$scope.filtro.show){
            $scope.filtro.basico = false;
            $scope.switchFiltro();
        }
    }
}])

.controller('GrupoController', ['$scope', 'GrupoService', 'PduService', '$location', 'ErrorService', '$stateParams', '$state', '$rootScope', 'AuthService', '$transitions', 'CompanyService', 'ngDialog', '$filter', '$window', 'PrintService', 'ROL_BOSS', 'FacturaService', '$timeout', '$anchorScroll',
    function ($scope, GrupoService, PduService, $location, ErrorService, $stateParams, $state, $rootScope, AuthService, $transitions, CompanyService, ngDialog, $filter, $window, PrintService, ROL_BOSS, FacturaService, $timeout, $anchorScroll) {

    $scope.title = 'GRUPO';
    $rootScope.pageTitle = 'GRUPO';
    $rootScope.active = 'Grupos';
    $scope.loading = {progress: true, ok: false};
    console.log('$stateParams:', $stateParams);

    $scope.grupo = newGrupo();
    
    var pdusToRead = ['agencia', 'puntoencuentro', 'monumento', 'idioma', 'tipovisita', 'facilitagrupo', 'busempresa', 'guiacorreo', 'formapago', 'tipofactura'];
    $scope.pdus = [];
    $scope.info = {textMonumento : '', textGuia : ''};
    $scope.infoRepiteOriginal = {repite: false, repitefecha: null, repitecompleto: false, fechahora: null};

    $scope.load = function(){
        $scope.loading.progress = true;
        $scope.goToTop();
        PduService.getPdus(pdusToRead).then(
            function successCallback(response) {
                $scope.pdus = response.data;
                $scope.getGuiasAsignables();
          }, function errorCallback(response) {
            ErrorService.showError(response);
          });

        if($stateParams.id && $stateParams.id > 0){
            GrupoService.getGrupo($stateParams.id).then(
                function successCallback(response) {
                    showLoadedOk();
                    $scope.grupo = updateGrupoDatetimes(response.data);
                    console.log('$scope.load.$scope.grupo:', $scope.grupo);
                    infoGrupo();
              }, function errorCallback(response) {
                ErrorService.showError(response);
              });
        }
        else{
            $scope.loading.progress = false;
        }
    }

    //Browser refresh
    window.onbeforeunload = function (event) {
        console.log('window.beforeunload');
        if($scope.formGrupo && !$scope.formGrupo.$dirty){ return; }
        if (typeof event == 'undefined') { event = window.event; }
        if (event) { event.returnValue = ''; }
        //return '';
    }

    $scope.saveGrupo = function(){
        $scope.formGrupo.pax.$setDirty();
        $scope.formGrupo.repitefecha.$setDirty();
        checkGrupo();

        if($scope.formGrupo.$valid){
            console.log('save:', $scope.grupo);
            var nuevo = ($scope.grupo.idgrupo == 0);
            $scope.loading.progress = true;
            if($scope.info.textMonumento || $scope.info.textGuia){
                var message = '<div class="dialog-contents">' +
                    'Atención<br/><br/>';
                if($scope.info.textMonumento){
                    message = message + $scope.info.textMonumento + '<br/><br/>';
                }
                if($scope.info.textGuia){
                    message = message + $scope.info.textGuia + '<br/><br/>';
                }
                message = message +
                    '¿Quieres guardar el grupo de todas formas?<br/><br/>' +
                    '<button class="btn" ng-click="closeThisDialog()">No</button>' +
                    '<span class="float-right">&nbsp;&nbsp;</span>' +
                    '<button class="btn btn-primary float-right" ng-click="confirm()">Sí</button>' +
                    '<br/><br/>' +
                    '</div>';
                ngDialog.openConfirm({ template: message, plain: 'true'}).then(
                    function successCallback(response) {
                        GrupoService.saveGrupo($scope.grupo).then(
                            function successCallback(response) {
                                showLoadedOk();
                                $scope.grupo = response.data;
                                $scope.grupo = updateGrupoDatetimes(response.data);
                                showRepiteDialog(nuevo);
                          }, function errorCallback(response) {
                            ErrorService.showError(response);
                          });
                    },
                    function errorCallback(response) {
                        $scope.loading.progress = false;
                    }
                );
            }
            else{
                GrupoService.saveGrupo($scope.grupo).then(
                    function successCallback(response) {
                        showLoadedOk();
                        $scope.grupo = response.data;
                        $scope.grupo = updateGrupoDatetimes(response.data);
                        showRepiteDialog(nuevo);
                  }, function errorCallback(response) {
                    ErrorService.showError(response);
                  });
            }
        }
    }

    function showRepiteDialog(nuevo){
        $scope.grupo.repiteMessage = '';
        var showGoRepite = false;
        var g0 = {repite: $scope.infoRepiteOriginal.repite, repitecompleto: $scope.infoRepiteOriginal.repitecompleto};
        var g1 = {repite: $scope.grupo.repite, repitecompleto: $scope.grupo.repitecompleto};

        if(!g0.repite && !g0.repitecompleto &&  g1.repite && !g1.repitecompleto){
            $scope.grupo.repiteMessage = 'El grupo es Repite, se ha creado otro grupo con fecha ' + $filter('date')($scope.grupo.repitefecha, "dd/MM/yyyy");
            showGoRepite = true;
        }
        if(!g0.repite && !g0.repitecompleto && !g1.repite &&  g1.repitecompleto){
            $scope.grupo.repiteMessage = 'El grupo es Día Completo, se ha creado otro grupo con fecha ' + $filter('date')($scope.grupo.fechahora, "dd/MM/yyyy");
            showGoRepite = true;
        }
        if(!g0.repite && !g0.repitecompleto && g1.repite && g1.repitecompleto){
            $scope.grupo.repiteMessage = 'El grupo es Repite y Día Completo, se han creado dos grupos vinculados';
            showGoRepite = true;
        }
        if( (g0.repite || g0.repitecompleto) && (g0.repite != g1.repite || g0.repitecompleto != g1.repitecompleto) ){
            $scope.grupo.repiteMessage = 'Has modificado datos y el grupo repite. No olvides revisar los grupos que repiten.';
        }

        if( g0.repite && !g0.repitecompleto && !g1.repite && !g1.repitecompleto){
            $scope.grupo.repiteMessage = 'Has modificado datos y el grupo repite. No olvides revisar los grupos que repiten.';
        }
        if( g0.repite && !g0.repitecompleto &&  g1.repite && !g1.repitecompleto &&
            ($scope.infoRepiteOriginal.repitefecha.getFullYear() != $scope.grupo.repitefecha.getFullYear() || $scope.infoRepiteOriginal.repitefecha.getMonth() != $scope.grupo.repitefecha.getMonth() || $scope.infoRepiteOriginal.repitefecha.getDate() != $scope.grupo.repitefecha.getDate())){
            $scope.grupo.repiteMessage = 'Has modificado datos y el grupo repite. No olvides revisar los grupos que repiten.';
            }
        if( g0.repite && !g0.repitecompleto && !g1.repite &&  g1.repitecompleto){
            $scope.grupo.repiteMessage = 'Has modificado datos y el grupo repite. No olvides revisar los grupos que repiten.';
        }
        if(!g0.repite &&  g0.repitecompleto && !g1.repite && !g1.repitecompleto){
            $scope.grupo.repiteMessage = 'Has modificado datos y el grupo repite. No olvides revisar los grupos que repiten.';
        }
        if(!g0.repite &&  g0.repitecompleto &&  g1.repite && !g1.repitecompleto){
            $scope.grupo.repiteMessage = 'Has modificado datos y el grupo repite. No olvides revisar los grupos que repiten.';
        }
        if(!g0.repite &&  g0.repitecompleto && !g1.repite &&  g1.repitecompleto &&
            (($scope.infoRepiteOriginal.fechahora.getFullYear() != $scope.grupo.fechahora.getFullYear()) || ($scope.infoRepiteOriginal.fechahora.getMonth() != $scope.grupo.fechahora.getMonth()) || ($scope.infoRepiteOriginal.fechahora.getDate() != $scope.grupo.fechahora.getDate()))
            ){
            $scope.grupo.repiteMessage = 'Has modificado datos y el grupo repite. No olvides revisar los grupos que repiten.';
        }

        if(showGoRepite){
            //Show Dialog Repite
            var message = '<div class="dialog-contents">' +
                $scope.grupo.repiteMessage + '<br/><br/>' +
                '¿Quieres editar el grupo que repite?<br/><br/>' +
                '<button class="btn" ng-click="closeThisDialog()">No</button>' +
                '<span class="float-right">&nbsp;&nbsp;</span>' +
                '<button class="btn btn-primary float-right" ng-click="confirm()">Sí</button>' +
                '<br/><br/>' +
                '</div>';
            ngDialog.openConfirm({ template: message, plain: 'true'}).then(
                function successCallback(response) {
                    console.log('go to grupo vinculado:', $scope.grupo.idgrupodestino);
                    $state.go('app.grupo', {id: $scope.grupo.idgrupodestino} );
                },
                function errorCallback(response) {
                    console.log('quedarse en este grupo');
                    $scope.grupo.repiteMessage = '';
                    showGrupo(nuevo);
                }
            );
        }
        else{
            showGrupo(nuevo)
        }
    }

    //TO-DO: borrar cuando se estabilice el tratamiento de los repite
    function showRepiteDialogBorrar(nuevo){
        var showRepiteDialog = false
        $scope.grupo.repiteMessage = '';
        var g0 = {repite: $scope.infoRepiteOriginal.repite, repitecompleto: $scope.infoRepiteOriginal.repitecompleto};
        var g1 = {repite: $scope.grupo.repite, repitecompleto: $scope.grupo.repitecompleto};

        if(!g0.repite && !g0.repitecompleto && !g1.repite && !g1.repitecompleto){}
        if(!g0.repite && !g0.repitecompleto &&  g1.repite && !g1.repitecompleto){$scope.grupo.repiteMessage = 'El grupo es Repite, se ha creado un grupo vinculado con fecha ' + $filter('date')($scope.grupo.repitefecha, "dd/MM/yyyy"); showRepiteDialog = true;}
        if(!g0.repite && !g0.repitecompleto && !g1.repite &&  g1.repitecompleto){$scope.grupo.repiteMessage = 'El grupo es Día Completo, se ha creado un grupo vinculado con fecha ' + $filter('date')($scope.grupo.fechahora, "dd/MM/yyyy"); showRepiteDialog = true;}
        if( g0.repite && !g0.repitecompleto && !g1.repite && !g1.repitecompleto){$scope.grupo.repiteMessage = 'El grupo ya no Repite, el grupo vinculado se ha borrado';}
        if( g0.repite && !g0.repitecompleto &&  g1.repite && !g1.repitecompleto &&
            ($scope.infoRepiteOriginal.repitefecha.getFullYear() != $scope.grupo.repitefecha.getFullYear() || $scope.infoRepiteOriginal.repitefecha.getMonth() != $scope.grupo.repitefecha.getMonth() || $scope.infoRepiteOriginal.repitefecha.getDate() != $scope.grupo.repitefecha.getDate())){
            $scope.grupo.repiteMessage = 'La Fecha Repite ha cambiado. La fecha del grupo vinculado se ha actualizado a ' + $filter('date')($scope.grupo.repitefecha, "dd/MM/yyyy");
            showRepiteDialog = true;}
        if( g0.repite && !g0.repitecompleto && !g1.repite &&  g1.repitecompleto){$scope.grupo.repiteMessage = 'El grupo ha pasado de Repite a Día Completo. La fecha del grupo vinculado se ha actualizado a ' + $filter('date')($scope.grupo.fechahora, "dd/MM/yyyy"); showRepiteDialog = true;}
        if(!g0.repite &&  g0.repitecompleto && !g1.repite && !g1.repitecompleto){$scope.grupo.repiteMessage = 'El grupo ya no es Día Completo, el grupo vinculado se ha borrado';}
        if(!g0.repite &&  g0.repitecompleto &&  g1.repite && !g1.repitecompleto){$scope.grupo.repiteMessage = 'El grupo ha pasado de Día Completo a Repite. La fecha del grupo vinculado se ha actualizado a ' + $filter('date')($scope.grupo.repitefecha, "dd/MM/yyyy"); showRepiteDialog = true;}
        if(!g0.repite &&  g0.repitecompleto && !g1.repite &&  g1.repitecompleto &&
            (($scope.infoRepiteOriginal.fechahora.getFullYear() != $scope.grupo.fechahora.getFullYear()) || ($scope.infoRepiteOriginal.fechahora.getMonth() != $scope.grupo.fechahora.getMonth()) || ($scope.infoRepiteOriginal.fechahora.getDate() != $scope.grupo.fechahora.getDate()))
            ){
            console.log('$scope.infoRepiteOriginal.fechahora:', $scope.infoRepiteOriginal.fechahora);
            console.log('$scope.grupo.fechahora             :', $scope.grupo.fechahora);
            $scope.grupo.repiteMessage = 'La Fecha/Hora del grupo ha cambiado. La fecha/Hora del grupo vinculado se ha actualizado';
            showRepiteDialog = true;
        }

        if(showRepiteDialog){
            //Show Dialog Repite
            var message = '<div class="dialog-contents">' +
                $scope.grupo.repiteMessage + '<br/><br/>' +
                '¿Quieres editar el grupo vinculado?<br/><br/>' +
                '<button class="btn" ng-click="closeThisDialog()">No</button>' +
                '<span class="float-right">&nbsp;&nbsp;</span>' +
                '<button class="btn btn-primary float-right" ng-click="confirm()">Sí</button>' +
                '<br/><br/>' +
                '</div>';
            ngDialog.openConfirm({ template: message, plain: 'true'}).then(
                function successCallback(response) {
                    console.log('go to grupo vinculado');
                    $state.go('app.grupo', {id: $scope.grupo.idgrupodestino} );
                },
                function errorCallback(response) {
                    console.log('quedarse en este grupo');
                    $scope.grupo.repiteMessage = '';
                    showGrupo(nuevo);
                }
            );
        }
        else{
            showGrupo(nuevo)
        }
    }


    function showGrupo(nuevo){
        if(nuevo){
            $state.go('app.grupo', {id: $scope.grupo.idgrupo} );
        }
        else{
            //updateGrupoDatetimes();
            infoGrupo();
            $scope.formGrupo.$setPristine();
            showLoadedOk();
        }
    }

    function checkGrupo(){
        //console.log($scope.formGrupo);
        if(!$scope.grupo.pax || $scope.grupo.pax == 0){
            $scope.formGrupo.pax.$setValidity("required", false);
        }
        else{
            $scope.formGrupo.pax.$setValidity("required", true);
        }
        if($scope.grupo.repite &&
          (!$scope.grupo.repitefecha || $scope.grupo.repitefecha == null || $scope.grupo.repitefecha == undefined || $scope.grupo.repitefecha.getTime() <= $scope.grupo.fechahora.getTime())
        ){
            $scope.formGrupo.repitefecha.$setValidity("required", false);
        }
        else{
            $scope.formGrupo.repitefecha.$setValidity("required", true);
        }
    }

    function newGrupo(){
        var grupo = {idgrupo : 0,
                    fechahora : ($stateParams.fecha ? new Date($stateParams.fecha) : new Date()),
                    agencia : '',
                    ref : '',
                    guialocal : '',
                    puntoencuentro : '',
                    idiomas : [],
                    monumentos : [],
                    pax : 0,
                    tipovisita : [],
                    importe : 0,
                    horafinal : null }
        var year = grupo.fechahora.getFullYear();
        var month = grupo.fechahora.getMonth();
        var day = grupo.fechahora.getDate();
        grupo.fechahora = new Date(year, month, day, 0, 0, 0);
        return grupo;
    }

    function updateGrupoDatetimes(data){
        data.fechahora = new Date(data.fechahora);
        data.repitefecha = (data.repitefecha ? new Date(data.repitefecha) : null);
        data.horafinal = (data.horafinal ? new Date(data.horafinal) : null);
        return data;
    }

    $scope.loadDatosAgencia = function(codigoAgencia){
        //console.log('loadDatosAgencia:', $scope.grupo.agencia);
        PduService.getAgencia($scope.grupo.agencia).then(
            function successCallback(response) {
                console.log('loadDatosAgencia:', response.data);
                if(response.data.length > 0){
                    $scope.grupo.formapago = response.data[0].formapago;
                    $scope.grupo.tipofactura = response.data[0].tipofactura;
                }
          }, function errorCallback(response) {
            ErrorService.showError(response);
          });
    }

    function infoGrupo(){
        $scope.checkMonumentos();
        $scope.checkGuia();
        $scope.infoRepiteOriginal = {repite: $scope.grupo.repite, repitefecha: $scope.grupo.repitefecha, repitecompleto: $scope.grupo.repitecompleto, fechahora: $scope.grupo.fechahora};
    }

    $scope.checkMonumentos = function(){
        // comprueba si los monumentos seleccionados están abiertos en la fecha del grupo
        if($scope.grupo.fechahora && $scope.grupo.monumentos && $scope.grupo.monumentos.length > 0){
            PduService.checkMonumentos($scope.grupo.monumentos, $scope.grupo.fechahora, $scope.grupo.horafinal).then(
                function successCallback(response) {
                    for (var i = 0; i < response.data.length; i++) {
                        response.data[i].h1 = (response.data[i].h1 ? new Date(response.data[i].h1) : null);
                        response.data[i].h2 = (response.data[i].h2 ? new Date(response.data[i].h2) : null);
                        response.data[i].h3 = (response.data[i].h3 ? new Date(response.data[i].h3) : null);
                        response.data[i].h4 = (response.data[i].h4 ? new Date(response.data[i].h4) : null);
                    }
                    $scope.info.textMonumento = verSiAbierto(response.data);
              }, function errorCallback(response) {
                ErrorService.showError(response);
              });
        }
        else{
            $scope.info.textMonumento = null;
        }
    }

    function verSiAbierto(horarios){
        var text = '';
        console.log('checkMonumentos:', horarios);
        let ini = ($scope.grupo.fechahora ? $scope.grupo.fechahora.toLocaleString('es-ES', { hour:'2-digit', minute:'2-digit', hour12: false }) : null );
        let fin = ($scope.grupo.horafinal ? $scope.grupo.horafinal.toLocaleString('es-ES', { hour:'2-digit', minute:'2-digit', hour12: false }) : null );
        console.log('ini:', ini);
        console.log('fin:', fin);
        for (var i = 0; i < horarios.length; i++) {
            // Validación de horarios:
            //     mostrar aviso si grupo monumento cerrado
            //     mostrar aviso si grupo empieza dos horas antes de apertura del monumento, o mas
            //     mostrar aviso si monumento cierra antes de 30 minutos de que empiece el grupo
            let h1 = null;
            let h2 = null;
            let h3 = null;
            let h4 = null;
            if(horarios[i].h1){h1 = new Date(); h1 = h1.setTime(horarios[i].h1.getTime() - (  2*60*60*1000)); h1 = new Date(h1)};
            if(horarios[i].h2){h2 = new Date(); h2 = h2.setTime(horarios[i].h2.getTime() - (0.5*60*60*1000)); h2 = new Date(h2)};
            if(horarios[i].h3){h3 = new Date(); h3 = h3.setTime(horarios[i].h3.getTime() - (  2*60*60*1000)); h3 = new Date(h3)};
            if(horarios[i].h4){h4 = new Date(); h4 = h4.setTime(horarios[i].h4.getTime() - (0.5*60*60*1000)); h4 = new Date(h4)};
            if(h1){ h1 = h1.toLocaleString('es-ES', { hour:'2-digit', minute:'2-digit', hour12: false })}
            if(h2){ h2 = h2.toLocaleString('es-ES', { hour:'2-digit', minute:'2-digit', hour12: false })}
            if(h3){ h3 = h3.toLocaleString('es-ES', { hour:'2-digit', minute:'2-digit', hour12: false })}
            if(h4){ h4 = h4.toLocaleString('es-ES', { hour:'2-digit', minute:'2-digit', hour12: false })}
            console.log(horarios[i].codigo + '.h1:', h1);
            console.log(horarios[i].codigo + '.h2:', h2);
            console.log(horarios[i].codigo + '.h3:', h3);
            console.log(horarios[i].codigo + '.h4:', h4);
            if(!horarios[i].abierto || (!h1 && !h2 && !h3 && !h4)){
                text = text + ' ' + horarios[i].codigo + ' CERRADO';
            }
            else{
                let cerrado = false;
                if(ini && h1 && ini <= h1){ cerrado = true; }
                if(ini && h4 && ini >= h4){ cerrado = true; }
                //if(fin && h1 && fin < h1){ cerrado = true; }
                //if(fin && h4 && fin > h4){ cerrado = true; }
                if(ini && h2 && h3 && ini >= h2 && ini <= h3){ cerrado = true; }
                //if(fin && h2 && h3 && fin > h2 && fin < h3){ cerrado = true; }
                if(cerrado){
                    text = text + ' ' + horarios[i].codigo + pH(horarios[i].h1) + pH(horarios[i].h2) + pH(horarios[i].h3) + pH(horarios[i].h4);
                }
            }
        }
        return text;
    }

    function pH(h){
        if(h){
            h = h.toLocaleString('es-ES', { hour:'2-digit', minute:'2-digit', hour12: false });
        }
        return (h ? (' ' + h) : '');
    }

    $scope.checkGuia = function(){
        // comprueba si el guía seleccionado está libre esa fecha y si habla los idiomas seleccionados
        if($scope.grupo.guialocal){
            GrupoService.checkGuia($scope.grupo.guialocal, $scope.grupo.fechahora, $scope.grupo.idiomas, $scope.grupo.idgrupo).then(
                function successCallback(response) {
                    //console.log('checkGuia:', response.data);
                    $scope.info.textGuia = response.data;
              }, function errorCallback(response) {
                ErrorService.showError(response);
              });
        }
    }

    $scope.getGuiasAsignables = function(){
        CompanyService.getGuiasAsignables($scope.grupo.fechahora).then(
            function successCallback(response) {
                $scope.pdus = $scope.pdus.filter(obj => { return obj.tabla != 'guia' });
                for (var i = 0; i < response.data.length; i++) {
                    $scope.pdus.push(
                        {tabla : 'guia', codigo: response.data[i].codigo, jornada: response.data[i].jornada
                        ,nombre: response.data[i].guianombre, reservado: response.data[i].jornada != '#' && response.data[i].jornada != 'N'}
                    )
                }
          }, function errorCallback(response) {
            ErrorService.showError(response);
          });
    }

    $scope.repiteCompletoChange = function(){
        if($scope.grupo.repitecompleto){
            //$scope.grupo.repite = false;
            //$scope.grupo.repitefecha = null;
        }
    }

    $scope.repiteChange = function(){
        if($scope.grupo.repite){
            //$scope.grupo.repitecompleto = false;
            $scope.grupo.repitefecha = new Date($scope.grupo.fechahora);
            $scope.grupo.repitefecha.setDate($scope.grupo.repitefecha.getDate() + 1);
        }
        else{
            $scope.grupo.repitefecha = null;
        }
    }

    $scope.showNewCodigoDialog = function(tabla){
        $scope.newCodigo = {tabla: tabla, idpdu: 0, orden: 0};
        $scope.ncDialog = ngDialog.open({
            template: 'views/newCodigo.html',
            scope: $scope
        });
    }

    $scope.checkCodigo = function(){
        $scope.newCodigo.isError = false;
        for (var i = 0; i < $scope.pdus.length; i++) {
            if($scope.pdus[i].tabla == $scope.newCodigo.tabla && $scope.newCodigo.codigo && $scope.pdus[i].codigo.toUpperCase() == $scope.newCodigo.codigo.toUpperCase()){
                $scope.newCodigo.isError = true;
                break;
            }
        }
    }

    $scope.addCodigo = function(){
        console.log('add codigo:', $scope.newCodigo);
        //Validar que no exista
        $scope.checkCodigo();
        //LLamar REST API de inserción
        if(!$scope.newCodigo.isError){
            $scope.newCodigo.codigo = $scope.newCodigo.codigo.toUpperCase();
            $scope.newCodigo.nombre = $scope.newCodigo.nombre.toUpperCase();

            $scope.loading.progress = true;
            PduService.upsertPdu($scope.newCodigo).then(
                function successCallback(response) {
                    showLoadedOk();
                    $scope.ncDialog.close();
                    if($scope.newCodigo.tabla == 'guia'){
                        $scope.grupo.guialocal = $scope.newCodigo.codigo;
                    }
                    else{
                        $scope.newCodigo.nombre = $scope.newCodigo.codigo + '-' + $scope.newCodigo.nombre;
                        $scope.grupo[$scope.newCodigo.tabla] = $scope.newCodigo.codigo;
                    }
                    $scope.formGrupo[$scope.newCodigo.tabla].$setDirty();
                    console.log('adding to pdu:', $scope.newCodigo);
                    $scope.pdus.push($scope.newCodigo);
              }, function errorCallback(response) {
                    ErrorService.showError(response);
              });
        }
    }

    $scope.cancelCodigo = function(){
        $scope.ncDialog.close();
    }

    $scope.showSelectCodigoDialog = function(tabla){
        $scope.selectCodigo = {tabla : tabla};
        $scope.scDialog = ngDialog.open({
            template: 'views/selectCodigo.html',
            scope: $scope
        });
    }

    $scope.setSelectedCodigoDialog = function(codigo, tabla){
        console.log('setSelectedCodigoDialog:', codigo);
        $scope.grupo[$scope.selectCodigo.tabla] = codigo;
        $scope.scDialog.close();
        $scope.formGrupo.$setDirty();
        if(tabla == 'agencia'){
            $scope.loadDatosAgencia();    
        }
    }

    $scope.criteriaMatch = function(criteria) {
        return function( item ) {
            return (item.tabla === criteria.tabla &&
                    (
                     criteria.hasOwnProperty('texto') === false ||
                     criteria.texto.length < 1 ||
                     item.codigo.includes(criteria.texto.toUpperCase()) ||
                     item.nombre.includes(criteria.texto.toUpperCase())
                    )
                   );
        }
    }

    $scope.cancelSelectCodigo = function(){
        $scope.scDialog.close();
    }

    $scope.deleteGrupo = function(){
        console.log('deleteGrupo.id:', $scope.grupo.idgrupo);
        if($scope.grupo.idgrupo > 0 && $scope.grupo.facturado){
            var message = '<div class="dialog-contents">' +
                        'Este grupo no se puede borrar porque está ya facturado.<br/><br/>' +
                        'Borra primero su(s) factura(s).<br/><br/>' +
                        '<button class="btn btn-primary float-right" ng-click="closeThisDialog()">Ok</button>' +
                        '<br/><br/>' +
                        '</div>';
            ngDialog.openConfirm({ template: message, plain: 'true'});
        }
        else{
            var message = '<div class="dialog-contents">' +
                        'Vas a borrar este grupo ¿Estás seguro?<br/><br/>' +
                        '<button class="btn" ng-click="closeThisDialog()">No</button>' +
                        '<span class="float-right">&nbsp;&nbsp;</span>' +
                        '<button class="btn btn-danger float-right" ng-click="confirm()">Sí</button>' +
                        '<br/><br/>' +
                        '</div>';
            ngDialog.openConfirm({ template: message, plain: 'true'}).then(
                function successCallback(response) {
                    if($scope.grupo.idgrupo > 0){
                        $scope.loading.progress = true;
                        GrupoService.deleteGrupo($scope.grupo.idgrupo).then(
                            function successCallback(response) {
                                showLoadedOk();
                                // redireccionar a facturas:
                                $state.go('app.grupos', {} );
                          }, function errorCallback(response) {
                                ErrorService.showError(response);
                          });
                    }
                    else{
                        $state.go('app.grupos', {} );
                    }
                }
            );
        }
    }

    $scope.descartarCambios = function(){
        var message = '<div class="dialog-contents">' +
            'Vas a descartar todos los cambios realizados al grupo.<br/><br/>' +
            '¿Estás seguro?<br/><br/>' +
            '<button class="btn" ng-click="closeThisDialog()">No</button>' +
            '<span class="float-right">&nbsp;&nbsp;</span>' +
            '<button class="btn btn-danger float-right" ng-click="confirm()">Sí</button>' +
            '<br/><br/>' +
            '</div>';
        ngDialog.openConfirm({ template: message, plain: 'true'}).then(
            function successCallback(response) {
                if($stateParams.id && $stateParams.id > 0){
                    $state.reload();
                }
                else{
                    $state.go('app.grupos', {} );
                }
            }
        );
    }

    $scope.goToTop = function(){
        $window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    $scope.print = function(){
        console.log('print:', $scope.grupo.idgrupo);
        PrintService.grupo($scope.grupo.idgrupo);
    }

    $scope.facturarGrupo = function(){
        var esMio = $scope.grupo.idusuarioguia && $scope.grupo.idusuarioguia == $rootScope.currentUser.id.toString();
        if(!esMio && $rootScope.currentUser.rol < ROL_BOSS){
            var message = '<div class="dialog-contents">' +
                        'No puedes facturar un grupo grupo que no tienes asignado.<br/><br/>' +
                        '<button class="btn btn-primary float-right" ng-click="closeThisDialog()">Ok</button>' +
                        '<br/><br/>' +
                        '</div>';
            ngDialog.openConfirm({ template: message, plain: 'true'});
        }
        else{
            if($scope.grupo.facturado){
                var message = '<div class="dialog-contents">' +
                    'Este grupo ya está facturado. Vas a generar una nueva factura ¿Estás seguro?<br/><br/>' +
                    '<button class="btn" ng-click="closeThisDialog()">No</button>' +
                    '<span class="float-right">&nbsp;&nbsp;</span>' +
                    '<button class="btn btn-primary float-right" ng-click="confirm()">Sí</button>' +
                    '<br/><br/>' +
                    '</div>';
                ngDialog.openConfirm({ template: message, plain: 'true'}).then(
                    function successCallback(response) {
                        $scope.loading.progress = true;
                        FacturaService.generateFactura([$scope.grupo.idgrupo]).then(
                            function successCallback(response) {
                                showLoadedOk();
                                // redireccionar a la factura:
                                $state.go('app.factura', {id: response.data, auto: true} );
                          }, function errorCallback(response) {
                                $scope.loading.progress = false;
                                ErrorService.showError(response);
                          });
                    }
                );
            }
            else{
                $scope.loading.progress = true;
                FacturaService.generateFactura([$scope.grupo.idgrupo]).then(
                    function successCallback(response) {
                        showLoadedOk();
                        // redireccionar a la factura:
                        $state.go('app.factura', {id: response.data, auto: true} );
                  }, function errorCallback(response) {
                        $scope.loading.progress = false;
                        ErrorService.showError(response);
                  });
            }

        }
    }

    function showLoadedOk() {
        $scope.loading.progress = false;
        $scope.loading.ok = true;
        $timeout(function(){
            $scope.loading.ok = false;
        }, 3000);
    }

    $scope.clonarGrupo = function(){
        $scope.newClone = {num : 1};
        $scope.cloneDialog = ngDialog.open({
            template: 'views/cloneDialog.html',
            scope: $scope
        });
    }

    $scope.okCloneDialog = function(){
        console.log('clonarGrupo id:' + $scope.grupo.idgrupo + ' ' + $scope.newClone.num + ' veces.');
        $scope.loading.progress = true;
        GrupoService.clonarGrupo($scope.grupo.idgrupo, $scope.newClone.num).then(
            function successCallback(response) {
                $scope.cloneDialog.close();
                showLoadedOk();
                var message = '<div class="dialog-contents">' +
                            '¡Hecho! Grupo clonado ' + $scope.newClone.num + ' veces.<br/><br/>' +
                            '<button class="btn btn-primary float-right" ng-click="closeThisDialog()">Ok</button>' +
                            '<br/><br/>' +
                            '</div>';
                ngDialog.openConfirm({ template: message, plain: 'true'});
          }, function errorCallback(response) {
            $scope.loading.progress = false;
            ErrorService.showError(response);
          });
    }

    $scope.cancelCloneDialog = function(){
        $scope.cloneDialog.close();
    }

    $scope.notificarGuia = function(){
        console.log('notificarGuia:', $scope.grupo.idgrupo);
        var message = '';
        $scope.loading.progress = true;
        GrupoService.notificarGuia($scope.grupo.idgrupo).then(
            function successCallback(response) {
                showLoadedOk();
                if(response.data){
                    message = '<div class="dialog-contents">' +
                            '¡Notificación enviada a ' + $scope.grupo.guialocal + '!<br/><br/>' +
                            '<button class="btn btn-primary float-right" ng-click="closeThisDialog()">Ok</button>' +
                            '<br/><br/>' +
                            '</div>';
                }
                else{
                    message = '<div class="dialog-contents">' +
                            'No se ha enviado notificación porque ' + $scope.grupo.guialocal + ' no tiene las notificaciones activadas.<br/><br/>' +
                            '<button class="btn btn-primary float-right" ng-click="closeThisDialog()">Ok</button>' +
                            '<br/><br/>' +
                            '</div>';
                }
                ngDialog.openConfirm({ template: message, plain: 'true'});
          }, function errorCallback(response) {
            $scope.loading.progress = false;
            ErrorService.showError(response);
          });
    }

    $scope.goToObservaciones = function() {
        console.log('goToObservaciones');
        $location.hash('observaciones');
        $anchorScroll();
    };


    if(AuthService.isAuthenticated()){
        $scope.load();
    }
}])

.controller('ReservaGruposController', ['$scope', 'GrupoService', 'ErrorService', '$rootScope', 'AuthService', 'PduService', 'ngDialog', '$window',
    function ($scope, GrupoService, ErrorService, $rootScope, AuthService, PduService, ngDialog, $window) {
    $scope.title = 'RESERVA DE GRUPOS';
    $rootScope.pageTitle = 'RESERVA DE GRUPOS';
    $rootScope.active = 'ReservaGrupos';
    $scope.loading = true;
    $scope.datosSerie = {numgruposdia : 1};

    var pdusToRead = ['agencia'];
    $scope.pdus = [];

    $scope.load = function(showOk){
        $scope.loading = true;
        PduService.getPdus(pdusToRead).then(
            function successCallback(response) {
                $scope.loading = false;
                $scope.pdus = response.data;
                $scope.pdus.push({tabla: "diasemana", codigo: 1, orden: "0", nombre: "LUNES", fijo: false});
                $scope.pdus.push({tabla: "diasemana", codigo: 2, orden: "0", nombre: "MARTES", fijo: false});
                $scope.pdus.push({tabla: "diasemana", codigo: 3, orden: "0", nombre: "MIÉRCOLES", fijo: false});
                $scope.pdus.push({tabla: "diasemana", codigo: 4, orden: "0", nombre: "JUEVES", fijo: false});
                $scope.pdus.push({tabla: "diasemana", codigo: 5, orden: "0", nombre: "VIERNES", fijo: false});
                $scope.pdus.push({tabla: "diasemana", codigo: 6, orden: "0", nombre: "SÁBADO", fijo: false});
                $scope.pdus.push({tabla: "diasemana", codigo: 0, orden: "0", nombre: "DOMINGO", fijo: false});
          }, function errorCallback(response) {
            ErrorService.showError(response);
          });
    }

    $scope.previewGrupos = function(){
        //console.log('previewGrupos:', $scope.datosSerie);
        if($scope.datosSerie.fechaini && $scope.datosSerie.fechafin && $scope.datosSerie.diasemana
            && isValidDate($scope.datosSerie.fechaini) && isValidDate($scope.datosSerie.fechafin)
            && ($scope.datosSerie.fechafin.getFullYear() - $scope.datosSerie.fechaini.getFullYear()) <= 5 ){
            var fechaIni = $scope.datosSerie.fechaini;
            while(fechaIni.getDay() != $scope.datosSerie.diasemana){
                fechaIni = addDays(fechaIni, 1);
            }
            $scope.grupos = getDates(fechaIni, $scope.datosSerie.fechafin, $scope.datosSerie.numgruposdia || 1);
        }
    }

    function isValidDate(d) {
        return d instanceof Date && !isNaN(d);
    }

    $scope.generateGrupos = function(){
        //console.log('generateGrupos:', $scope.datosSerie);
        //console.log($scope.datosSerie.fechaini.getDay() + '/' + $scope.datosSerie.diasemana);
        var fechaIni = $scope.datosSerie.fechaini;
        while(fechaIni.getDay() != $scope.datosSerie.diasemana){
            fechaIni = addDays(fechaIni, 1);
        }
        $scope.grupos = getDates(fechaIni, $scope.datosSerie.fechafin, $scope.datosSerie.numgruposdia);
        console.log('generateGrupos:', $scope.grupos);
        if($scope.grupos.length > 0 && $scope.grupos.length <= 100){
            var message = '<div class="dialog-contents">' +
                'Vas a generar ' + $scope.grupos.length + ' grupos para ' + $scope.datosSerie.agencia + '<br/><br/>' +
                '¿Estás seguro?<br/><br/>' +
                '<button class="btn" ng-click="closeThisDialog()">No</button>' +
                '<span class="float-right">&nbsp;&nbsp;</span>' +
                '<button class="btn btn-primary float-right" ng-click="confirm()">Sí</button>' +
                '<br/><br/>' +
                '</div>';
            ngDialog.openConfirm({ template: message, plain: 'true'}).then(
                function successCallback(response) {
                    var grupos = [];
                    for (var i = 0; i < $scope.grupos.length; i++) {
                        grupos.push({agencia: $scope.datosSerie.agencia, ref: $scope.datosSerie.referencia, fecha: $scope.grupos[i], numgruposdia: $scope.datosSerie.numgruposdia
                        });
                    }
                    $scope.loading = true;
                    GrupoService.generateSerie(grupos).then(
                        function successCallback(response) {
                            $scope.loading = false;
                            var message = '<div class="dialog-contents">' +
                                $scope.grupos.length + ' grupos para ' + $scope.datosSerie.agencia + ' generados correctamente.<br/><br/>' +
                                '<span class="float-right">&nbsp;&nbsp;</span>' +
                                '<button class="btn btn-primary float-right" ng-click="closeThisDialog()">Ok</button>' +
                                '<br/><br/>' +
                                '</div>';
                            ngDialog.openConfirm({ template: message, plain: 'true'});
                      }, function errorCallback(response) {
                            ErrorService.showError(response);
                      });
                }
            );
        }
        else{
            if($scope.grupos.length <= 0){
                var message = '<div class="dialog-contents">' +
                    'No se han generado grupos. Por favor, revisa las fechas<br/><br/>' +
                    '<span class="float-right">&nbsp;&nbsp;</span>' +
                    '<button class="btn btn-primary float-right" ng-click="closeThisDialog()">Ok</button>' +
                    '<br/><br/>' +
                    '</div>';
            }
            else{
                var message = '<div class="dialog-contents">' +
                    'Has superado el número máximo de grupos (100). Por favor, revisa las fechas<br/><br/>' +
                    '<span class="float-right">&nbsp;&nbsp;</span>' +
                    '<button class="btn btn-primary float-right" ng-click="closeThisDialog()">Ok</button>' +
                    '<br/><br/>' +
                    '</div>';
            }
            ngDialog.openConfirm({ template: message, plain: 'true'});
        }
    }

    function addDays(fecha, days) {
        var date = new Date(fecha);
        date.setDate(date.getDate() + days);
        return date;
    }

    function getDates(startDate, stopDate, numgruposdia) {
        console.log('getDates:' + startDate + '_' + stopDate);
        var dateArray = new Array();
        if(startDate && stopDate && startDate < stopDate){
            var currentDate = startDate;
            if($scope.datosSerie.hora){
                currentDate.setHours($scope.datosSerie.hora.getHours(), $scope.datosSerie.hora.getMinutes(), 0);
            }
            while (currentDate <= stopDate) {
                for (var i = 0; i < numgruposdia; i++) {
                    dateArray.push(new Date (currentDate));
                }
                currentDate = addDays(currentDate, 7);
            }
        }
        return dateArray;
    }

    $scope.goToTop = function(){
        $window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if(AuthService.isAuthenticated()){
        $scope.load(false);
    }
}])

.controller('MarkAsReadedController', ['$scope', '$rootScope', 'GrupoService', 'ErrorService', 'AuthService', 'PduService', '$window', '$stateParams', '$state',
    function ($scope, $rootScope, GrupoService, ErrorService, AuthService, PduService, $window, $stateParams, $state) {
    $scope.title = 'CONFIRMACIÓN DE LECTURA';
    $rootScope.pageTitle = $scope.title;
    $rootScope.active = 'Grupos';
    $scope.loading = true;
    $scope.grupo = {idgrupo: null, idfrom: null};
    $scope.from = null;

    if($stateParams.idgrupo && $stateParams.idgrupo > 0){
        $scope.grupo.idgrupo = $stateParams.idgrupo;
    }
    if($stateParams.idfrom && $stateParams.idfrom > 0){
        $scope.grupo.idfrom = $stateParams.idfrom;
    }
    if($stateParams.from){
        $scope.from = $stateParams.from;
    }

    GrupoService.markAsReaded($scope.grupo.idgrupo, $scope.grupo.idfrom).then(
        function successCallback(response) {
            $scope.loading = false;
            $scope.grupo = response.data;
            console.log('$scope.grupo:', $scope.grupo);
      }, function errorCallback(response) {
        ErrorService.showError(response);
      });

    $scope.closeNotification = function(){
        $window.close();
    }

    $scope.verGrupo = function(){
        $state.go('app.grupo', {id: $scope.grupo.idgrupo} );
    }
}])

;