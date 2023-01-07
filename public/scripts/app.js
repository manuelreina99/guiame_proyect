'use strict';

angular.module('guiame', ['ui.router','ngResource','ui.bootstrap','angularNotify','ngDialog','chart.js'])
.constant('baseURL', '')
.constant('ROL_READ'  , '0')
.constant('ROL_WRITE' , '1')
.constant('ROL_SERIE2', '3')
.constant('ROL_BOSS'  , '6')
.constant('ROL_ADMIN' , '9')
.constant('weekdays', ['D','L','M','X','J','V','S'])
.config(function($stateProvider, $urlRouterProvider, $locationProvider) {
        $stateProvider

            // route for the home page
            .state('app', {
                url:'/',
                views: {
                    'header': {
                        templateUrl : 'views/header.html',
                        controller  : 'HeaderController'
                    },
                    'content': {
                        templateUrl : 'views/login.html',
                        controller  : 'LoginController'
                    },
                    // 'footer': {
                    //     templateUrl : 'views/footer.html',
                    // }
                }
            })

            .state('app.grupos', {
                url:'grupos',
                views: {
                    'content@': {
                        templateUrl : 'views/grupos.html',
                        controller  : 'GruposController'
                    },
                }
            })

            .state('app.grupo', {
                url:'grupo?id&fecha',
                views: {
                    'content@': {
                        templateUrl : 'views/grupo.html',
                        controller  : 'GrupoController'
                    },
                }
            })

            .state('app.reservaguias', {
                url:'reservaguias',
                views: {
                    'content@': {
                        templateUrl : 'views/reservaguias.html',
                        controller  : 'ReservaGuiasController'
                    },
                }
            })

            .state('app.reservagrupos', {
                url:'reservagrupos',
                views: {
                    'content@': {
                        templateUrl : 'views/reservagrupos.html',
                        controller  : 'ReservaGruposController'
                    },
                }
            })

            .state('app.facturas', {
                url:'facturas',
                views: {
                    'content@': {
                        templateUrl : 'views/facturas.html',
                        controller  : 'FacturasController'
                    },
                }
            })

            .state('app.factura', {
                url:'factura?id&auto&escompra',
                views: {
                    'content@': {
                        templateUrl : 'views/factura.html',
                        controller  : 'FacturaController'
                    },
                }
            })

            .state('app.gastos', {
                url:'facturas?escompra',
                views: {
                    'content@': {
                        templateUrl : 'views/facturas.html',
                        controller  : 'FacturasController'
                    },
                }
            })

            .state('app.codigos', {
                url:'codigos',
                views: {
                    'content@': {
                        templateUrl : 'views/codigos.html',
                        controller  : 'CodigosController'
                    },
                }
            })

            .state('app.fechas', {
                url:'fechas?esfestivo',
                views: {
                    'content@': {
                        templateUrl : 'views/fechas.html',
                        controller  : 'FechasController'
                    },
                }
            })

            .state('app.monumentos', {
                url:'monumentos',
                views: {
                    'content@': {
                        templateUrl : 'views/monumentos.html',
                        controller  : 'MonumentosController'
                    },
                }
            })

            .state('app.guardias', {
                url:'guardias',
                views: {
                    'content@': {
                        templateUrl : 'views/guardias.html',
                        controller  : 'GuardiasController'
                    },
                }
            })

            .state('app.tarifas', {
                url:'tarifas?codigotarifa',
                views: {
                    'content@': {
                        templateUrl : 'views/tarifas.html',
                        controller  : 'TarifasController'
                    },
                }
            })

            // route for the home page
            .state('app.home', {
                url:'home',
                views: {
                    'content@': {
                        templateUrl : 'views/login.html',
                        controller  : 'LoginController'
                    },
                }
            })

            .state('app.miperfil', {
                url:'miperfil',
                views: {
                    'content@': {
                        templateUrl : 'views/miperfil.html',
                        controller  : 'MiPerfilController'
                    },
                }
            })

            .state('app.estadisticas', {
                url:'estadisticas',
                views: {
                    'content@': {
                        templateUrl : 'views/estadisticas.html',
                        controller  : 'EstadisticasController'
                    },
                }
            })

            .state('app.apuntes', {
                url:'apuntes',
                views: {
                    'content@': {
                        templateUrl : 'views/apuntes.html',
                        controller  : 'ApuntesController'
                    },
                }
            })

            .state('app.markasreaded', {
                url:'markasreaded?idgrupo&idfrom&from',
                views: {
                    'content@': {
                        templateUrl : 'views/markasreaded.html',
                        controller  : 'MarkAsReadedController'
                    },
                }
            })

            .state('app.forgotpassword', {
                url:'forgotpassword',
                views: {
                    'content@': {
                        templateUrl : 'views/forgotpassword.html',
                        controller  : 'ForgotPasswordController'
                    },
                }
            })

            .state('app.requestnewpassword', {
                url:'requestnewpassword?token',
                views: {
                    'content@': {
                        templateUrl : 'views/requestnewpassword.html',
                        controller  : 'RequestNewPasswordController'
                    },
                }
            })

            ;

        $urlRouterProvider.otherwise('/');
        $locationProvider.hashPrefix('');
    })
;
