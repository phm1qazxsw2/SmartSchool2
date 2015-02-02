angular.module('starter.controllers', ['starter.services'])

.controller('TabCtrl', function($scope, Audio, Notice, $rootScope, $ionicLoading) {

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

  $rootScope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams){
    Audio.stop();
    console.log("##state=" + JSON.stringify(toState) + "params=" + JSON.stringify(toParams));
    $rootScope.cur_page.state = toState.name;
    if (toState.name=='tab.message-channel') {
      $rootScope.cur_page.channel_id = toParams.channelId;
    }
  })

  $rootScope.refreshChannels = function(callback) {
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
        console.log(channels[i].subtitle + " org_unread=" + org_unread + " unread=" + channels[i].unread)
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
    });
  };

  $rootScope.showLoading = function() {
    $ionicLoading.show({
      template: 'Loading...'
    });
  };
  $rootScope.hideLoading = function(){
    $ionicLoading.hide();
  };

  $rootScope.badgestyle = 'badge-assertive';
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
                                       Quiz, Audio) {

  // $scope.pageTitle = pageTitle;
  Quiz.get($stateParams.quizId, function(quiz) {
    $scope.quiz = quiz;
    $scope.progress = { play:0 };
    $scope.play_style = 'ion-play';

    $scope.record_style = 'ion-record';
    $scope.record_state = "init";
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
      $scope.$apply();
    });
  };

  // recording below
  var recording = null;
  var last_recording = "";
  $scope.startRecord = function () {
    console.log("#r1");
    var path = "cdvfile://localhost/persistent/myrecording.wav";
    recording = new Media(path,
        // success callback
        function() {
          console.log("recordAudio():Audio Success");
          last_recording = path;
        },
        // error callback
        function(err) {
          console.log("recordAudio():Audio Error: "+ err.code);
        }
    );

    // Record audio
    recording.startRecord();
    $scope.record_state = "recording";
  };

  $scope.stopRecord = function () {
    if (recording==null)
      return;
    recording.stopRecord();
    recording = null;
    $scope.record_state = "recorded";
  };
  //
  $scope.playRecord = function() {
    if (recording!=null || last_recording.length==0) {
      alert("Cannot play, not finish recording yet");
      return;
    }
    Audio.play(last_recording, null, null, function finish() {
      $scope.record_state = "recorded";
      $scope.$apply();
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
    var success = function (r) {
      console.log("Code = " + r.responseCode);
      console.log("Response = " + r.response);
      console.log("Sent = " + r.bytesSent);
    };

    var fail = function (error) {
      alert("An error has occurred: Code = " + error.code);
      console.log("upload error source " + error.source);
      console.log("upload error target " + error.target);
    };

    var options = new FileUploadOptions();
    options.fileKey = "file";
    options.fileName = "myrecording.wav";
    options.mimeType = "audio/vnd.wav";

    var params = {};
    params.value1 = "test";
    params.value2 = "param";

    options.params = params;

    var fileURL = 'cdvfile://localhost/persistent/myrecording.wav';
    var ft = new FileTransfer();
    ft.onprogress = function(progressEvent) {
      console.log("#3");
      if (progressEvent.lengthComputable) {
        $scope.uploadstatus = ((progressEvent.loaded * 100) / progressEvent.total) + '% uploaded';
      } else {
        $scope.uploadstatus = 'uploading ...'
      }
      $scope.$apply();
    };
    console.log("#1");
    ft.upload(fileURL, encodeURI("http://localhost:8080/wct_cms/test.jsp"), success, fail, options);
    console.log("#2");
  }

})

.controller('MessageCtrl', function($scope, $rootScope) {

  $scope.doRefresh = function() {
    $rootScope.refreshChannels();
  }

})

.controller('ChannelDetailCtrl', function($scope, $ionicLoading, $rootScope, $stateParams, Notice) {
  $scope.hasMore = true;
  $scope.loadMore = function() {
    for (var i=0; i<$rootScope.channels.length; i++) {
       if ($rootScope.channels[i].id==$stateParams.channelId)
         $rootScope.cur_channel = $rootScope.channels[i];
    }

    if ($rootScope.cur_channel.messages==null) {
      $rootScope.showLoading();
      console.log("## b3");
      Notice.getChannelMessages($stateParams.channelId, function(cache){
        console.log("## b4");
        $rootScope.cur_channel.messages = cache.messages;
        $rootScope.hideLoading();
        $scope.$broadcast('scroll.infiniteScrollComplete');
      },
      function error(data, status) {
        alert("error in getChannelMessages");
        $rootScope.hideLoading();
      })
    }
    else {
      console.log("## b5");
      Notice.getMore($rootScope.cur_channel, function(more_messages) {
        console.log("## b6");
        if (more_messages.length==0) {
          $scope.hasMore = false;
          return;
        }
        for (var i=0; i<more_messages.length; i++)
          $rootScope.cur_channel.messages.push(more_messages[i]);
        $scope.$broadcast('scroll.infiniteScrollComplete');
      },
      function error() {
        alert("error in getMore");
      })
    }
  }
})

.controller('MessageDetailCtrl', function($scope, $stateParams, $rootScope, Notice) {
  Notice.getMessage($stateParams.channelId, $stateParams.messageId, function(message) {
    $scope.message = message;
    if (message.last_read==null) {
      Notice.setRead(message);
      $rootScope.decreaseChannelUnread($stateParams.channelId);
    }
  });
})

.controller('AccountCtrl', function($scope, $rootScope) {
  $scope.settings = {
    enableFriends: true
  };

  $scope.testEffect = function() {
    $rootScope.receiveNewMessage();
  }

});



