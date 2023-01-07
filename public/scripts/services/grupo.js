'use strict';

angular
  .module('guiame')

  .factory('GrupoService', ['$http', 'baseURL',
    function($http, baseURL) {

    function getGrupo(id) {
      //console.log('getProveedor ' + id);
      return $http.get(baseURL + '/grupos/' + id);
    }

    function getGrupos(filtro) {
      //console.log('getGrupos:', filtro);
      return $http.put(baseURL + '/grupos/filter', { filtro : filtro });
    }

    function saveGrupo(grupo) {
      console.log('saveGrupo ' + JSON.stringify(grupo));
      return $http.put(baseURL + '/grupos', { grupo : grupo });
    }

    function checkGuia(guia, fecha, idiomas, idgrupo) {
      return $http.put(baseURL + '/grupos/guia/check', { guia : guia, fecha : fecha, idiomas : idiomas, idgrupo : idgrupo });
    }

    function deleteGrupo(idgrupo) {
      return $http.delete(baseURL + '/grupos/' + idgrupo);
    }

    function generateSerie(grupos){
      console.log('generateSerie:', grupos);
      return $http.put(baseURL + '/grupos/generateserie', { grupos: grupos });
    }

    function markAsReaded(idgrupo, idfrom){
      //console.log('markAsReaded(idgrupo, idfrom):' + idgrupo + ',' + idfrom + '.');
      return $http.put(baseURL + '/grupos/markasreaded', { idgrupo: idgrupo, idfrom: idfrom });
    }

    function clonarGrupo(idgrupo, num){
      return $http.put(baseURL + '/grupos/clonar', { idgrupo: idgrupo, num: num });
    }

    function notificarGuia(idgrupo, num){
      return $http.put(baseURL + '/grupos/sendpushtoguia', { idgrupo: idgrupo });
    }

    return {
      getGrupo: getGrupo,
      getGrupos: getGrupos,
      saveGrupo: saveGrupo,
      checkGuia: checkGuia,
      deleteGrupo: deleteGrupo,
      generateSerie: generateSerie,
      markAsReaded: markAsReaded,
      clonarGrupo: clonarGrupo,
      notificarGuia: notificarGuia
    };
  }])

;