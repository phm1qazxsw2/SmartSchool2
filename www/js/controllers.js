

angular.module('starter.controllers', ['starter.services'])

.controller('RootCtrl', function($scope, $state, Audio, Notice, $rootScope, $ionicLoading, Network, User) {

  $rootScope.statusbar = { show:false, message:null };
  $rootScope.channels = [];  // used by tab.message (MessageCtrl)
  $rootScope.badge = {
     quiz:0,
     message:0
  };
  $rootScope.cur_page = {
     state:'',
     channel_id:0
  };

  $rootScope.cur_channel = {
    messages:null
  };

  $rootScope.initPush = function() {
    window.plugins.jPushPlugin.init();
    window.plugins.jPushPlugin.setDebugMode(true);
    window.plugins.jPushPlugin.getRegistrationID(function(data){
      try{
        console.log("## 4 registrationID=" + data + "#");
        Network.check(function netok() {
          console.log("## 4.1 network ok, calling /user/setconfig");
          User.setConfig({
                uuid:ionic.Platform.device().uuid,
                jpush_id:data,
                phone:null
              },
              function success() {
                console.log("successfully calling front/user/set");
              },
              function error(data) {
                console.log("error calling setuser : " + data + " status=" + status);
                $rootScope.showError((data)?data:{code:'f003', error:'setuser not available'});
              })
        }, function netfail() {
          $rootScope.showError(network_err);
        })
      }
      catch(exception){
        console.log("## 5 " + exception);
      }
    });
  }

  $rootScope.receiveNewMessage = function() {
    $rootScope.statusbar.message = "收到新的通知！";
    $rootScope.statusbar.show = true;
    $rootScope.refreshChannels(function(diff_channels) {
      for (var i = 0; i < diff_channels.length; i++) {
        // 更新新通知的 cache (最后传 true 就是
        var diff_id = diff_channels[i].id;
        Notice.getChannelMessages(diff_id, function(cache) {
          // 如果刚好现在的页面就是这个channel的message页
          var t1 = ($rootScope.cur_page.state == 'tab.message-channel');
          var a = $rootScope.cur_page.channel_id;
          var b = diff_id;
          var t2 = (a==b);
          if (t1 && t2) {
            for (var j=0; j<$rootScope.channels.length; j++) {
              if ($rootScope.channels[j].id == diff_id) {
                $rootScope.channels[j].messages = cache.messages;
                $rootScope.cur_channel.messages = cache.messages;
                $rootScope.$apply();
              }
            }
          }
        }, null, true /*force to server*/);
      }
    });
    setTimeout(function() {
      $rootScope.statusbar.show = false;
      $rootScope.$apply();
    }, 6000)
  };

  $rootScope.decreaseChannelUnread = function(channel_id) {
     for (var i=0; i<$rootScope.channels.length; i++) {
       if ($rootScope.channels[i].id==channel_id) {
         if ($rootScope.channels[i].unread>0)
            $rootScope.channels[i].unread --;
         if ($rootScope.badge.message>0)
            $rootScope.badge.message --;
         break;
       }
     }
  };

  $rootScope.showError = function (errobj) {
    if (!errobj || !errobj.code)
      errobj = { code:'x999' };

    if (errobj.code=='e001') {
      alert('Network is down!');
    }
    else if (errobj.code=='e002') {
      alert("Cannot play, not finish recording yet");
    }
    else if (errobj.code=='e003') {
      alert("Upload error");
    }
    else if (errobj.code=='e004') {
      alert('error:channel message cache is empty');
    }
    else if (errobj.code=='e005') {
      alert('play source is empty');
    }
    else if (errobj.code=='e006') {
      alert("Cannot play, not finish recording yet");
    }
    else if (errobj.code=='e007') {
      alert('error in playing');
    }
    else if (errobj.code=='e008') {
      alert('object not found');
    }
    else if (errobj.code=='e999') {
      alert('Unknown error!');
    }
    else if (errobj.code=='f001') {
      alert('api error: wrong parameter!');
    }
    else if (errobj.code=='f002') {
      alert('api error: user not found!');
    }
    else if (errobj.code=='f003') {
      alert('api error: service not available!');
    }
    else if (errobj.code=='f998') {
      alert('api error: unknown!');
    }
    else if (errobj.code=='b998') {
      alert('server unknown error!');
    }
    else {
      alert('error:' + JSON.stringify(errobj));
    }
    return;
  }

  $rootScope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams){
    Audio.stop();
    //console.log("##state=" + JSON.stringify(toState) + "params=" + JSON.stringify(toParams));
    $rootScope.cur_page.state = toState.name;
    if (toState.name=='tab.message-channel') {
      $rootScope.cur_page.channel_id = toParams.channelId;
    }
  })

  $rootScope.refreshChannels = function(callback, error_cb) {
    var org_unread_map = new Array;
    for (var i=0; i<$rootScope.channels.length; i++) {
      var c = $rootScope.channels[i];
      org_unread_map[c.id] = c.unread;
    }
    var diffs = new Array;
    Notice.getChannels(function(channels){
      $rootScope.channels = channels;
      var unread = 0;
      for(var i=0;i<channels.length; i++) {
        unread += channels[i].unread;
        var org_unread = org_unread_map[channels[i].id];
        //console.log(channels[i].subtitle + " org_unread=" + org_unread + " unread=" + channels[i].unread)
        if (org_unread!=channels[i].unread) {
          diffs.push(channels[i]);
        }
      }
      $rootScope.badge.message = unread;
      $rootScope.hideLoading();
      $rootScope.$broadcast('scroll.refreshComplete');
      callback && callback(diffs);
    },
    function error(data, status) {
      $rootScope.hideLoading();
      $rootScope.$broadcast('scroll.refreshComplete');
      error_cb && error_cb(data);
    });
  };

  $rootScope.showLoading = function() {
    $ionicLoading.show({
      template: 'Loading...'
    });
    setTimeout(function(){
      $rootScope.hideLoading();
    },5000)
  };
  $rootScope.hideLoading = function(){
    $ionicLoading.hide();
  };

  $rootScope.badgestyle = 'badge-assertive';
  console.log("##in RootCtrl");
})

