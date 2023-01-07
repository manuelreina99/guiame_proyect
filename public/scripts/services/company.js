'use strict';

angular
  .module('guiame')

  .factory('CompanyService', ['$http', 'baseURL',
    function($http, baseURL) {

    function getReservas(fecha){
      fecha = fecha.toISOString().substr(0,10);
      //console.log('getReservas-fecha:', fecha);
      return $http.get(baseURL + '/companies/reservaguias/' + fecha);
    }

    function upsertReserva(reserva) {
      reserva.fecha = reserva.fecha.toISOString().substr(0,10);
      console.log('upsertReserva-fecha  :', reserva.fecha);
      console.log('upsertReserva-guia   :', reserva.guia);
      console.log('upsertReserva-jornada:', reserva.jornada);
      return $http.put(baseURL + '/companies/reservaguias', {fecha:reserva.fecha, guia:reserva.guia, jornada:reserva.jornada} );
    }

    function deleteReserva(fecha, guia, fijo, jornada){
      fecha = fecha.toISOString().substr(0,10);
      console.log('deleteReserva-fecha  :', fecha);
      console.log('deleteReserva-guia   :', guia);
      console.log('deleteReserva-fijo   :', fijo);
      console.log('deleteReserva-jornada:', jornada);
      return $http.post(baseURL + '/companies/reservaguias', {fecha:fecha, guia:guia, fijo:fijo, jornada:jornada} ); 
    }

    function getGuiasAsignables(fecha) {
      fecha = (fecha ? fecha.toISOString().substr(0,10) : null);
      console.log('getGuiasAsignables-fecha  :', fecha);
      return $http.post(baseURL + '/companies/guiasasignables', {fecha: fecha});
    }

    function getDefectoGuardias(){
      return $http.get(baseURL + '/companies/defectoguardias');
    }

    function getExcepcionesGuardias(){
      return $http.get(baseURL + '/companies/excepcionesguardias');
    }

    function saveExcepcionGuardias(excepcion){
      console.log('excepcion.fechaini:',excepcion.fechaini.toISOString());
      console.log('excepcion.fechaini:',typeof(excepcion.fechaini));
      return $http.put(baseURL + '/companies/excepcionesguardias', {excepcion: excepcion});
    }

    function deleteExcepcionGuardias(idguardia){
      return $http.delete(baseURL + '/companies/excepcionesguardias/' + idguardia);
    }

    function saveDefectoGuardias(defectoGuardias){
      console.log('saveDefectoGuardias:', defectoGuardias);
      return $http.put(baseURL + '/companies/defectoguardias', {fechainicio: defectoGuardias.fechainicio, usuarios: defectoGuardias.usuarios});
    }

    function getUsuarioDeGuardia(fecha){
      return $http.put(baseURL + '/companies/quienestadeguardia', {fechaini: fecha});
    }

    function getEstadisticas(params){
      return $http.put(baseURL + '/companies/estadisticas', {params: params});
    }

    function getApuntes(){
      return $http.get(baseURL + '/companies/appingreso');
    }

    function addApunte(apunte){
      return $http.put(baseURL + '/companies/appingreso', {apunte: apunte});
    }

    function getEmpresas(){
      return $http.get(baseURL + '/companies');
    }

    function setEmpresa(idEmpresa) {
      return $http.put(baseURL + '/companies/setempresa', {id: idEmpresa});
    }

    return {
      getReservas: getReservas,
      upsertReserva: upsertReserva,
      deleteReserva: deleteReserva,
      getGuiasAsignables: getGuiasAsignables,
      getDefectoGuardias: getDefectoGuardias,
      saveDefectoGuardias: saveDefectoGuardias,
      getUsuarioDeGuardia: getUsuarioDeGuardia,
      getExcepcionesGuardias: getExcepcionesGuardias,
      saveExcepcionGuardias: saveExcepcionGuardias,
      deleteExcepcionGuardias: deleteExcepcionGuardias,
      getEstadisticas: getEstadisticas,
      getApuntes: getApuntes,
      addApunte: addApunte,
      getEmpresas: getEmpresas,
      setEmpresa: setEmpresa
    };
  }])

;