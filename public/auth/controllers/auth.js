'use strict';

angular.module('mean.controllers.login', ['btford.socket-io'])

.factory('ngSocket',
    function(socketFactory) {
        return socketFactory();
    }
)

.controller('LoginCtrl', ['$scope', '$rootScope', '$http', '$location', 'ngSocket',
    function($scope, $rootScope, $http, $location, ngSocket) {
        // This object will be filled by the form
        $scope.user = {};

        // Register the login() function
        $scope.login = function() {
            $http.post('/login', {
                email: $scope.user.email,
                password: $scope.user.password
            })
                .success(function(response) {
                    // authentication OK
                    $scope.loginError = 0;
                    $rootScope.user = response.user;
                    $rootScope.$emit('loggedin');
                    if (response.redirect) {
                        if (window.location.href === response.redirect) {
                            //This is so an admin user will get full admin page
                            window.location.reload();
                        } else {
                            window.location = response.redirect;
                        }
                    } else {
                        $location.url('/');
                    }
                })
                .error(function() {
                    $scope.loginerror = 'Authentication failed.';
                });
        };

        $scope.test = function() {
            ngSocket.emit('send-msg', 'hello socket.io!');
        };

        ngSocket.on('back-msg', function(data) {
            alert(data);
        });
    }
])

.controller('RegisterCtrl', ['$scope', '$rootScope', '$http', '$location',
    function($scope, $rootScope, $http, $location) {
        $scope.user = {};

        $scope.register = function() {
            $scope.usernameError = null;
            $scope.registerError = null;
            $http.post('/register', {
                email: $scope.user.email,
                password: $scope.user.password,
                confirmPassword: $scope.user.confirmPassword,
                username: $scope.user.username,
                name: $scope.user.name
            })
                .success(function() {
                    // authentication OK
                    $scope.registerError = 0;
                    $rootScope.user = $scope.user;
                    $rootScope.$emit('loggedin');
                    $location.url('/');
                })
                .error(function(error) {
                    // Error: authentication failed
                    if (error === 'Username already taken') {
                        $scope.usernameError = error;
                    } else {
                        $scope.registerError = error;
                    }
                });
        };
    }
]);