.controller('SignInCtrl', function($scope, $state) {
  $scope.signin = function() {
    $state.go('tab.quiz');
  }
})

.controller('CalendarCtrl', function() {
  console.log("in calendar controller");
})

.controller('QuizCtrl', function($scope, $rootScope, $http, Quiz) {
  Quiz.all(function(quizzes) {
      $scope.quizzes = quizzes;
  });

  $scope.$on('$ionicView.loaded', function(){
    // 一開始進來更新下，這裡QuizCtrl 作為進來第一個view
    $rootScope.initPush();
    setTimeout(function(){$rootScope.refreshChannels();},1);
  })
})

.controller('QuizRecordCtrl', function($scope, $ionicPlatform, $ionicLoading, $stateParams, Quiz) {

  $scope.$on('$ionicView.loaded', function() {
    console.log("## in loaded");
    Quiz.get($stateParams.quizId, function(quiz) {
      $scope.quiz = quiz;
      $scope.record_style = 'ion-record';
      console.log("in init");
      $scope.state = "init";
    });
  })


})

.controller('QuizDetailCtrl', function($scope, $ionicPlatform, $ionicLoading, $stateParams,
                                       Quiz, Audio, Record, $rootScope) {

  // $scope.pageTitle = pageTitle;
  Quiz.get($stateParams.quizId, function(quiz) {
    $scope.quiz = quiz;
    $scope.progress = { play:0 };
    $scope.play_style = 'ion-play';

    $scope.record_style = 'ion-record';
    if (quiz.status==0 || quiz.status==1)
      $scope.record_state = "init";
    else if (quiz.status==2 || quiz.status==3)
      $scope.record_state = "recorded";
  });

  $scope.$on("$destroy", function(){
    Audio.stop();
  });

  var playStatus = 0;
  $scope.doPlayOrPause = function(src) {
    if (playStatus==0) { // 还没开始
      $scope.play_style = 'ion-pause';
      $scope.play(src);
      playStatus = 1;
    }
    else if (playStatus==1) { // 正在播放
      Audio.pause();
      $scope.play_style = 'ion-play';
      playStatus = 2;
    }
    else if (playStatus==2) { // 暂停中
      Audio.resume();
      $scope.play_style = 'ion-pause';
      playStatus = 1;
    }
    console.log("## playStatus=" + playStatus);
  };

  var is_dragging = false;
  $scope.onDrag = function() {
    is_dragging = true;
  };

  $scope.onRelease = function(e) {
    is_dragging = false;
    if (my_duration==0) {
      console.log("my_duration is 0");
      return;
    }
    var ratio = 0;
    var x = event.gesture.touches[0].clientX;
    if (x<70) {
      ratio = 0;
    }
    else if (x>236) {
      ratio = 1;
    }
    else {
      ratio = ((x-70)/(236-70));
    }
    var msecs = my_duration * ratio * 1000;
    Audio.seek(msecs);
  };

  $scope.stop = function() {
    Audio.stop();
    $scope.play_style = 'ion-play';
    setTimeout(function(){
      $scope.progress.play = 0;
      $scope.$apply();
    },100);
  };

  var my_duration = 0;
  $scope.play = function(src) {
    Audio.play(src, function(duration) {
      my_duration = duration;
    },
    function(progress) {
      if (my_duration>0 && !is_dragging) {
        $scope.progress.play = Math.ceil((progress / my_duration) * 100);
        $scope.$apply();
      }
    },
    function finish() {
      console.log("## in finish");
      my_duration = 0;
      $scope.progress.play = 0;
      $scope.play_style = 'ion-play';
      playStatus = 0;
      Quiz.setPlayed($scope.quiz);
      $scope.$apply();
    },
    function error(err) {
      $rootScope.showError(err);
    });
  };

  // recording below
  var recording = null;
  var last_recording = "";
  $scope.startRecord = function () {
    Record.record(
      $scope.quiz,
      function success() {},
      function error(err) {
        $rootScope.showError(err);
    });
    $scope.record_state = "recording";
  };

  $scope.stopRecord = function () {
    Record.stop();
    $scope.record_state = "recorded";
    Quiz.setRecorded($scope.quiz);
  };

  $scope.redoRecord = function () {
    $scope.record_state = "init";
  };
  //
  $scope.playRecord = function() {
    Record.play($scope.quiz, null, null, function finish() {
      $scope.record_state = "recorded";
      $scope.$apply();
    },
    function error(err){
      $rootScope.showError(err);
    });
    $scope.record_state = "playing";
  };

  $scope.pausePlay = function() {
    Audio.pause();
    $scope.record_state = "paused";
  };

  $scope.resumePlay = function() {
    Audio.resume();
    $scope.record_state = "playing";
  };

  $scope.stopPlay = function() {
    Audio.stop();
    $scope.record_state = "recorded";
  };

  $scope.uploadRecord = function() {
    console.log("### in uploadRecord");
    var per = 0;
    $rootScope.statusbar.message = '上傳中 0%';
    $rootScope.statusbar.show = true;
    var int = setInterval(function(){
      per += 20;
      if (per>100) {
        $rootScope.statusbar.show = false;
        per = 0;
        clearInterval(int);
      }
      else {
        $rootScope.statusbar.message = '上傳中 ' + per + '%';
      }
      $rootScope.$apply();
    },1000);
    //Record.upload($scope.quiz, function success() {
    //
    //},
    //function error() {
    //
    //},
    //function progress(p) {
    //
    //})
  }

})

