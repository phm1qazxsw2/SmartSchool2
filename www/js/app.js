angular.module('starter', ['ionic', 'starter.controllers', 'starter.services'], function($httpProvider) {
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


.run(function($ionicPlatform, User) {

    $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }

    if (window.plugins && window.plugins.jPushPlugin) {

      window.plugins.jPushPlugin.openNotificationInAndroidCallback = function(data) {
        console.log("##### here 123");
        window.messageCallback(JSON.parse(data));
      }
      window.plugins.jPushPlugin.receiveMessageInAndroidCallback = function(data) {
        console.log("##### here 456 data=" + data);
        window.messageCallback(JSON.parse(data));
      }

      window.plugins.jPushPlugin.init();
      window.plugins.jPushPlugin.setDebugMode(true);
      window.plugins.jPushPlugin.getRegistrationID(function(data){
        try{
          console.log("## 4 registrationID=" + data + "#");

          User.setConfig({
            uuid:ionic.Platform.device().uuid,
            jpush_id:data,
            phone:null
          },
          function success() {
            console.log("successfully calling front/user/set");
          },
          function error(data, status) {
            console.log("error calling setuser : " + data + " status=" + status);
          })
        }
        catch(exception){
          console.log("## 5");
          console.log(exception);
        }
      });
      console.log("device=" + JSON.stringify(ionic.Platform.device().uuid));
    }
  });
})

.config(function($stateProvider, $urlRouterProvider) {

  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set up the various states which the app can be in.
  // Each state's controller can be found in controllers.js
  $stateProvider

  // setup an abstract state for the tabs directive
  .state('tab', {
    url: "/tab",
    abstract: true,
    templateUrl: "templates/tabs.html",
    controller:'TabCtrl'
  })

  .state('signin', {
    url: '/signin',
    templateUrl:'templates/signin.html',
    controller:'SignInCtrl'
  })

  .state('tab.quiz', {
      url: '/quiz',
      views: {
        'tab-quiz': {
          templateUrl: 'templates/tab-quiz.html',
          controller: 'QuizCtrl'
        }
      }
    })
    .state('tab.quiz-detail', {
      url: '/quiz/:quizId',
      views: {
        'tab-quiz': {
          templateUrl: 'templates/quiz-detail.html',
          controller: 'QuizDetailCtrl'
          //,
          //resolve : {
          //  pageTitle : function(TitleService) {
          //    return TitleService.getTitle()
          //  }
          //}
        }
      }
    })
    .state('tab.quiz-record', {
      url: '/quiz/:quizId/record',
      views: {
        'tab-quiz': {
          templateUrl: 'templates/quiz-record.html',
          controller: 'QuizRecordCtrl'
        }
      }
    })

  .state('tab.message', {
      url: '/message',
      views: {
        'tab-message': {
          templateUrl: 'templates/tab-message.html',
          controller: 'MessageCtrl'
        }
      }
    })
    .state('tab.message-channel', {
      url: '/message/:channelId',
      views: {
        'tab-message': {
          templateUrl: 'templates/channel-detail.html',
          controller: 'ChannelDetailCtrl'
        }
      }
    })
    .state('tab.message-channel-message', {
      url: '/message/:channelId/:messageId',
      views: {
        'tab-message': {
          templateUrl: 'templates/message-detail.html',
          controller: 'MessageDetailCtrl'
        }
      }
    })

  .state('tab.calendar', {
      url: '/calendar',
      views: {
        'tab-calendar': {
          templateUrl: 'templates/tab-calendar.html',
          controller: 'CalendarCtrl'
        }
      }
    })

  .state('tab.account', {
    url: '/account',
    views: {
      'tab-account': {
        templateUrl: 'templates/tab-account.html',
        controller: 'AccountCtrl'
      }
    }
  });

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/signin');

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
