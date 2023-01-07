'use strict';

angular
  .module('guiame')

  .factory('PrintService', ['$rootScope', '$http', 'baseURL',
    function($rootScope, $http, baseURL) {

    function factura(idfactura, isproforma, idsToPrint) {
      $http.post(baseURL + '/print/factura', {idfactura : idfactura, idsToPrint: idsToPrint, isproforma: isproforma}, {responseType:'arraybuffer'}).then(
        function successCallback(response) {
          $rootScope.rsLoading = false;
          var file = new Blob([response.data], {type: 'application/pdf'});
          var fileURL = URL.createObjectURL(file);
          //window.open(fileURL);
          var docWindow = window.open(fileURL);
          //docWindow.print();
        }, function errorCallback(response) {
            console.log('Print err response:' + JSON.stringify(response));
        });
    }

    function facturas(filtro) {
      $http.post(baseURL + '/print/facturas', {filtro: filtro}, {responseType:'arraybuffer'}).then(
        function successCallback(response) {
          var file = new Blob([response.data], {type: 'application/pdf'});
          var fileURL = URL.createObjectURL(file);
          //window.open(fileURL);
          var docWindow = window.open(fileURL);
          //docWindow.print();
        }, function errorCallback(response) {
            console.log('Print err response:' + JSON.stringify(response));
        });
    }

    function grupo(idgrupo) {
      $http.post(baseURL + '/print/grupo', {idgrupo : idgrupo}, {responseType:'arraybuffer'}).then(
        function successCallback(response) {
          var file = new Blob([response.data], {type: 'application/pdf'});
          var fileURL = URL.createObjectURL(file);
          //window.open(fileURL);
          var docWindow = window.open(fileURL);
          //docWindow.print();
        }, function errorCallback(response) {
            console.log('Print err response:' + JSON.stringify(response));
        });
    }

    function grupos(filtro) {
      filtro.fechainiformat = new Date(filtro.fechaini).toLocaleDateString();
      filtro.fechafinformat = new Date(filtro.fechafin).toLocaleDateString();
      $http.post(baseURL + '/print/grupos', {filtro: filtro}, {responseType:'arraybuffer'}).then(
        function successCallback(response) {
          var file = new Blob([response.data], {type: 'application/pdf'});
          var fileURL = URL.createObjectURL(file);
          //window.open(fileURL);
          var docWindow = window.open(fileURL);
          //docWindow.print();
        }, function errorCallback(response) {
            console.log('Print err response:' + JSON.stringify(response));
        });
    }

    function csv(filtro) {
      //$http.get(baseURL + '/csv', {responseType:'arraybuffer'}).then(
      $http.put(baseURL + '/csv', filtro).then(
        function successCallback(response) {
          var file = new Blob([response.data], {type: 'text/csv'});
          var fileURL = URL.createObjectURL(file);
          //window.open(fileURL);

          var a = document.createElement("a");
          document.body.appendChild(a);
          a.style = "display: none";
          a.href = fileURL;
          a.download = $rootScope.currentUser.empresa.nombre + '_' + new Date().toISOString() +'.csv';
          a.click();
          window.URL.revokeObjectURL(fileURL);
        }, function errorCallback(response) {
            console.log('Print err response:' + JSON.stringify(response));
        });
    }

    function emailFactura(idfactura, recipient) {
      console.log('emailFactura:', idfactura);
      return $http.put(baseURL + '/email/factura', {idfactura: idfactura, recipient: recipient});
    }

    function tarifa(idtarifa){
      $http.post(baseURL + '/print/tarifa', {idtarifa : idtarifa}, {responseType:'arraybuffer'}).then(
        function successCallback(response) {
          var file = new Blob([response.data], {type: 'application/pdf'});
          var fileURL = URL.createObjectURL(file);
          var docWindow = window.open(fileURL);
        }, function errorCallback(response) {
            console.log('Print err response:' + JSON.stringify(response));
        });
    }

    return {
      factura: factura,
      facturas: facturas,
      grupo: grupo,
      grupos: grupos,
      emailFactura: emailFactura,
      csv: csv,
      tarifa: tarifa
    };
  }])

;