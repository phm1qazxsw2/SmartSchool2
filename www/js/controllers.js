
angular.module('starter.controllers', ['starter.services'])

.controller('RootCtrl', function($scope, $state, Audio, Notice, $rootScope,
      $ionicLoading, Network, User) {

  shareInit($rootScope);
  $rootScope.uchannels = [];  // used by tab.message (MessageCtrl)
  $rootScope.badge = {
     quiz:0,
     message:0
  };

  //用來檢查是否新進信息需要更新目前頁面
  $rootScope.cur_page = {
     state:'',
     ucid:0
  };

  $rootScope.cur_uchannel = {
    messages:null
  };

  $rootScope.initPush = function() {
    window.plugins.jPushPlugin.init();
    window.plugins.jPushPlugin.setDebugMode(true);
    window.plugins.jPushPlugin.getRegistrationID(function(data){
      try{
        console.log("## 4 registrationID=" + data + "#");
        Network.check(function netok() {
          console.log("## 4.1 network ok, calling /user/setjpush data=" + data);
          User.setJpush(data,
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
        var diff_ucid = diff_channels[i].ucid;
        Notice.getChannelMessages(diff_ucid, function(cache) {
          // 如果刚好现在的页面就是这个channel的message页
          var t1 = ($rootScope.cur_page.state == 'tab.message-channel');
          var a = $rootScope.cur_page.channel_id;
          var b = diff_ucid;
          var b = diff_ucid;
          var t2 = (a==b);
          if (t1 && t2) {
            for (var j=0; j<$rootScope.uchannels.length; j++) {
              if ($rootScope.uchannels[j].ucid == diff_ucid) {
                $rootScope.uchannels[j].messages = cache.messages;
                $rootScope.cur_uchannel.messages = cache.messages;
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

  $rootScope.decreaseChannelUnread = function(ucid) {
     for (var i=0; i<$rootScope.uchannels.length; i++) {
       if ($rootScope.uchannels[i].ucid==ucid) {
         if ($rootScope.uchannels[i].unread>0)
            $rootScope.uchannels[i].unread --;
         if ($rootScope.badge.message>0)
            $rootScope.badge.message --;
         break;
       }
     }
  };

  $rootScope.$on('$stateChangeSuccess', function(event, toState, toParams){
    Audio.stop();
    //console.log("##state=" + JSON.stringify(toState) + "params=" + JSON.stringify(toParams));
    $rootScope.cur_page.state = toState.name;
    if (toState.name=='tab.message-channel') {
      $rootScope.cur_page.ucid = toParams.ucId;
    }
  })

  $rootScope.refreshChannels = function(callback, error_cb) {
    var org_unread_map = new Array;
    for (var i=0; i<$rootScope.uchannels.length; i++) {
      var c = $rootScope.uchannels[i];
      org_unread_map[c.ucid] = c.unread;
    }
    var diffs = new Array;
    Notice.getChannels(function(uchannels){
      $rootScope.uchannels = uchannels;
      var unread = 0;
      for(var i=0;i<uchannels.length; i++) {
        unread += uchannels[i].unread;
        var org_unread = org_unread_map[uchannels[i].ucid];
        if (org_unread!=uchannels[i].unread) {
          diffs.push(uchannels[i]);
        }
        if (uchannels[i].icon.length==0)
          uchannels[i].icon = 'img/ionic.png';
      }
      $rootScope.badge.message = unread;
      $rootScope.hideLoading();
      $rootScope.$broadcast('scroll.refreshComplete');
      callback && callback(diffs);
      console.log("#c7");
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
  console.log("##in RootCtrl1");

  //// loading plugin js
  //angularLoad.loadScript(url_prefix + "/js/plugin/index").then(function() {
  //  console.log("#successfully loaded js/plugin/index");
  //}).catch(function() {
  //  console.log("#error loading js/plugin/index");
  //});

})

.controller('LoginCtrl', function($scope, $rootScope, User, $state) {
  function optional_upgrade(ios_link, android_link) {
    if (confirm("發現新的版本，現在升級？")) {
      if (ionic.Platform.platform()=='ios')
        location.href = ios_link;
      else //if (ionic.Platform.platform()=='android')
        location.href = android_link;
      return;
    }
    $state.go('index_tabs.tab.message');
  }
  function mandatory_grade(ios_link, android_link) {
    alert('發現必須升級的版本, 前往下載頁面');
    if (ionic.Platform.platform()=='ios')
      location.href = ios_link;
    else //if (ionic.Platform.platform()=='android')
      location.href = android_link;

  }
  function user_logout() {
    alert('您已在別的地方登入，即將登出本程式');
    User.logout(function() {
      $state.go('login');
    })
  }
  console.log("###########in LoginCtrl 1############");
  // when programe startup
  // 1. get token
  // 2. check version and token see if an upgrade is needed or already logined in other mobile device
  $scope.settled = false;
  setTimeout(function() {
    User.getToken(function(token){
      if (token!=null && token.length>10)
        User.checkAppUser(function () {
          $state.go('index_tabs.tab.message');
        }, optional_upgrade, mandatory_grade, user_logout)
      else {
        User.checkAppUser(null, optional_upgrade, mandatory_grade);
        $scope.settled = true;
        $scope.$apply();
      }
    },function() {
      User.checkAppUser(null, optional_upgrade, mandatory_grade);
      $scope.settled = true;
      $scope.$apply();
    })
  },500)

  //shareInit($rootScope);

  $scope.user = {
    phone : '',
    code : ''
  }
  $scope.button_name = "取得驗證碼";

  $scope.code_waiting = false;
  $scope.code_sent = false;
  var count = 0;
  $scope.getCode = function() {
    console.log("#in LoginCtrl 3 in getCode");
    if ($scope.user.phone.length!=10 || $scope.user.phone.indexOf("09")!=0) {
      $rootScope.showError({ code:'x', error:'請輸入09開頭10位數的手機號'})
      return;
    }
    if (count>0) {
      $rootScope.showError({ code:'x', error:'請等待一陣子再執行重新發送'})
      return;
    }
    User.getcode($scope.user.phone, function success() {
      $scope.code_waiting = true;
      $scope.code_sent = true;
      var int = setInterval(function() {
        count ++;
        $scope.button_name = "發送中(" + (60-count) + "秒)";
        if (count>60) {
          clearInterval(int);
          $scope.button_name = "取得驗證碼";
          $scope.code_waiting = false;
          count = 0;
        }
        $scope.$apply();
      }, 1000)
    }, function error(err) {
      $rootScope.showError(err);
    })
  }
  $scope.login = function() {
    User.login($scope.user.phone, $scope.user.code, function success(token) {
      $state.go("index_tabs.tab.message")
    }, function error(error) {
      $scope.user.code = '';
      $rootScope.showError(error);
    })
  }
})

.controller('MessageCtrl', function($scope, $rootScope, Notice) {

    $scope.first_time = true;
    $scope.$on('$ionicView.loaded', function(){
      try {
        console.log("##initpush1");
        $rootScope.initPush();
      }
      catch(e) {
        console.log("Exception:" + e);
      }
      setTimeout(function(){
        $rootScope.refreshChannels(function() {
          $scope.first_time = false;
        });
      },1);
    })

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
  for (var i=0; i<$rootScope.uchannels.length; i++) {
    if ($rootScope.uchannels[i].ucid==$stateParams.ucId)
      $rootScope.cur_uchannel = $rootScope.uchannels[i];
  }

  $scope.doRefresh = function() {
    $rootScope.cur_uchannel.messages = null;
    $scope.loadMore(function() {
      $rootScope.$broadcast('scroll.refreshComplete'); //下拉trigger loadMore，need to broadcast refreshcomplete
    });
  }

  $scope.hasMore = true;
  $scope.loadMore = function(done_cb) {
    if ($rootScope.cur_uchannel.messages==null) {
      $rootScope.showLoading();
      console.log("#ChannelDetailCtrl ucId=" + $stateParams.ucId);
      Notice.clearCacheByChannelId($stateParams.ucId);
      Notice.getChannelMessages($stateParams.ucId, function(cache){
        $rootScope.cur_uchannel.messages = cache.messages;
        $rootScope.hideLoading();
        $scope.$broadcast('scroll.infiniteScrollComplete');
        done_cb && done_cb();
      },
      function error(data, status) {
        $rootScope.hideLoading();
        $rootScope.showError(data);
        $scope.$broadcast('scroll.infiniteScrollComplete');
        done_cb && done_cb();
      })
    }
    else {
      console.log("## in getmore controller");
      Notice.getMore($rootScope.cur_uchannel, function(more_messages) {
        if (more_messages.length==0) {
          $scope.hasMore = false;
          return;
        }
        for (var i=0; i<more_messages.length; i++)
          $rootScope.cur_uchannel.messages.push(more_messages[i]);
        $scope.$broadcast('scroll.infiniteScrollComplete');
      },
      function error(data) {
        $rootScope.showError(data);
        $scope.$broadcast('scroll.infiniteScrollComplete');
      })
    }
  }
})

.controller('MessageDetailCtrl', function($scope, $stateParams, $rootScope, Notice) {
  Notice.getMessage($stateParams.ucId, $stateParams.umId, function success(message) {
    $scope.message = message;
    if (message.last_read=='') {
      Notice.setRead(message);
      $rootScope.decreaseChannelUnread($stateParams.ucId);
    }
  },
  function error(data) {
    $rootScope.showError(data);
  });
});

function shareInit(rootScope) {
  console.log("## in shareInit 1");
  rootScope.statusbar = { show:false, message:null };
  rootScope.showError = function (errobj) {
    var e = new Error();
    console.log(e.stack);

    //console.log("## in showError" + ((typeof errobj.error)=="string") + " #" + (errobj.code) + "#" + (!errobj.code));
    if (!errobj || !errobj.code) {
      console.log("## in showError 2 errobj=" + JSON.stringify(errobj));
      errobj = { code:'x999', error:'Service unavailable' };
    }

    var err_msg = '';
    if (errobj.code=='e001') {
      err_msg = 'Network is down!';
    }
    else if (errobj.code=='e002') {
      err_msg = "Cannot play, not finish recording yet";
    }
    else if (errobj.code=='e003') {
      err_msg = "Upload error";
    }
    else if (errobj.code=='e004') {
      err_msg = 'error:channel message cache is empty';
    }
    else if (errobj.code=='e005') {
      err_msg = 'play source is empty';
    }
    else if (errobj.code=='e006') {
      err_msg = "Cannot play, not finish recording yet";
    }
    else if (errobj.code=='e007') {
      err_msg = 'error in playing';
    }
    else if (errobj.code=='e008') {
      err_msg = 'object not found';
    }
    else if (errobj.code=='e999') {
      err_msg = 'Unknown error!';
    }
    else if (errobj.code=='f001') {
      err_msg = '参数不正確';
    }
    else if (errobj.code=='f002') {
      err_msg = '用戶不存在';
    }
    else if (errobj.code=='f003') {
      err_msg = 'api error: service not available!';
    }
    else if (errobj.code=='f004') {
      err_msg = '登入信息错误!';
    }
    else if (errobj.code=='f005') {
      err_msg = 'Checksum incorrect!';
    }
    else if (errobj.code=='f006') {
      err_msg = 'UserChannel 不存在';
    }
    else if (errobj.code=='f998') {
      err_msg = 'api error: unknown!';
    }
    else if (errobj.code=='b998') {
      err_msg = 'server unknown error!';
    }
    else if ((typeof errobj.error)=="string") {
      err_msg = errobj.error;
    }
    else {
      err_msg = 'error:' + JSON.stringify(errobj);
    }
    rootScope.statusbar.message = err_msg;
    rootScope.statusbar.show = true;
    rootScope.statusbar.class = "bar-assertive";
    setTimeout(function() {
      rootScope.statusbar.show = false;
      rootScope.$apply();
    }, 1500)
  }
  console.log("## in shareInit");
}