.controller('MessageCtrl', function($scope, $rootScope) {
  $scope.doRefresh = function() {
    $rootScope.refreshChannels(function success(diff_channels) {
      for (var i=0; i<diff_channels.length; i++) {
        Notice.clearCacheByChannelId(diff_channels[i].id);
      }
    },
    function error(err) {
      $rootScope.showError(err);
    });
  }
})

.controller('ChannelDetailCtrl', function($scope, $ionicLoading, $rootScope, $stateParams, Notice) {
  for (var i=0; i<$rootScope.channels.length; i++) {
    if ($rootScope.channels[i].id==$stateParams.channelId)
      $rootScope.cur_channel = $rootScope.channels[i];
  }

  $scope.doRefresh = function() {
    $rootScope.cur_channel.messages = null;
    $scope.loadMore();
  }

  $scope.hasMore = true;
  $scope.loadMore = function() {
    if ($rootScope.cur_channel.messages==null) {
      $rootScope.showLoading();
      Notice.clearCacheByChannelId($stateParams.channelId);
      Notice.getChannelMessages($stateParams.channelId, function(cache){
        $rootScope.cur_channel.messages = cache.messages;
        $rootScope.hideLoading();
        $rootScope.$broadcast('scroll.refreshComplete'); //下拉trigger loadMore，need to broadcast refreshcomplete
        $scope.$broadcast('scroll.infiniteScrollComplete');
      },
      function error(data, status) {
        $rootScope.hideLoading();
        $rootScope.showError(data);
      })
    }
    else {
      Notice.getMore($rootScope.cur_channel, function(more_messages) {
        if (more_messages.length==0) {
          $scope.hasMore = false;
          return;
        }
        for (var i=0; i<more_messages.length; i++)
          $rootScope.cur_channel.messages.push(more_messages[i]);
        $scope.$broadcast('scroll.infiniteScrollComplete');
      },
      function error(data) {
        $rootScope.showError(data);
      })
    }
  }
})

.controller('MessageDetailCtrl', function($scope, $stateParams, $rootScope, Notice) {
  Notice.getMessage($stateParams.channelId, $stateParams.messageId, function success(message) {
    $scope.message = message;
    if (message.last_read==null) {
      Notice.setRead(message);
      $rootScope.decreaseChannelUnread($stateParams.channelId);
    }
  },
  function error(data) {
    $rootScope.showError(data);
  });
})

.controller('AccountCtrl', function($scope, $rootScope) {
  $scope.settings = {
    enableFriends: true
  };

  $scope.testEffect = function() {
    $rootScope.statusbar.message = '12345';
    $rootScope.statusbar.show = true;
    setTimeout(function(){
      $rootScope.statusbar.show = false;
      $rootScope.$apply();
    },1000)
    //$dialogs.error("Test");
  }

});
