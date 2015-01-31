//var url_prefix = 'http://localhost:8080/wct_cms/smart';
var url_prefix = 'http://223.203.192.27:8008/wcttool/smart';
var user_channel_url = '/front/user/channels';
var channel_message_url = '/front/messages';
var channel_more_message_url = '/front/messages/more';
var user_set_url = '/front/user/set';
var message_setread_url = '/front/message/setread';
var debug = 1;

angular.module('starter.user_service', ['ionic'])

.factory('User', function($http) {
  var uuid = null;
  return {
    getUuid:function() {
      return uuid;
    },
    setConfig:function(params, success_cb, error_cb) {
      if (params.uuid)
        uuid = params.uuid;
      var url = url_prefix + user_set_url;
      console.log("## 1");
      $http.post(url, params).success(function(){
        console.log("## 2");
        success_cb && success_cb();
      }).error(function(data, status) {
        error_cb && error_cb(data, status);
      });
    }
  }
});

angular.module('starter.services', ['starter.user_service'])

.factory('Quiz', ['$http', function(http) {
  return {
    all: function(callback) {
      http.get('audio/data.json').success(callback);
    },
    get: function(id, callback) {
      http.get('audio/data.json').success(function(quizzes) {
        for (var i = 0; i < quizzes.length; i++) {
          if (quizzes[i].id == id) {
            if (quizzes[i].text) {
              quizzes[i].script_txt = quizzes[i].text;
              callback(quizzes[i]);
            }
            else if (quizzes[i].script) {
              http.get(quizzes[i].script).success(function(data){
                quizzes[i].script_txt = data;
                callback(quizzes[i]);
              })
            }
            break;
          }
        }
      })
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
    play:function(src, duration_cb, progress_cb, finish_cb) {
      if (mediaRes != null)
        return;
      if (!src) {
        alert('source is empty');
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
          },
          function (status) {
            console.log("#status=" + status);
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
    record:function (success_cb, fail_cb) {
      var path = "cdvfile://localhost/persistent/myrecording.wav";
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
            fail_cb && fail_cb(err);
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
    play:function(duration_cb, progress_cb) {
      if (recording!=null || last_recording.length==0) {
        alert("Cannot play, not finish recording yet");
        return;
      }
      Audio.play(last_recording, duration_cb, progress_cb);
    },
    upload:function(success_cb, fail_cb, progress_cb) {
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
        if (progressEvent.lengthComputable) {
          progress_cb(progressEvent);
          var str = ((progressEvent.loaded * 100) / progressEvent.total) + '% uploaded';
          progressEvent(str);
        } else {
          progressEvent('uploading ...');
        }
      };
      ft.upload(fileURL, encodeURI("http://localhost:8080/wct_cms/test.jsp"), success_cb, fail_cb, options);
    }
  }
})

.factory('Notice', ['$http','$sce', 'User', function($http, $sce, User) {
  var cached_map = new Array;
  var debug_counter = 2;
  return {
    getChannels:function(callback, error_callback) {
      var url = url_prefix + user_channel_url;
      var p = new Object;
      p.uuid = User.getUuid();
      if (p.uuid==null) {
        if (debug==1) {
          p.uuid = '704342CF-250A-4718-B73B-D7BF7FA3296D'; // peter's phone for debug
        }
        else
          throw "uuid is null, User.setConfig need to be called upon entering";
      }
      $http.get(url, {params:p} ).success(function(channels) {
        // 先作弊下這分成 title1, title2, db 以後修
        for (var i=0; i<channels.length; i++) {
          var tokens = channels[i].subtitle.split("-");
          channels[i].title1 = tokens[0];
          channels[i].title2 = tokens[1];
        }
        callback(channels);
      }).error(function(data, status) {
        if (debug==1) {
          callback([{id:1,title1:"debug",title2:"channel1",unread:2,icon:"img/school1.png"},{id:2,title1:"debug",title2:"channel2",unread:1,icon:"img/school2.jpeg"}]);
          return;
        }
        console.log("error in calling " + url + " data=" + data + " status=" + status);
        error_callback && error_callback(data, status);
      })
    },
    getChannelMessages:function(channel_id, callback, error_callback) {
      var cache = cached_map[channel_id];
      if (cache) {
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
          p.uuid = '704342CF-250A-4718-B73B-D7BF7FA3296D'; // peter's phone for debug
        }
        else
          throw "uuid is null, User.setConfig need to be called upon entering";
      }
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
        console.log("error in calling " + url + " data=" + data + " status=" + status);
        error_callback && error_callback(data, status);
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
            p.uuid = '704342CF-250A-4718-B73B-D7BF7FA3296D'; // peter's phone for debug
          }
          else
            throw "uuid is null, User.setConfig need to be called upon entering";
        }
        setTimeout(function(){
          $http.post(url, p).error(function() {
            console.log("## error calling " + message_setread_url + " status=" + status);
            if (debug==0)
              console.log("call " + url + " failed");
          });
        },1);
      }
    },
    getMessage:function(channel_id, message_id, callback) {
      var cache = cached_map[channel_id];
      if (!cache) {
        alert('error:cache is empty');
      }
      for (var i=0; i<cache.messages.length; i++) {
        if (cache.messages[i].id==message_id) {
          callback(cache.messages[i]);
        }
      }
    },
    getMore: function(cache, callback, error_callback) {
      console.log("## a2");
      var last_id = cache.messages[cache.messages.length-1].id;
      console.log("## a3 last_id=" + last_id);
      var url = url_prefix + channel_more_message_url;
      var p = new Object;
      p.c = cache.channel.id;
      p.last_id = last_id;
      p.uuid = User.getUuid();
      if (p.uuid==null) {
        if (debug==1) {
          p.uuid = '704342CF-250A-4718-B73B-D7BF7FA3296D'; // peter's phone for debug
        }
        else
          throw "uuid is null, User.setConfig need to be called upon entering";
      }
      console.log("## a4 url=" + url);
      $http.get(url, {params:p}).success(function(messages){
        console.log("## a5");
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
        console.log("error in calling " + url + " data=" + data + " status=" + status);
        error_callback && error_callback(data, status);
      })
    }
  }
}])

//.factory('Slider', function() {
//  var bar, slider;
//  return {
//    init:function(cfg) {
//      bar = document.getElementById(cfg.bar);
//      slider = document.getElementById(cfg.slider);
//    },
//    slideToPercent:function(percent) {
//      if (percent>100)
//        percent = 100;
//      slider.style.width = percent + '%';
//    }
//  }
//})
//

.filter('nlToArray', function() {
  return function(text) {
    if (!text)
      return null;
    return text.split('\n');
  };
});

