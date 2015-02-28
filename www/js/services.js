//var url_prefix = 'http://localhost:8080/wct_cms/smart';
var url_prefix = 'http://223.203.192.27:8008/wcttool/smart';
var user_channel_url = '/front/user/channels';
var channel_message_url = '/front/messages';
var channel_more_message_url = '/front/messages/more';
var user_set_url = '/front/user/set';
var message_setread_url = '/front/message/setread';
var connection_check_url = 'http://www.baidu.com';
var network_err = { code:'e001' };
var quiz_url = '/front/audios';
var quiz_set_status_url = '/front/quiz/set';
var upload_receiver_url = '/front/quiz/upload';
//var tmp_url = 'http://223.203.192.27:8008/wcttool/audio/data-online.json';
var debug = 1;
var debug_uuid = '81b290d5f51d4444';

angular.module('starter.services', ['ionic'])

.factory('Network', function($http) {
  return {
    check: function (success_cb, error_cb) {
      var req = {
        method:'HEAD',
        url:connection_check_url,
        timeout:10000
      }
      $http(req).success(function(data, status){
        success_cb && success_cb();
      }).error(function(data, status){
        if (status==0 && debug==1) {
          success_cb && success_cb();
          return;
        }
        error_cb && error_cb(); // bubble up error
      })
    }
  }
})

.factory('User', function($http, Network) {
  var uuid = null;
  return {
    getUuid:function() {
      return uuid;
    },
    setConfig:function(params, success_cb, error_cb) {
      if (params.uuid)
        uuid = params.uuid;
      var url = url_prefix + user_set_url;
      console.log("## a1");
      Network.check(function success(){
        console.log("## a2 url=" + url + " params="+ JSON.stringify(params));
        $http.post(url, params).success(function(){
          console.log("## a3");
          success_cb && success_cb();
        }).error(function(data, status) {
          console.log("## a4");
          error_cb && error_cb(data); // bubble up error
        });
      },
      function error(){
        console.log("##e");
        error_cb && error_cb(network_err); // network error
      })
    }
  }
})

.factory('Quiz', ['$http', 'Network', 'User', function($http, Network, User) {
    var my_cache = new Array;
    return {
      all:function(success_cb, error_cb) {
        console.log("## b1");
        Network.check(function success() {
          var url = url_prefix + quiz_url;
          console.log("## b2 url=" + url);
          $http.get(url).success(function(data){
            console.log("## b3");
            my_cache = data;
            success_cb && success_cb(data);
          }).error(function(err){
            console.log("## b4 err=" + JSON.stringify(err));
            error_cb && error_cb(err);
          })
        },
        function error() {
          error_cb && error_cb(network_err);
        })
      },
      get:function(quiz_id, success_cb, error_cb) {
        for(var i=0; i<my_cache.length; i++) {
          if (my_cache[i].id==quiz_id) {
            success_cb && success_cb(my_cache[i]);
            return;
          }
        }
        error_cb && error_cb({code:'e008'});
      },
      setStatus:function(quiz, success_cb, error_cb) {
        console.log("### d2");
        Network.check(function success() {
          console.log("### d3");
          var url = url_prefix + quiz_set_status_url;
          console.log("### d3.1 " + User.getUuid() + " " + quiz.id + " " + quiz.status);
          var params = {
            uuid:User.getUuid(),
            q:quiz.id,
            s:quiz.status
          };
          console.log("### d4");
          $http.post(url, params).success(function(data){
            console.log("### d5");
            my_cache = data;
            success_cb && success_cb(data);
          }).error(function(err){
            console.log("### d6");
            error_cb && error_cb(err);
          })
        },
        function error() {
          error_cb && error_cb(network_err);
        })
      },
      setPlayed:function(quiz, success_cb, error_cb, noaction_cb) {
        if (quiz.status<1) {
          quiz.status = 1;
          this.setStatus(quiz, function success() {
            success_cb && success_cb(quiz);
          }, function error(data) {
            error_cb && error_cb(data);
          }); // set status silently
        }
        else
          noaction_cb && noaction_cb(quiz);
      },
      setRecorded:function(quiz, success_cb, error_cb, noaction_cb) {
        if (quiz.status<2) {
          quiz.status = 2;
          this.setStatus(quiz, function success() {
            success_cb && success_cb(quiz);
          }, function error(data) {
            error_cb && error_cb(data);
          }); // set status silently
        }
        else
          noaction_cb && noaction_cb(quiz);
      },
      setUploaded:function(quiz, success_cb, error_cb, noaction_cb) {
        if (quiz.status==2) {
          quiz.status = 3;
          this.setStatus(quiz, function success() {
            success_cb && success_cb(quiz);
          }, function error(data) {
            error_cb && error_cb(data);
          }); // set status silently
        }
        else
          noaction_cb && noaction_cb(quiz);
      }
    }
}])

