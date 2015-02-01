angular.module('starter.controllers', ['starter.services'])

.controller('TabCtrl', function($scope, Audio, Notice, $rootScope, $ionicLoading) {

  $rootScope.statusbar = { show:false, message:null };
  $rootScope.channels = [];
  $rootScope.badge = {
     quiz:0,
     message:0
  }
  $rootScope.msg_cache = {
     channel:null,
     messages:null
  }

  $rootScope.receiveNewMessage = function() {
    $rootScope.statusbar.message = "收到新的通知！";
    $rootScope.statusbar.show = true;
    setTimeout(function() {
      $rootScope.statusbar.show = false;
      $rootScope.$apply();
    }, 6000)

    //var _counter = 0;
    //var timer = setInterval(function(){
    //  if ($rootScope.badgestyle=='badge-stable') {
    //    $rootScope.badgestyle='badge-assertive';
    //  }
    //  else {
    //    $rootScope.badgestyle='badge-stable';
    //  }
    //  $rootScope.$apply();
    //  if (++_counter % 20==0)
    //    clearInterval(timer);
    //},400)
  }

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
  }

  $rootScope.$on('$ionicView.enter', function(){
    Audio.stop();
  })

  $rootScope.refreshChannels = function() {
    Notice.getChannels(function(channels){
      $rootScope.channels = channels;
      var unread = 0;
      for(var i=0;i<channels.length; i++) {
        unread += channels[i].unread;
      }
      $rootScope.badge.message = unread;
      $rootScope.hideLoading();
      $rootScope.$broadcast('scroll.refreshComplete');
    },
    function error(data, status) {
      $rootScope.hideLoading();
      $rootScope.$broadcast('scroll.refreshComplete');
    });
  }

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
  })

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
  }

  var is_dragging = false;
  $scope.onDrag = function() {
    is_dragging = true;
  }

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
  }

  $scope.stop = function() {
    Audio.stop();
    $scope.play_style = 'ion-play';
    setTimeout(function(){
      $scope.progress.play = 0;
      $scope.$apply();
    },100);
  }

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
  }

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
  }

  $scope.stopRecord = function () {
    if (recording==null)
      return;
    recording.stopRecord();
    recording = null;
    $scope.record_state = "recorded";
  }
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
  }

  $scope.pausePlay = function() {
    Audio.pause();
    $scope.record_state = "paused";
  }

  $scope.resumePlay = function() {
    Audio.resume();
    $scope.record_state = "playing";
  }

  $scope.stopPlay = function() {
    Audio.stop();
    $scope.record_state = "recorded";
  }

  $scope.uploadRecord = function() {
    var success = function (r) {
      console.log("Code = " + r.responseCode);
      console.log("Response = " + r.response);
      console.log("Sent = " + r.bytesSent);
    }

    var fail = function (error) {
      alert("An error has occurred: Code = " + error.code);
      console.log("upload error source " + error.source);
      console.log("upload error target " + error.target);
    }

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

.controller('MessageCtrl', function($scope, $rootScope, Notice, Audio) {

  $scope.doRefresh = function() {
    $rootScope.refreshChannels();
  }

})

.controller('ChannelDetailCtrl', function($scope, $ionicLoading, $rootScope, $stateParams, Notice) {

  //$scope.$on('$ionicView.loaded', function(){
  //  $rootScope.showLoading();
  //  Notice.getChannelMessages($stateParams.channelId, function(cache){
  //    $rootScope.msg_cache = cache;
  //    console.log("111 msg_cache=" + JSON.stringify($rootScope.msg_cache));
  //    $rootScope.hideLoading();
  //  },
  //  function error(data, status) {
  //    alert("error in getChannelMessages");
  //    $rootScope.hideLoading();
  //  })
  //})

  $scope.hasMore = true;
  $scope.loadMore = function() {
    console.log("#1 channel_id=" + $stateParams.channelId + " $scope.cache=" + $scope.cache);
    if ($scope.cache==null) {
      $rootScope.showLoading();
      Notice.getChannelMessages($stateParams.channelId, function(cache){
        $scope.cache = cache;
        console.log("111 cache=" + JSON.stringify(cache));
        $rootScope.hideLoading();
        $scope.$broadcast('scroll.infiniteScrollComplete');
      },
      function error(data, status) {
        alert("error in getChannelMessages");
        $rootScope.hideLoading();
      })
    }
    else {
      Notice.getMore($scope.cache, function(more_messages) {
        if (more_messages.length==0) {
          $scope.hasMore = false;
          return;
        }
        for (var i=0; i<more_messages.length; i++)
          $scope.cache.messages.push(more_messages[i]);
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

})



