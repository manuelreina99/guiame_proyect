'use strict';

angular
  .module('guiame')

  .factory('ErrorService', ['AuthService', '$location', '$rootScope', '$uibModal',
    function(AuthService, $location, $rootScope, $uibModal) {

    function showError(response) {
      console.log('err response:' + JSON.stringify(response));
      var text = '';
      if (response.data && response.data.error){
        text = response.data.error;
        if (response.data.secondline){
          text = text + ' ' + response.data.secondline;
        }
        if (response.data.reason){
          text = text + ' ' + response.data.reason;
        }
      }
      if(response.status != 403){
        $rootScope.errorMessage = text;
        $rootScope.modalErrorInstance = $uibModal.open($rootScope.modalErrorOptions);
        $rootScope.modalErrorInstance.result.then(function (selectedItem) {
        }, function () {
          console.log('Modal dismissed at: ' + new Date());
        });
      }
      else{
        $location.path('/');
      }
    }

    function showTooltip ($scope, notify){
        var top = $(document).scrollTop() + 50;
        var right = $(document).scrollLeft();
        $scope.notifyBarStyle = {position:'absolute', top: top + 'px', right: -right + 'px'};
        $scope.$emit('notify', notify);
    }

    return {
      showError: showError,
      showTooltip: showTooltip
    };
  }])

;