.factory('Audio', ['$ionicLoading', '$ionicPlatform', function($ionicLoading, $ionicPlatform) {
  var mediaRes = null;
  var paused = false;
  var posTimeer = null;
  return {
    /*
     * callback1: get duration callback
     * callback2: progress callback
     */
    pause:function() {
      if (mediaRes==null)
        return;
      mediaRes.pause();
      paused = true;
    },
    resume:function() {
      if (mediaRes==null)
        return;
      if (!paused)
        return;
      mediaRes.play();
      paused = false;
    },
    seek:function(msecs) {
      mediaRes.seekTo(msecs);
    },
    stop:function() {
      if (mediaRes==null)
        return;
      mediaRes.stop();
      mediaRes.release();
      mediaRes = null;
      if (posTimeer!=null) {
        clearInterval(posTimer);
        posTimeer = null;
      }
    },
    play:function(src, duration_cb, progress_cb, finish_cb, error_cb) {
      if (mediaRes != null)
        return;
      if (!src) {
        error_cb && error_cb({code:'e005'});
        return;
      }

      if (src.toLowerCase().indexOf("://")<0) {
        if($ionicPlatform.is('android')) {
          src = '/android_asset/www/' + src;
        }
      }

      var _a = this;
      mediaRes = new Media(src,
          function (success) {
            _a.stop();
            finish_cb && finish_cb();
          },
          function (err){
            console.log("#error playing sound: " + JSON.stringify(e));
            error_cb && error_cb({code:'e007', error:err})
          },
          function (status) {
            if (status==2) {
              duration_cb && duration_cb(mediaRes.getDuration());
            }
            _a.hideLoading();
          }
      );

      this.showLoading();
      // android doesn't show Loading... without this setTimeout
      setTimeout(function(){
        try {
          mediaRes.play();
        }
        catch (e) {
          this.hideLoading();
        }
      },50)

      posTimer = setInterval(function(){
        mediaRes.getCurrentPosition(function(p){
          if (paused)
            return;
          progress_cb && progress_cb(p);
        })
      },500);
    },
    showLoading:function() {
      $ionicLoading.show({
        template: 'Loading...'
      });
    },
    hideLoading:function(){
      $ionicLoading.hide();
    }
  }
}])

.factory('Record', function(Audio) {
  var recording = null;
  var last_recording = "";
  return {
    get_path:function(quiz) {
        return "cdvfile://localhost/persistent/quiz-" + quiz.id + ".wav";
    },
    record:function (quiz, success_cb, error_cb) {
      //var path = "cdvfile://localhost/persistent/myrecording.wav";
      var path = this.get_path(quiz);
      recording = new Media(path,
          // success callback
          function() {
            console.log("recordAudio():Audio Success");
            last_recording = path;
            success_cb && success_cb();
          },
          // error callback
          function(err) {
            console.log("recordAudio():Audio Error: "+ err.code);
            error_cb && error_cb(err);
          }
      );
      recording.startRecord();
    },
    stop:function () {
      if (recording==null)
        return;
      recording.stopRecord();
      recording = null;
    },
    play:function(quiz, duration_cb, progress_cb, finish_cb, error_cb) {
      var path = this.get_path(quiz);
      Audio.play(path, duration_cb, progress_cb, finish_cb, error_cb);
    },
    upload:function(quiz, success_cb, error_cb, progress_cb) {
      var options = new FileUploadOptions();
      options.fileKey = "file";
      options.fileName = "myrecording.wav";
      options.mimeType = "audio/vnd.wav";

      var params = {};
      params.uuid = User.getUuid();
      params.quiz_id = quiz.id;
      options.params = params;

      var path = this.get_path(quiz);
      var ft = new FileTransfer();
      ft.onprogress = function(event) {
        if (event.lengthComputable) {
          progress_cb(event);
          //var str = ((event.loaded * 100) / event.total) + '% uploaded';
          //progressEvent(str);
        }
      };
      var url = url_prefix + upload_receiver_url;
      ft.upload(path, encodeURI(url), success_cb, error_cb, options);
    }
  }
})

