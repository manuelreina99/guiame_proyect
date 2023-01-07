'use strict';

angular.module('guiame')

.controller('FacturasController', ['$scope', 'FacturaService', 'PrintService', '$location', 'ErrorService', '$stateParams', '$state', '$rootScope', 'AuthService', 'PduService', '$window', 'ngDialog',
    function ($scope, FacturaService, PrintService, $location, ErrorService, $stateParams, $state, $rootScope, AuthService, PduService, $window, ngDialog) {

    $scope.title = 'FACTURAS';
    $rootScope.pageTitle = 'FACTURAS';
    $rootScope.active = 'Facturas';
    $scope.escompra = false;
    console.log('$stateParams.escompra:', $stateParams.escompra);
    if($stateParams.escompra){
        $scope.title = 'GASTOS';
        $rootScope.pageTitle = 'GASTOS';
        $rootScope.active = 'Gastos';
        $scope.escompra = true;
    }
    $scope.loading = true;

    $scope.facturas = [];
    $scope.filtro = AuthService.getFacturaFilters($stateParams.escompra);
    $scope.filtro.escompra = $stateParams.escompra;
    if(!$scope.filtro.escompra && !$scope.filtro.emisor){
        $scope.filtro.emisor = $rootScope.currentUser.id.toString();
    }
    var pdusToRead = ['agencia', 'emisor', 'guia', 'tipofactura'];
    $scope.pdus = [];

    $scope.load = function(showOk){
        $scope.loading = true;
        PduService.getPdus(pdusToRead).then(
            function successCallback(response) {
                $scope.pdus = response.data;
          }, function errorCallback(response) {
            ErrorService.showError(response);
          });
        FacturaService.getFacturas($scope.filtro).then(
            function successCallback(response) {
                console.log('facturas:', response.data);
                $scope.loading = false;
                $scope.facturas = response.data.facturas;
                $scope.facturas.total = response.data.total;
                AuthService.setFacturaFilters($scope.filtro, $scope.escompra);
                if(showOk){
                    ErrorService.showTooltip($scope, $rootScope.notifyOk);
                }
          }, function errorCallback(response) {
                ErrorService.showError(response);
          });
    }

    $scope.goToFactura = function(idfactura){
        console.log('goToFactura:', idfactura);
        $state.go('app.factura', {id: idfactura, auto: false, escompra: $stateParams.escompra} );
    }

    $scope.setFiltro = function(){
        $scope.load(true);
    }

    $scope.addDayToFiltroFecha = function(fecha, days){
        if(fecha == 'fechaini' && $scope.filtro.fechaini){
            $scope.filtro.fechaini.setDate($scope.filtro.fechaini.getDate() + days);
            $scope.filtro.fechaini = new Date($scope.filtro.fechaini);
            $scope.load(true);
        }
        if(fecha == 'fechafin' && $scope.filtro.fechafin){
            $scope.filtro.fechafin.setDate($scope.filtro.fechafin.getDate() + days);
            $scope.filtro.fechafin = new Date($scope.filtro.fechafin);
            $scope.load(true);
        }
    }

    $scope.goToTop = function(){
        $window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    $scope.csv = function(){
        if(!$scope.filtro.tipofactura){
            var message = '<div class="dialog-contents">' +
                        'No has filtrado por tipo. ¿Estás seguro de que quieres descargar varios tipos?<br/><br/>' +
                        '<button class="btn" ng-click="closeThisDialog()">No</button>' +
                        '<span class="float-right">&nbsp;&nbsp;</span>' +
                        '<button class="btn btn-primary float-right" ng-click="confirm()">Sí</button>' +
                        '<br/><br/>' +
                        '</div>';
            ngDialog.openConfirm({ template: message, plain: 'true'}).then(
                function successCallback(response) {
                    FacturaService.csvFacturas($scope.filtro);
                }
            );
        }
        else{
            FacturaService.csvFacturas($scope.filtro);
        }
    }

    $scope.print = function(){
        PrintService.facturas($scope.filtro);
    }

    $scope.printAll = function(){
        var idsToPrint = [];
        for (var i = 0; i < $scope.facturas.length; i++) {
            idsToPrint.push($scope.facturas[i].idfactura);
        }
        console.log('idsToPrint:', idsToPrint);
        if(idsToPrint.length > 0 && idsToPrint.length <= 50){
            $rootScope.rsLoading = true;
            PrintService.factura(0, false, idsToPrint);
        }
        else{
            var message = '';
            if(idsToPrint.length > 0){
                message =   '<div class="dialog-contents">' +
                            'No es posible generar un pdf con más de 50 facturas.<br/><br/>' +
                            '<button class="btn btn-primary float-right" ng-click="closeThisDialog()">Ok</button>' +
                            '<br/><br/>' +
                            '</div>';
            }
            else{
                message =   '<div class="dialog-contents">' +
                            'Selecciona algunas facturas para generar el pdf.<br/><br/>' +
                            '<button class="btn btn-primary float-right" ng-click="closeThisDialog()">Ok</button>' +
                            '<br/><br/>' +
                            '</div>';
            }
            ngDialog.openConfirm({ template: message, plain: 'true'});
        }
    }

    $scope.cobrar = function(){
        $scope.idsChecked = [];
        var error = false;
        for (var i = 0; i < $scope.facturas.length; i++) {
            if($scope.facturas[i].checked){
                $scope.idsChecked.push($scope.facturas[i].idfactura);
                if($scope.facturas[i].idusuarioemisor != $rootScope.currentUser.id && !$scope.escompra){
                    error = true;
                    break;
                }
            }
        }
        console.log('cobrar:', $scope.idsChecked);
        if(error){
            var message = '<div class="dialog-contents">' +
                        'No puedes cobrar/pagar facturas que no has emitido tú.<br/><br/>' +
                        '<button class="btn btn-primary float-right" ng-click="closeThisDialog()">Ok</button>' +
                        '<br/><br/>' +
                        '</div>';
            ngDialog.openConfirm({ template: message, plain: 'true'});
        }
        else{
            if($scope.idsChecked.length > 0){
                $scope.cobros =
                    {agencia_honorarios_pagado: false, agencia_honorarios_fecha: null, agencia_honorarios_importe: null,
                     agencia_gastos_pagado    : false, agencia_gastos_fecha    : null, agencia_gastos_importe    : null,
                     guia_honorarios_pagado   : false, guia_honorarios_fecha   : null, guia_honorarios_importe   : null,
                     guia_gastos_pagado       : false, guia_gastos_fecha       : null, guia_gastos_importe       : null,
                    };
                $scope.cobrosDialog = ngDialog.open({
                    template: 'views/newCobro.html',
                    scope: $scope
                });
            }
            else{
                var message = '<div class="dialog-contents">' +
                            'Selecciona las facturas que quieras cobrar/pagar.<br/><br/>' +
                            '<button class="btn btn-primary float-right" ng-click="closeThisDialog()">Ok</button>' +
                            '<br/><br/>' +
                            '</div>';
                ngDialog.openConfirm({ template: message, plain: 'true'});
            }
        }
    }

    $scope.doCobro = function(){
            console.log('$scope.idsChecked:', $scope.idsChecked);
            console.log('$scope.cobros:', $scope.cobros);
            $scope.loading = true;
            FacturaService.cobroPago($scope.idsChecked, $scope.cobros).then(
                function successCallback(response) {
                    $scope.loading = false;
                    console.log('doCobro actualizadas ' + response.data + ' facturas.');
                    $scope.cobrosDialog.close();
                    $scope.cobros =
                    {agencia_honorarios_pagado: false, agencia_honorarios_fecha: null, agencia_honorarios_importe: null,
                     agencia_gastos_pagado    : false, agencia_gastos_fecha    : null, agencia_gastos_importe    : null,
                     guia_honorarios_pagado   : false, guia_honorarios_fecha   : null, guia_honorarios_importe   : null,
                     guia_gastos_pagado       : false, guia_gastos_fecha       : null, guia_gastos_importe       : null,
                    };
                    var message = '<div class="dialog-contents">' +
                                'Se han actualizado los datos de pagos/cobros de las facturas seleccionadas<br/><br/>' +
                                '<button class="btn btn-primary float-right" ng-click="confirm()">Ok</button>' +
                                '<br/><br/>' +
                                '</div>';
                    ngDialog.openConfirm({ template: message, plain: 'true'});
              }, function errorCallback(response) {
                    ErrorService.showError(response);
              });
    }

    $scope.cancelCobro = function(){
        $scope.cobrosDialog.close();
    }


    if(AuthService.isAuthenticated()){
        $scope.load(false);
    }
}])

.controller('FacturaController', ['$scope', 'FacturaService', 'PduService', '$location', 'ErrorService', '$stateParams', '$state', '$rootScope', 'AuthService', '$uibModal', 'PrintService', 'ngDialog', '$window', '$filter',
    function ($scope, FacturaService, PduService, $location, ErrorService, $stateParams, $state, $rootScope, AuthService, $uibModal, PrintService, ngDialog, $window, $filter) {

    $scope.title = 'FACTURA';
    $rootScope.pageTitle = 'FACTURA';
    $rootScope.active = 'Facturas';
    console.log('$stateParams.escompra:', $stateParams.escompra);
    if($stateParams.escompra){
        $scope.title = 'GASTO';
        $rootScope.pageTitle = 'GASTOS';
        $rootScope.active = 'Gastos';
        $scope.escompra = true;
    }

    $scope.loading = true;
    $scope.factura = newFactura();
    var pdusToRead = ['tipofactura', 'provincia', 'emisor', 'proveedor'];
    $scope.pdus = [];

    function newFactura(){
        var factura = { idfactura : 0, idusuarioemisor : $rootScope.currentUser.id, tipofactura : '', numero : 0,
                        fecha : new Date(), referencia : '',
                        identificacion : '', nombre : '', direccion : '', poblacion : '', provincia : '', codigopostal : 0, pais : '',
                        estado : '', fechaestado : new Date(),
                        observaciones : ($scope.escompra ? '' : $rootScope.currentUser.facturadefaulttext),
                        porciva : 21, porcretencion : ($scope.escompra ? 0 : $rootScope.currentUser.irpf),
                        base : 0, totaliva : 0, totalretencion : 0, total : 0, gastos : 0, grupos : [], lineas : [], contLineasNoGastos: 0,
                        monumentolaborable: 0, monumentofestivo: 0, idiomalaborable: 0, idiomafestivo: 0, horalaborable: 0, horafestivo: 0,
                        escompra: $stateParams.escompra}
        return factura;
    }

    $scope.load = function(){
        $scope.loading = true;
        PduService.getPdus(pdusToRead).then(
            function successCallback(response) {
                console.log('pdus:', response.data);
                $scope.pdus = response.data;
          }, function errorCallback(response) {
            ErrorService.showError(response);
          });
        
        if($stateParams.id && $stateParams.id > 0){
            FacturaService.getFactura($stateParams.id).then(
                function successCallback(response) {
                    $scope.factura = response.data;
                    updateFacturaDatetimes();
                    $scope.factura.contLineasNoGastos = $scope.factura.lineas.filter((obj) => obj.isgasto === false).length;
                    console.log('$stateParams.auto:', $stateParams.auto);
                    console.log('$stateParams.auto:', typeof($stateParams.auto));
                    if($stateParams.auto && $stateParams.auto == 'true'){
                        FacturaService.deleteFactura($scope.factura.idfactura).then(
                            function successCallback(response) {
                                $scope.factura.idfactura = 0;
                                for (var i = 0; i < $scope.factura.lineas.length; i++) {
                                    $scope.factura.lineas[i].idlinea = 0;
                                }
                                $scope.formFactura.$setDirty();
                                $scope.loading = false;
                          }, function errorCallback(response) {
                            ErrorService.showError(response);
                          });
                    }
                    else{
                        $scope.loading = false;
                    }
              }, function errorCallback(response) {
                ErrorService.showError(response);
                $scope.loading = false;
              });
        }
        else{
            $scope.loading = false;
        }
    }

    function updateFacturaDatetimes(){
        $scope.factura.fecha = ($scope.factura.fecha ? new Date($scope.factura.fecha) : null);
        $scope.factura.idusuarioemisor = $scope.factura.idusuarioemisor + '';
        $scope.factura.agencia_honorarios_fecha = ($scope.factura.agencia_honorarios_fecha ? new Date($scope.factura.agencia_honorarios_fecha) : null);
        $scope.factura.agencia_gastos_fecha = ($scope.factura.agencia_gastos_fecha ? new Date($scope.factura.agencia_gastos_fecha) : null);
        $scope.factura.guia_honorarios_fecha = ($scope.factura.guia_honorarios_fecha ? new Date($scope.factura.guia_honorarios_fecha) : null);
        $scope.factura.guia_gastos_fecha = ($scope.factura.guia_gastos_fecha ? new Date($scope.factura.guia_gastos_fecha) : null);
        console.log('$scope.factura:', $scope.factura);
    }

    $scope.updateTotales = function(){
        $scope.factura.base = 0;
        $scope.factura.gastos = 0;
        for (var i = 0; i < $scope.factura.lineas.length; i++) {
            $scope.factura.lineas[i].total = $scope.factura.lineas[i].cantidad * $scope.factura.lineas[i].precio;
            if($scope.factura.lineas[i].isgasto){
                $scope.factura.gastos += $scope.factura.lineas[i].total;
            }
            else{
                $scope.factura.base += $scope.factura.lineas[i].total;
            }
        }
        $scope.factura.totaliva = $scope.factura.base * $scope.factura.porciva / 100;
        $scope.factura.totalretencion = $scope.factura.base * $scope.factura.porcretencion / 100;
        $scope.factura.total = $scope.factura.base +  $scope.factura.totaliva - $scope.factura.totalretencion;
        $scope.factura.total = parseFloat($scope.factura.total.toFixed(2));
        $scope.factura.contLineasNoGastos = $scope.factura.lineas.filter((obj) => obj.isgasto === false).length;
    }

    $scope.updatePrecioLinea = function(){
        $scope.factura.lineas[0].precio = $scope.factura.total / ($scope.factura.lineas[0].cantidad +
                                                                  $scope.factura.lineas[0].cantidad * $scope.factura.porciva / 100 -
                                                                  $scope.factura.lineas[0].cantidad * $scope.factura.porcretencion / 100);
        $scope.factura.lineas[0].precio = parseFloat($scope.factura.lineas[0].precio.toFixed(2));
        $scope.factura.lineas[0].total = $scope.factura.lineas[0].cantidad * $scope.factura.lineas[0].precio;
        $scope.factura.base = $scope.factura.lineas[0].cantidad * $scope.factura.lineas[0].precio;
        $scope.factura.totaliva = $scope.factura.base * $scope.factura.porciva / 100;
        $scope.factura.totalretencion = $scope.factura.base * $scope.factura.porcretencion / 100;
    }

    $scope.deleteLinea = function(linea){
        console.log('deleteLinea:', linea.idfactura + '_' + linea.idlinea);
        var tempLineas = [];
        for (var i = 0; i < $scope.factura.lineas.length; i++) {
            if(!($scope.factura.lineas[i].idlinea == linea.idlinea &&
                 $scope.factura.lineas[i].isgasto == linea.isgasto &&
                 $scope.factura.lineas[i].numlinea == linea.numlinea)){
            //if($scope.factura.lineas[i].idlinea != linea.idlinea && isgasto && numlineaxx){
                tempLineas.push($scope.factura.lineas[i]);
            }
        }
        $scope.factura.lineas = tempLineas;
        $scope.formFactura.$setDirty();
        $scope.updateTotales();
    }

    $scope.openModal = function (isgasto) {
        $scope.newLinea = { idlinea : 0, idfactura : $scope.factura.idfactura,
                            numlinea : maxNumLinea(), descripcion : '', cantidad : 1, precio : 0, total : 0,
                            porciva : $scope.factura.porciva, totaliva : 0,
                            observaciones : '', isgasto : isgasto, imprimir : true};
        $scope.modalInstance = $uibModal.open({
          animation: false,
          templateUrl: 'views/newLineModal.html',
          size: 'lg',
          scope: $scope
        });

        $scope.modalInstance.result.then(function (selectedItem) {
        }, function () {
          console.log('Modal dismissed at: ' + new Date());
        });

    };

    function maxNumLinea(){
        var numlinea = 0;
        for (var i = 0; i < $scope.factura.lineas.length; i++) {
            if($scope.factura.lineas[i].numlinea > numlinea){
                numlinea = $scope.factura.lineas[i].numlinea;
            }
        }
        numlinea++;
        console.log('numlinea:', numlinea);
        return numlinea;
    }

    $scope.okNL = function () {
        $scope.modalInstance.close();
        console.log('$scope.newLinea:', $scope.newLinea);
        $scope.factura.lineas.push($scope.newLinea);
        $scope.formFactura.$setDirty();
        $scope.updateTotales();
    };

    $scope.cancelNL = function () {
        $scope.modalInstance.dismiss('cancel');
    };

    $scope.addNewLinea = function(tipo){
        var newLinea = { idlinea : 0, idfactura : $scope.factura.idfactura,
                         numlinea : maxNumLinea(), descripcion : '', cantidad : 1, precio : 0, total : 0,
                         porciva : $scope.factura.porciva, totaliva : 0,
                         observaciones : '', isgasto : false, imprimir : true};
        switch(tipo){
            case 'hora':
                newLinea.descripcion = 'HORA EXTRA';
                newLinea.precio = $scope.factura.esgrupofestivo ? $scope.factura.horafestivo : $scope.factura.horalaborable;
                break;
            case 'monumento':
                newLinea.descripcion = 'MONUMENTO EXTRA';
                newLinea.precio = $scope.factura.esgrupofestivo ? $scope.factura.monumentofestivo : $scope.factura.monumentolaborable;
                break;
            case 'idioma':
                newLinea.descripcion = 'IDIOMA EXTRA';
                newLinea.precio = $scope.factura.esgrupofestivo ? $scope.factura.idiomafestivo : $scope.factura.idiomalaborable;
                break;
        }
        newLinea.total = newLinea.precio;

        $scope.factura.lineas.push(newLinea);
        $scope.formFactura.$setDirty();
        $scope.updateTotales();
    }

    $scope.saveFactura = function(){
        $scope.formFactura.numero.$setDirty();
        checkFactura();

        if($scope.factura.idfactura > 0 && $scope.factura.idusuarioemisor != $rootScope.currentUser.id && !$scope.escompra){
            var message = '<div class="dialog-contents">' +
                        'No puedes modificar una factura que no has emitido tú.<br/><br/>' +
                        '<button class="btn btn-primary float-right" ng-click="closeThisDialog()">Ok</button>' +
                        '<br/><br/>' +
                        '</div>';
            ngDialog.openConfirm({ template: message, plain: 'true'});
        }
        else{
            if($scope.formFactura.$valid){
                console.log('save:', $scope.factura);
                $scope.loading = true;
                FacturaService.saveFactura($scope.factura).then(
                    function successCallback(response) {
                        console.log('response.data:', response.data);
                        $state.go('app.factura', {id: response.data, auto: false} );
                        $scope.formFactura.$setPristine();
                        $scope.loading = false;
                  }, function errorCallback(response) {
                    ErrorService.showError(response);
                    $scope.loading = false;
                  });
            }
        }
    }

    function checkFactura(){
        if(!$scope.factura.tipofactura || $scope.factura.tipofactura == ''){
            console.log('error $scope.factura.tipofactura:', $scope.factura.tipofactura);
            $scope.formFactura.tipo.$setValidity("required", false);
        }
        else{
            $scope.formFactura.tipo.$setValidity("required", true);
        }

        if(!$scope.factura.numero || $scope.factura.numero == 0){
            console.log('error $scope.factura.numero:', $scope.factura.numero);
            $scope.formFactura.numero.$setValidity("required", false);
        }
        else{
            $scope.formFactura.numero.$setValidity("required", true);
        }
    }

    $scope.printFactura = function(isproforma){
        var idsToPrint = [];
        idsToPrint.push($scope.factura.idfactura);
        $rootScope.rsLoading = true;
        PrintService.factura($scope.factura.idfactura, isproforma, idsToPrint);
    }

    $scope.deleteFactura = function(){
        console.log('deleteFactura.id:', $scope.factura.idfactura);
        if($scope.factura.idfactura > 0 && $scope.factura.idusuarioemisor != $rootScope.currentUser.id && !$scope.escompra){
            var message = '<div class="dialog-contents">' +
                        'No puedes borrar una factura que no has emitido tú.<br/><br/>' +
                        '<button class="btn btn-primary float-right" ng-click="closeThisDialog()">Ok</button>' +
                        '<br/><br/>' +
                        '</div>';
            ngDialog.openConfirm({ template: message, plain: 'true'});
        }
        else
        {
            var message = '<div class="dialog-contents">' +
                        'Vas a borrar ' + ($scope.escompra ? 'este gasto' : 'esta factura') + ' ¿Estás seguro?<br/><br/>' +
                        '<button class="btn" ng-click="closeThisDialog()">No</button>' +
                        '<span class="float-right">&nbsp;&nbsp;</span>' +
                        '<button class="btn btn-danger float-right" ng-click="confirm()">Sí</button>' +
                        '<br/><br/>' +
                        '</div>';
            ngDialog.openConfirm({ template: message, plain: 'true'}).then(
                function successCallback(response) {
                    if($scope.factura.idfactura > 0){
                        FacturaService.deleteFactura($scope.factura.idfactura).then(
                            function successCallback(response) {
                                $scope.loading = false;
                                // redireccionar a facturas/gastos:
                                if($scope.escompra){
                                    $state.go('app.gastos', {escompra: true} );
                                }
                                else{
                                    $state.go('app.facturas', {} );
                                }
                          }, function errorCallback(response) {
                                ErrorService.showError(response);
                          });
                    }
                    else{
                        $state.go('app.facturas', {} );
                    }
                }
            );
        }
    }

    $scope.descartarCambios = function(){
        var message = '<div class="dialog-contents">' +
            'Vas a descartar todos los cambios realizados la factura.<br/><br/>' +
            '¿Estás seguro?<br/><br/>' +
            '<button class="btn" ng-click="closeThisDialog()">No</button>' +
            '<span class="float-right">&nbsp;&nbsp;</span>' +
            '<button class="btn btn-danger float-right" ng-click="confirm()">Sí</button>' +
            '<br/><br/>' +
            '</div>';
        ngDialog.openConfirm({ template: message, plain: 'true'}).then(
            function successCallback(response) {
                if($stateParams.auto && $stateParams.auto == 'true'){
                    $state.go('app.grupos', {} );
                }
                else{
                    if($stateParams.id && $stateParams.id > 0){
                        $state.reload();
                    }
                    else{
                        $state.go('app.facturas', {} );
                    }
                }
            }
        );
    }

    $scope.loadDatosProveedor = function(){
        $scope.loading = true;
        PduService.getProveedor($scope.factura.emisorgasto).then(
            function successCallback(response) {
                $scope.loading = false;
                console.log('loadDatosProveedor:', response.data);
                if(response.data.length > 0){
                    $scope.factura.identificacion = response.data[0].identificacion;
                    $scope.factura.nombre = response.data[0].nombre;
                    $scope.factura.direccion = response.data[0].direccion;
                    $scope.factura.poblacion = response.data[0].localidad;
                    $scope.factura.provincia = response.data[0].provincia;
                    $scope.factura.codigopostal = response.data[0].codigopostal;
                }
          }, function errorCallback(response) {
            ErrorService.showError(response);
          });
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
            if($scope.newCodigo.poblacion && !$scope.newCodigo.localidad){
                $scope.newCodigo.localidad = $scope.newCodigo.poblacion;
            }

            $scope.loading = true;
            PduService.upsertPdu($scope.newCodigo).then(
                function successCallback(response) {
                    $scope.loading = false;
                    $scope.ncDialog.close();
                    var tempNombre = $scope.newCodigo.nombre;
                    $scope.newCodigo.nombre = $scope.newCodigo.codigo + '-' + $scope.newCodigo.nombre;
                    if($scope.newCodigo.tabla == 'proveedor'){
                        $scope.factura.emisorgasto = $scope.newCodigo.codigo;
                        $scope.factura.nombre = tempNombre;
                        $scope.factura.identificacion = $scope.newCodigo.identificacion;
                        $scope.factura.direccion = $scope.newCodigo.direccion;
                        $scope.factura.poblacion = $scope.newCodigo.poblacion;
                        $scope.factura.provincia = $scope.newCodigo.provincia;
                        $scope.factura.codigopostal = $scope.newCodigo.codigopostal;
                        $scope.formFactura.emisorgasto.$setDirty();
                    }
                    else{
                        $scope.factura[$scope.newCodigo.tabla] = $scope.newCodigo.codigo;
                        $scope.formFactura[$scope.newCodigo.tabla].$setDirty();
                    }
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

    $scope.goToTop = function(){
        $window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    $scope.clonarFactura = function(){
        if($scope.factura.idfactura > 0 && $scope.factura.idusuarioemisor != $rootScope.currentUser.id && !$scope.escompra){
            var message = '<div class="dialog-contents">' +
                        'No puedes clonar una factura que no has emitido tú.<br/><br/>' +
                        '<button class="btn btn-primary float-right" ng-click="closeThisDialog()">Ok</button>' +
                        '<br/><br/>' +
                        '</div>';
            ngDialog.openConfirm({ template: message, plain: 'true'});
        }
        else{
            var message = '<div class="dialog-contents">' +
                        'Vas a clonar esta factura en negativo, trasladando todos sus datos salvo el número de factura<br/><br/>' +
                        '¿Estás seguro?<br/><br/>' +
                        '<button class="btn" ng-click="closeThisDialog()">No</button>' +
                        '<span class="float-right">&nbsp;&nbsp;</span>' +
                        '<button class="btn btn-primary float-right" ng-click="confirm()">Sí</button>' +
                        '<br/><br/>' +
                        '</div>';
            ngDialog.openConfirm({ template: message, plain: 'true'}).then(
                function successCallback(response) {
                    console.log('Clonar:', $scope.factura);
                    $scope.loading = true;
                    FacturaService.clonarFactura($scope.factura.idfactura).then(
                        function successCallback(response) {
                            $scope.loading = false;
                            // redireccionar a la factura:
                            $state.go('app.factura', {id: response.data, auto: true} );
                      }, function errorCallback(response) {
                            ErrorService.showError(response);
                      });
                }
            );
        }
    }

    $scope.getNextNum = function(){
        if($scope.factura.idfactura == 0){
            $scope.loading = true;
            FacturaService.getNextFacturaNum($scope.factura.idusuarioemisor, $scope.factura.tipofactura, $scope.factura.fecha.getFullYear(), $scope.factura.escompra || false).then(
                function successCallback(response) {
                    $scope.loading = false;
                    $scope.factura.numero = response.data;
                    $scope.formFactura.$setDirty();
              }, function errorCallback(response) {
                ErrorService.showError(response);
              });
        }
    }

    $scope.updateImportesPagados = function(tipo){

        if(tipo == 1){
            $scope.factura.agencia_honorarios_importe = ($scope.factura.agencia_honorarios_pagado ? $scope.factura.total : 0);
        }

        if(tipo == 2){
            $scope.factura.agencia_gastos_importe = ($scope.factura.agencia_gastos_pagado ? $scope.factura.gastos : 0);
        }

        if(tipo == 3){
            $scope.factura.guia_honorarios_importe = ($scope.factura.guia_honorarios_pagado ? $scope.factura.total : 0);
        }

        if(tipo == 4){
            $scope.factura.guia_gastos_importe = ($scope.factura.guia_gastos_pagado ? $scope.factura.gastos : 0);
        }
    }

    $scope.emailFactura = function(){
        if(!$scope.factura.recipient){
            var message =   '<div class="dialog-contents">' +
                            'Antes de enviar la factura por email debes informar el email del destinatario.<br/><br/>' +
                            '<button class="btn btn-primary float-right" ng-click="closeThisDialog()">Ok</button>' +
                            '<br/><br/>' +
                            '</div>';
            ngDialog.openConfirm({ template: message, plain: 'true'});
        }
        else{
            if($scope.formFactura.$dirty){
                var message =   '<div class="dialog-contents">' +
                                'Guarda las modificaciones que has realizado a la factura antes de enviarla por email.<br/><br/>' +
                                '<button class="btn btn-primary float-right" ng-click="closeThisDialog()">Ok</button>' +
                                '<br/><br/>' +
                                '</div>';
                ngDialog.openConfirm({ template: message, plain: 'true'});
            }
            else{
                var message = '<div class="dialog-contents">' +
                            'Vas a enviar la factura ' + $scope.factura.numero + '/' + $scope.factura.anio +
                            ' por importe de ' + $filter('currency')($scope.factura.total) +
                            ' al email:<br/><br/>' +
                            $scope.factura.recipient + '<br/><br/>' +
                            '¿Estás seguro?<br/><br/>' +
                            '<button class="btn" ng-click="closeThisDialog()">No</button>' +
                            '<span class="float-right">&nbsp;&nbsp;</span>' +
                            '<button class="btn btn-primary float-right" ng-click="confirm()">Sí</button>' +
                            '<br/><br/>' +
                            '</div>';
                ngDialog.openConfirm({ template: message, plain: 'true'}).then(
                    function successCallback(response) {
                        $scope.loading = true;
                        PrintService.emailFactura($scope.factura.idfactura, $scope.factura.recipient).then(
                            function successCallback(response) {
                                $scope.loading = false;
                                var message =   '<div class="dialog-contents">' +
                                                'Factura enviada correctamente a ' + $scope.factura.recipient + '.<br/><br/>' +
                                                '<button class="btn btn-primary float-right" ng-click="closeThisDialog()">Ok</button>' +
                                                '<br/><br/>' +
                                                '</div>';
                                ngDialog.openConfirm({ template: message, plain: 'true'});
                          }, function errorCallback(response) {
                                $scope.loading = false;
                                ErrorService.showError(response);
                        });
                    }
                );
            }
        }
    }

    if(AuthService.isAuthenticated()){
        $scope.load();
    }
}])

;