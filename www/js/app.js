var my_ver = 0.9;

var singlepage_app =

angular.module('singlepage_app', ['ionic', 'starter.controllers', 'starter.services', 'angularMoment'], function($httpProvider) {
  // Use x-www-form-urlencoded Content-Type
  $httpProvider.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded;charset=utf-8';

  /**
   * The workhorse; converts an object to x-www-form-urlencoded serialization.
   * @param {Object} obj
   * @return {String}
   */
  var param = function(obj) {
    var query = '', name, value, fullSubName, subName, subValue, innerObj, i;

    for(name in obj) {
      value = obj[name];

      if(value instanceof Array) {
        for(i=0; i<value.length; ++i) {
          subValue = value[i];
          fullSubName = name + '[' + i + ']';
          innerObj = {};
          innerObj[fullSubName] = subValue;
          query += param(innerObj) + '&';
        }
      }
      else if(value instanceof Object) {
        for(subName in value) {
          subValue = value[subName];
          fullSubName = name + '[' + subName + ']';
          innerObj = {};
          innerObj[fullSubName] = subValue;
          query += param(innerObj) + '&';
        }
      }
      else if(value !== undefined && value !== null)
        query += encodeURIComponent(name) + '=' + encodeURIComponent(value) + '&';
    }

    return query.length ? query.substr(0, query.length - 1) : query;
  };

  // Override $http service's default transformRequest
  $httpProvider.defaults.transformRequest = [function(data) {
    return angular.isObject(data) && String(data) !== '[object File]' ? param(data) : data;
  }];
})

.run(function($ionicPlatform, $rootScope, User, amMoment) {

    $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)

      amMoment.changeLocale('zh-tw');

      in_browser = (ionic.Platform.platform()=="macintel");
      if (in_browser) {
        connection_check_url = url_prefix + "/template/school";
      }
      console.log("#### x1 in_browser=" + in_browser + " " + ionic.Platform.platform());

      if (window.cordova && window.cordova.plugins.Keyboard) {
        cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      }
      if(window.StatusBar) {
        StatusBar.styleDefault();
      }

      console.log("#### x2");

      if (window.plugins && window.plugins.jPushPlugin) {
        window.plugins.jPushPlugin.openNotificationInAndroidCallback = function(data) {
          console.log("##### here 123");
          window.messageCallback(JSON.parse(data));
        }
        window.plugins.jPushPlugin.receiveMessageInAndroidCallback = function(data) {
          console.log("##### here 456 data=" + data);
          window.messageCallback(JSON.parse(data));
        }
      }

      console.log("## before call requestFileSystem");
      try {
        window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function success(fs) {
          User.configFS(fs);
          console.log("## fs=" + JSON.stringify(fs));
        }, function fail(err) {
          console.log("error calling User.configFS " + JSON.stringify(err));
        })
      }
      catch (e) {
        if (!in_browser)
          console.log(e);
      }
    });
})

.config(function($stateProvider, $urlRouterProvider) {

  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set up the various states which the app can be in.
  // Each state's controller can be found in controllers.js
  $stateProvider

  .state('login', {
    url: '/login',
    templateUrl: url_prefix + '/template/login',
    controller: "LoginCtrl"
  })

  .state('intros', {
    url: '/intros',
    templateUrl: "templates/intros.html"
  })

  .state('index_tabs', {
    url: '/index_tabs',
    templateUrl: "templates/index_tabs.html"
  })

  // setup an abstract state for the tabs directive
  .state('index_tabs.tab', {
    url: "/tab",
    abstract: true,
    templateUrl: url_prefix + '/template/tabs'
  })

  .state('index_tabs.tab.message', {
      url: '/message',
      views: {
        'tab-message': {
          templateUrl: 'templates/tab-message.html',
          controller: 'MessageCtrl'
        }
      }
    })
    .state('index_tabs.tab.message-channel', {
      url: '/message/:ucId',
      views: {
        'tab-message': {
          templateUrl: 'templates/channel-detail.html',
          controller: 'ChannelDetailCtrl'
        }
      }
    })
    .state('index_tabs.tab.message-channel-message', {
      url: '/message/:ucId/:umId',
      views: {
        'tab-message': {
          templateUrl: 'templates/message-detail.html',
          controller: 'MessageDetailCtrl'
        }
      }
    })

  .state('index_tabs.tab.school', {
      url: '/school',
      views: {
        'tab-school': {
          templateUrl: url_prefix + '/template/school',
          controller: 'SchoolCtrl'
        }
      }
    })

  .state('index_tabs.tab.app', {
    url: '/app',
    views: {
      'tab-app': {
        templateUrl: url_prefix + '/template/app',
        controller: 'AppCtrl'
      }
    }
  });

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/login');

})

.constant('angularMomentConfig', {
  timezone: 'Asia/Tokyo' // e.g. 'Europe/London'
});

window.messageCallback = function(data){
  console.log("#data="+data);
  console.log("#data.extras=" + data.extras);
  if (data && (data.aps || data.extras) ) {
    console.log("in message callback1");
    var $body = angular.element(document.body);
    var $rootScope = $body.scope().$root;
    $rootScope.receiveNewMessage(); // has $apply inside
    $rootScope.$apply();
  }
  else
    console.log("error:" + data);
}