.factory('Notice', ['$http','$sce', 'User', 'Network', function($http, $sce, User, Network) {
  var cached_map = new Array;
  var debug_counter = 2;
  return {
    getChannels:function(callback, error_cb) {
      var url = url_prefix + user_channel_url;
      var p = new Object;
      p.uuid = User.getUuid();
      if (p.uuid==null) {
        if (debug==1) {
          p.uuid = debug_uuid; // peter's phone for debug
        }
        else
          throw "uuid is null, User.setConfig need to be called upon entering";
      }
      console.log("#c1 uuid=" + p.uuid);
      Network.check(function success(){
        console.log("##c2");
        $http.get(url, {params:p} ).success(function(channels) {
          // 先作弊下這分成 title1, title2, db 以後修
          console.log("##c3");
          for (var i=0; i<channels.length; i++) {
            var tokens = channels[i].subtitle.split("-");
            channels[i].title1 = tokens[0];
            channels[i].title2 = tokens[1];
          }
          callback(channels);
        }).error(function(data, status) {
          console.log("##c4 data=" + JSON.stringify(data));
          if (debug==1) {
            callback([{id:1,title1:"debug",title2:"channel1",unread:2,icon:"img/school1.png"},{id:2,title1:"debug",title2:"channel2",unread:1,icon:"img/school2.jpeg"}]);
            return;
          }
          error_cb && error_cb(data);
        })
      },
      function error(){
        error_cb && error_cb(network_err);
      })
    },
    getChannelMessages:function(channel_id, callback, error_cb, force_get) {
      var cache = cached_map[channel_id];
      if (cache && !force_get) {
        console.log("using cache");
        callback(cache);
        return;
      }
      var url = url_prefix + channel_message_url;
      var p = new Object;
      p.c = channel_id;
      p.uuid = User.getUuid();
      if (p.uuid==null) {
        if (debug==1) {
          p.uuid = debug_uuid; // peter's phone for debug
        }
        else
          throw "uuid is null, User.setConfig need to be called upon entering";
      }
      Network.check(function success(){
        $http.get(url, {params:p}).success(function(data){
          cached_map[channel_id] = data;
          callback(data);
        }).error(function(data, status) {
          if (debug==1) {
            var debug_ret = {
              "channel":{"id":1,"name":"debug channel1"},
              "messages":[{"id":1,"title":"msg1","text":"text1","created":"2015-01-01"},
                {"id":2,"title":"msg2","text":"text2","created":"2015-01-02","last_read":"2015-01-03"}]
            };
            cached_map[channel_id] = debug_ret;
            callback(debug_ret);
            return;
          }
          error_cb && error_cb(data);
        })
      },function error(){
        error_cb && error_cb(network_err);
      })
    },
    setRead:function(message) {
      if (message.last_read==null) {
        message.last_read = new Date(); // update cache
        // update server
        var url = url_prefix + message_setread_url;
        var p = new Object;
        p.m = message.id;
        p.uuid = User.getUuid();
        if (p.uuid==null) {
          if (debug==1) {
            p.uuid = debug_uuid; // peter's phone for debug
          }
          else
            throw "uuid is null, User.setConfig need to be called upon entering";
        }
        setTimeout(function(){
          $http.post(url, p).error(function() {
            if (debug==0)
              console.log("call " + url + " failed");
          });
        },1);
      }
    },
    getMessage:function(channel_id, message_id, callback, error_cb) {
      var cache = cached_map[channel_id];
      if (!cache) {
        error_cb && error_cb({ code:'e004'});
        return;
      }
      for (var i=0; i<cache.messages.length; i++) {
        if (cache.messages[i].id==message_id) {
          callback(cache.messages[i]);
        }
      }
    },
    clearCacheByChannelId:function(channel_id) {
      cached_map[channel_id] = null;
    },
    getMore: function(channel, callback, error_cb) {
      var last_id = channel.messages[channel.messages.length-1].id;
      var url = url_prefix + channel_more_message_url;
      var p = new Object;
      p.c = channel.id;
      p.last_id = last_id;
      p.uuid = User.getUuid();
      if (p.uuid==null) {
        if (debug==1) {
          p.uuid = debug_uuid; // peter's phone for debug
        }
        else
          throw "uuid is null, User.setConfig need to be called upon entering";
      }
      $http.get(url, {params:p}).success(function(messages){
        callback(messages);
      }).error(function(data, status) {
        if (debug==1) {
          callback([{
            "id":debug_counter,
            "text":"debug text",
            "title":"debug "+debug_counter++,
            "created":"2015-01-01",
            "last_read":"2015-01-02"
          }]);
          return;
        }
        error_cb && error_cb(data);
      })
    }
  }
}])

.filter('nlToArray', function() {
  return function(text) {
    if (!text)
      return null;
    return text.split('\n');
  };
});



