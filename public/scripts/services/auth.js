'use strict';

angular
  .module('guiame')

  .factory('AuthService', ['$q', '$rootScope', '$http', '$localStorage', 'baseURL', '$location', 'ROL_READ', 'ROL_WRITE', 'ROL_SERIE2', 'ROL_BOSS', 'ROL_ADMIN',
    function($q, $rootScope, $http, $localStorage, baseURL, $location, ROL_READ, ROL_WRITE, ROL_SERIE2, ROL_BOSS, ROL_ADMIN) {

    function login(loginData) {
      loginData.nombre = loginData.username;
      loadRoles(ROL_READ, ROL_WRITE, ROL_SERIE2, ROL_BOSS, ROL_ADMIN);
      $http.post(baseURL + '/users/login', loginData).then(
        function successCallback(response) {
          console.log(response.data);
          $rootScope.currentUser = getUserFrom(response.data);
          storeCurrentUser();
          $http.defaults.headers.common['x-access-token'] = response.data.tokenId;
          $http.defaults.headers.common['client-timezone'] = Intl.DateTimeFormat().resolvedOptions().timeZone;
          $rootScope.$broadcast('login:Successful');
        }, function errorCallback(response) {
          console.log('AuthService.login error:' + JSON.stringify(response));
          if(response.status == '401'){
            $rootScope.$broadcast('login:Deactivated');
          }
          else{
            $rootScope.$broadcast('login:Unsuccessful');
          }
        });
    }

    function loadRoles(read, write, serie2, boss, admin){
      $rootScope.ROL_READ   = read;
      $rootScope.ROL_WRITE  = write;
      $rootScope.ROL_SERIE2 = serie2;
      $rootScope.ROL_BOSS   = boss;
      $rootScope.ROL_ADMIN  = admin;
    }

    function getUserFrom(data){
      return {
              id: data.idusuario,
              username: data.nombre,
              rol: data.rol,
              idprofilepicture: data.idprofilepicture,
              empresa: {id: data.idultimaempresa,
                        nombre: data.nombreempresa,
                        showFullMenus: data.fullmenus,
                        tienda: data.tienda,
                        margenventa: data.margenventa,
                        costetransporte: data.costetransporte,
                        costeporte: data.costeporte,
                        minimoporte : data.minimoporte,
                        latitud: data.latitud,
                        longitud: data.longitud,
                        idprofilepicture: data.empresaidprofilepicture},
              irpf: data.irpf,
              diasstock0: data.diasstock0,
              tokenId: data.tokenId,
              tokenExpiresIn: data.tokenExpiresIn,
              numempresas: data.numempresas,
              facturadefaulttext: data.facturadefaulttext
            };
    }

    function isAuthenticated() {
      var userinfo = $localStorage.getObject('userinfo', null);
      if (userinfo && !isTokenExpired(userinfo)) {
        $rootScope.currentUser = userinfo;
        if (userinfo.tokenId){
          $http.defaults.headers.common['x-access-token'] = userinfo.tokenId;
          $http.defaults.headers.common['client-timezone'] = Intl.DateTimeFormat().resolvedOptions().timeZone;
          return true;
        }
        else{
          return false;
        }
      }
      else{
        logout();
        return false;
      }
    }

    var isTokenExpired = function(userinfo){
      var result = true;
      if(!userinfo || !userinfo.tokenExpiresIn){
        result = true;
      }
      else{
        var now = new Date().toISOString();
        if(now <= userinfo.tokenExpiresIn){
          result = false
        }
        else{
          result = true;
        }
      }
      return result;
    }

    function getUser() {
      if($rootScope.currentUser){
        return $rootScope.currentUser;
      }
    }

    function setEmpresa(data) {
      $rootScope.currentUser = getUserFrom(data);
      storeCurrentUser();
    }

    function storeCurrentUser() {
      $localStorage.storeObject('userinfo', $rootScope.currentUser);
    }

    function logout() {
      if($rootScope.currentUser){
        $rootScope.currentUser.tokenId = undefined;
        storeCurrentUser();
      }
      $rootScope.currentUser = undefined;
      $http.defaults.headers.common['x-access-token'] = undefined;
      $http.defaults.headers.common['client-timezone'] = undefined;
      $localStorage.remove('filtro');
      $location.path('/app');
    }

    function subscribePush(pushSubscription) {
      return $http.post(baseURL + '/users/push/subscribe', {pushSubscription: pushSubscription});
    }

    function unsubscribePush() {
      return $http.post(baseURL + '/users/push/unsubscribe');
    }

    function testPush() {
      return $http.get(baseURL + '/users/push/test');
    }

    function getFilters(){
      var filtro = $localStorage.getObject('filtro', null);
      if (filtro) {
        if(filtro.fechaini){
          filtro.fechaini = new Date(filtro.fechaini);
        }
        if(filtro.fechafin){
          filtro.fechafin = new Date(filtro.fechafin);
        }
      }
      else{
        filtro =
         { fechaini : new Date(), fechafin : new Date(),
           agencia: null, guia: null, idioma: null, ref: null,
           facturado : 'todos', formapago: 'todos', tipofactura: 'todos', confirmado: 'todos', anulado : 'todos',
           basico: true, page: 1, numpages : 0 };
      }
      return filtro;
    }

    function getFacturaFilters(escompra){
      if(escompra){
        var filtro = $localStorage.getObject('gastofiltro', null);
      }
      else{
        var filtro = $localStorage.getObject('facturafiltro', null);
      }

      if (filtro) {
        if(filtro.fechaini){
          filtro.fechaini = new Date(filtro.fechaini);
        }
        if(filtro.fechafin){
          filtro.fechafin = new Date(filtro.fechafin);
        }
      }
      else{
        filtro =
          { fechaini : new Date(), fechafin : new Date(), escompra: escompra, pagos: '0', basico: true}; //emisor, tipofactura
      }
      return filtro;
    }

    function setFilters(filtro){
      $localStorage.storeObject('filtro',filtro);
    }

    function setFacturaFilters(filtro, escompra){
      if(escompra){
        $localStorage.storeObject('gastofiltro',filtro);
      }
      else{
        $localStorage.storeObject('facturafiltro',filtro);
      }
    }

    function changePass(newPass){
      return $http.put(baseURL + '/users/password', {password: newPass});
    }

    function getUserInfoFromServer(idusuario){
      return $http.get(baseURL + '/users/' + idusuario);
    }

    function updateUser(misdatos){
      return $http.post(baseURL + '/users', {nombrecompleto: misdatos.nombrecompleto, email: misdatos.email, facturadefaulttext: misdatos.facturadefaulttext});
    }

    function forgotPassword(email){
      return $http.post(baseURL + '/users/forgot', { email: email });
    }

    function requestNewPassword(token){
      return $http.get(baseURL + '/users/reset/' + token);
    }

    return {
      login: login,
      logout: logout,
      isAuthenticated: isAuthenticated,
      getUser: getUser,
      setEmpresa: setEmpresa,
      subscribePush: subscribePush,
      unsubscribePush: unsubscribePush,
      testPush: testPush,
      getFilters: getFilters,
      setFilters: setFilters,
      getFacturaFilters: getFacturaFilters,
      setFacturaFilters: setFacturaFilters,
      storeCurrentUser: storeCurrentUser,
      changePass: changePass,
      getUserInfoFromServer: getUserInfoFromServer,
      updateUser: updateUser,
      forgotPassword: forgotPassword,
      requestNewPassword: requestNewPassword
    };
  }])

  .factory('$localStorage', ['$window', function ($window) {
      return {
          store: function (key, value) {
              $window.localStorage[key] = value;
          },
          get: function (key, defaultValue) {
              return $window.localStorage[key] || defaultValue;
          },
          remove: function (key) {
              $window.localStorage.removeItem(key);
          },
          storeObject: function (key, value) {
              $window.localStorage[key] = JSON.stringify(value);
          },
          getObject: function (key, defaultValue) {
              return JSON.parse($window.localStorage[key] || defaultValue);
          }
      }
  }])
;