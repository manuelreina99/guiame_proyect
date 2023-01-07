'use strict';

angular
  .module('guiame')

  .factory('FacturaService', ['$http', 'baseURL', '$rootScope',
    function($http, baseURL, $rootScope) {

    function getFacturas(filtro) {
      console.log('getFacturas:', filtro);
      //return $http.get(baseURL + '/facturas');
      return $http.put(baseURL + '/facturas/filter', { filtro : filtro });
    }

    function getFactura(idFactura) {
      return $http.get(baseURL + '/facturas/' + idFactura);
    }

    function generateFactura(grupos){
      return $http.put(baseURL + '/facturas/generateFactura', { grupos : grupos });
    }

    function clonarFactura(idfactura){
      return $http.put(baseURL + '/facturas/clonarFactura', { idfactura : idfactura });
    }

    function saveFactura(factura) {
      return $http.put(baseURL + '/facturas', { factura : factura });
    }

    function deleteFactura(idfactura) {
      console.log('deleteFacturaService:', idfactura);
      return $http.delete(baseURL + '/facturas/' + idfactura);
    }

    function getNextFacturaNum(idusuarioemisor, tipofactura, anio, escompra) {
      return $http.put(baseURL + '/facturas/nextnumero', { idusuarioemisor : idusuarioemisor, tipofactura: tipofactura, anio: anio, escompra: escompra });
    }

    function csvFacturas(filtro) {
      //$http.get(baseURL + '/csv', {responseType:'arraybuffer'}).then(
      $http.put(baseURL + '/facturas/csv', {filtro : filtro}).then(
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

    function cobroPago(ids, datos){
      return $http.put(baseURL + '/facturas/cobrospagos', { ids : ids, datos: datos });
    }

    return {
      getFacturas: getFacturas,
      getFactura: getFactura,
      generateFactura: generateFactura,
      clonarFactura: clonarFactura,
      saveFactura: saveFactura,
      deleteFactura: deleteFactura,
      getNextFacturaNum: getNextFacturaNum,
      csvFacturas: csvFacturas,
      cobroPago: cobroPago
    };
  }])

;