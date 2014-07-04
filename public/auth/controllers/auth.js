'use strict';

angular.module('mean.controllers.login',[])

.factory('ngSocket',
    function(socketFactory) {
        return socketFactory();
    }
)

.controller('LoginCtrl', ['$scope', '$rootScope', '$http', '$location',
    function($scope, $rootScope, $http, $location) {
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
                    $location.url('/salary');
                }
            })

            .error(function() {
                $scope.loginerror = '亲，你输错了密码，再试一次吧！';
            });
        };
    }
])

.controller('RegisterCtrl', ['$scope', '$rootScope', '$http', '$location','Global',
    function($scope, $rootScope, $http, $location, Global) {
        $scope.user = Global.user;

        $scope.register = function() {
            $scope.usernameError = null;
            $scope.registerError = null;
            $http.post('/register', {
                _id: $scope.user._id,
                email: $scope.user.email,
                password: $scope.user.password,
                emailPassword: $scope.user.emailPassword,
                confirmPassword: $scope.user.confirmPassword,
                name: $scope.user.name
            })

            .success(function() {
                // authentication OK
                $scope.changepassError = 0;
                $rootScope.user = $scope.user;
                $rootScope.$emit('loggedin');
                $location.url('/');
            })

            .error(function(error) {
                // Error: authentication failed
                if (error === '亲，这个名字太抢手，换一个吧？') {
                    $scope.usernameError = error;
                } else {
                    $scope.changepassError = error;
                    for (var index in error) {
                        var err = error[index];
                        $scope.user[err.param + 'Error'] = err.msg;
                    }
                }
            });
        };
    }
])

angular.module('mean').controller('ChangepassCtrl', ['$scope', '$http', 'Global', '$rootScope', '$location',
    function($scope, $http, Global, $rootScope, $location) {
        $scope.user = Global.user;
        $scope.changepass = function() {
            $scope.changepassError = null;
            $http.post('/changepass', {
                _id: $scope.user._id,
                password: $scope.user.password,
                emailPassword: $scope.user.emailPassword,
                confirmPassword: $scope.user.confirmPassword
            })

            .success(function() {
                // authentication OK
                $scope.changepassError = 0;
                $rootScope.user = $scope.user;
                $rootScope.$emit('loggedin');
                $location.url('/');
            })

            .error(function(error) {
                $scope.changepassError = error;
                for (var index in error) {
                    var err = error[index];
                    $scope.user[err.param + 'Error'] = err.msg;
                }
            });
        }
    }
]);
