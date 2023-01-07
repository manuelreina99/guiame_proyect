'use strict';

angular
  .module('guiame')

  .factory('PduService', ['$http', 'baseURL', 'weekdays',
    function($http, baseURL, weekdays) {

    function getPdus(tablas) {
      return $http.post(baseURL + '/pdus', {tablas: tablas});
    }

    function getAllPdus() {
      return $http.get(baseURL + '/pdus/all');
    }

    function getTablas() { //select distinct de nombres de tablas
      return $http.get(baseURL + '/pdus/tables');
    }

    function getCodigosPdu(tabla) { //lee todos los registros de una tabla de pdu
      return $http.get(baseURL + '/pdus/tables/' + tabla);
    }

    function deletePdu(idpdu){
      return $http.delete(baseURL + '/pdus/codigo/' + idpdu); 
    }

    function getFechas(isfestivo){
      console.log('getFechas:', isfestivo);
      return $http.post(baseURL + '/pdus/fechas', { isfestivo: isfestivo });
    }

    function deleteFecha(idfecha){
      return $http.delete(baseURL + '/pdus/fechas/' + idfecha);
    }

    function addFecha(fecha){
      return $http.put(baseURL + '/pdus/fechas', { fecha : fecha });
    }

    function getTarifas(){
      return $http.get(baseURL + '/pdus/tarifas'); 
    }

    function upsertTarifa(tarifa){
      console.log(tarifa);
      return $http.put(baseURL + '/pdus/tarifas', { tarifa : tarifa }); 
    }

    function upsertPdu(pdu){
      console.log(pdu);
      return $http.put(baseURL + '/pdus', { pdu : pdu }); 
    }

    function getMonumentos(){
      return $http.get(baseURL + '/pdus/monumentos'); 
    }

    function deleteMonumento(idmonumento){
      return $http.delete(baseURL + '/pdus/monumentos/' + idmonumento); 
    }

    function upsertMonumento(monumento){
      return $http.put(baseURL + '/pdus/monumentos', { monumento : monumento }); 
    }

    function getIncidenciasMonumento(idmonumento){
      return $http.get(baseURL + '/pdus/monumentos/incidencias/' + idmonumento); 
    }

    function upsertIncidencia(incidencia){
      return $http.put(baseURL + '/pdus/monumentos/incidencias', { incidencia : incidencia }); 
    }

    function deleteIncidencia(id){
      return $http.delete(baseURL + '/pdus/monumentos/incidencias/' + id); 
    }

    function getAgencia(codigoAgencia) {
      return $http.get(baseURL + '/pdus/agencia/' + codigoAgencia);
    }

    function getProveedor(codigoProveedor) {
      return $http.get(baseURL + '/pdus/proveedor/' + codigoProveedor);
    }

    function checkMonumentos(monumentos, fecha, horafinal) {
      return $http.put(baseURL + '/pdus/monumentos/check', { monumentos : monumentos, fecha : fecha, horafinal: horafinal });
    }

    function getWeekdayName(fecha){
        var name = '';
        if(fecha){
            name = weekdays[fecha.getDay()];
        }
        return name;
    }

    return {
      getPdus: getPdus,
      getAllPdus: getAllPdus,
      getTablas: getTablas,
      getCodigosPdu: getCodigosPdu,
      deletePdu: deletePdu,
      getFechas : getFechas,
      deleteFecha: deleteFecha,
      addFecha: addFecha,
      getTarifas: getTarifas,
      upsertTarifa: upsertTarifa,
      upsertPdu: upsertPdu,
      getMonumentos: getMonumentos,
      deleteMonumento: deleteMonumento,
      upsertMonumento: upsertMonumento,
      getIncidenciasMonumento: getIncidenciasMonumento,
      upsertIncidencia: upsertIncidencia,
      deleteIncidencia: deleteIncidencia,
      getAgencia: getAgencia,
      getProveedor: getProveedor,
      checkMonumentos : checkMonumentos,
      getWeekdayName: getWeekdayName
    };
  }])

;