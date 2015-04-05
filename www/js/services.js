//var url_prefix = 'http://localhost:8080/wct_cms/smart';
//var url_prefix = 'http://223.203.192.27:8008/wcttool/smart';
var url_prefix = 'http://130.211.250.100/smart';
var user_channel_url = '/front/user/channels';
var user_setjpush_url = '/front/user/setjpush';
var channel_message_url = '/front/messages';
var channel_more_message_url = '/front/messages/more';
var message_setread_url = '/front/message/setread';
var connection_check_url = 'http://www.baidu.com';
var network_err = { code:'e001' };
var user_login_url = '/front/user/login';
var user_getcode_url = '/front/user/getcode';
var appuser_check_url = '/front/appuser/check';
var in_browser = 0;
var app_version = 1.0;

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
        if (in_browser==1) {
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
  var token = null;
  var vcode = null;
  var token_file = "cdvfile://localhost/persistent/token";
  var fs = null;
  function saveToken(t, success_cb, error_cb) {
    token = t;
    if (fs==null) {
      if (!in_browser)
        console.log("#error calling saveToken fs is null");
      return;
    }
    fs.root.getFile("token.txt", {create: true, exclusive: false}, function getEntry(file) {
      file.createWriter(function success(writer) {
        writer.write(t);
        success_cb && success_cb();
      }, function fail() {
        console.log("##error writing token2");
        error_cb && error_cb();
      })
    }, function fail(err) {
      console.log("#error writing token1 " + JSON.stringify(err));
      error_cb && error_cb();
    })
  };

  var done_checking = false;
  return {
    checkAppUser:function(success_cb, optional_upgrade_cb, mandatory_upgrade_cb, user_logout_cb) {
        // only check once
        if (done_checking) {
          success_cb && success_cb();
          return;
        }
        done_checking = true;
        var url = url_prefix + appuser_check_url;
        var p = new Object;
        p.token = token;
        p.ver = app_version;
        $http.post(url, p).success(function success(data){
          if (data.optional_upgrade && data.optional_upgrade==1) {
            optional_upgrade_cb && optional_upgrade_cb();
          }
          else if (data.mandatory_upgrade && data.mandatory_upgrade==1) {
            mandatory_upgrade_cb && mandatory_upgrade_cb();
          }
          else if (data.user_logout && data.user_logout==1) {
            user_logout_cb && user_logout_cb();
          }
          else
            success_cb && success_cb();
        }).error(function(){
          // if this call has error，就按原來該走的路走
          success_cb && success_cb();
        })
    },
    configFS:function(filesystem) {
      fs = filesystem;
      console.log("#calling configFS fs=" + fs);
    },
    setJpush:function(jpushId, success_cb, error_cb) {
      var url = url_prefix + user_setjpush_url;
      console.log("#setJpush url=" + url);
      this.getToken(function(token) {
        console.log("##jpush1");
        var p = new Object;
        p.token = token;
        p.jpushid = jpushId;
        Network.check(function success(){
              console.log("##jpush2");
              $http.get(url, {params:p} ).success(function(){
                console.log("##jpush3");
                success_cb && success_cb();
              }).error(function(data, status) {
                error_cb && error_cb(data);
              })
            },
            function error(){
              error_cb && error_cb(network_err);
            })
      }, function error() {
        error_cb && error_cb({code:'x', error:'用户未登入'});
      });
    },
    getToken:function(success_cb, error_cb) {
      if (token==null) {
          if (fs==null) {
            console.log("#error calling getToken fs is null");
            error_cb && error_cb();
            return;
          }
          fs.root.getFile("token.txt", null, function getEntry(fileEntry) {
            fileEntry.file(function (file) {
              var reader = new FileReader();
              reader.onloadend = function(evt) {
                token = evt.target.result;
                console.log("readfile got token=" + token);
                return success_cb && success_cb(token);
              }
              reader.readAsText(file);
            }, function error() {
              console.log("##hh1");
              error_cb && error_cb(err);
            });
          }, function error(err) {
            console.log("##hh2");
            error_cb && error_cb(err);
          });
      }
      else
        return success_cb && success_cb(token);
    },
    getcode:function(phone, success_cb, error_cb) {
      var url = url_prefix + user_getcode_url;
      var params = new Object;
      params.phone = phone;
      Network.check(function success() {
        $http.post(url, params).success(function(data){
          vcode = data.verify_code;
          console.log("#data.verify_code=" + data.verify_code);
          success_cb && success_cb(data.verify_code);
        }).error(function(data, status) {
          error_cb && error_cb(data); // bubble up error
        });
      },
      function error(){
        error_cb && error_cb(network_err); // network error
      })
    },
    logout:function(success_cb) {
      saveToken("");
      success_cb && success_cb();
    },
    login:function(phone, code, success_cb, error_cb) {
      console.log("#l1");
      if (code!=vcode) {
        error_cb && error_cb({ code:'x', error:'驗證碼不正確'});
        return;
      }
      var url = url_prefix + user_login_url;
      var params = new Object;
      params.phone = phone;
      params.code = code;
      console.log("#l2");
      Network.check(function success() {
        console.log("#l3");
        $http.post(url, params).success(function(data){
          console.log("#l4");
          saveToken(data.token);
          console.log("#l5");
          success_cb && success_cb(data.token);
        }).error(function(data, status) {
          error_cb && error_cb(data); // bubble up error
        });
      },
      function error(){
        error_cb && error_cb(network_err); // network error
      })
    }
  }
})

.factory('Notice', ['$http','$sce', 'User', 'Network', function($http, $sce, User, Network) {
  var cached_map = new Array;
  var debug_counter = 2;
  return {
    getChannels:function(succss_cb, error_cb) {
      var url = url_prefix + user_channel_url;
      var p = new Object;
      User.getToken(function(token) {
        p.token = token;
        Network.check(function success(){
              console.log("##c2");
              $http.get(url, {params:p} ).success(function(uchannels) {
                console.log("##c3");
                for (var x=0; x<uchannels.length; x++) {
                  if (uchannels[x].last_message)
                    //uchannels[x].last_message.title += '啊今天天氣很好你好嗎';
                  console.log("##uchannels[x].last_message=" + JSON.stringify(uchannels[x].last_message));
                }
                succss_cb && succss_cb(uchannels);
              }).error(function(data, status) {
                if (in_browser==1) {
                  succss_cb && succss_cb([
                    {id:1,title:"debug1-test",role:"student",unread:2,icon:"img/school1.png"},
                    {id:2,title:"debug1-test",role:"student",unread:1,icon:"img/school2.jpeg"}]);
                  return;
                }
                console.log("##c4");
                error_cb && error_cb(data);
              })
            },
            function error(){
              error_cb && error_cb(network_err);
            })
      }, function error() {
        error_cb && error_cb({code:'x', error:'用户未登入'});
      });
    },
    getChannelMessages:function(ucid, success_cb, error_cb, force_get) {
      var cache = cached_map[ucid];
      if (cache && !force_get) {
        console.log("using cache");
        callback(cache);
        return;
      }
      var url = url_prefix + channel_message_url;
      var p = new Object;
      p.ucid = ucid;
      User.getToken(function(token) {
        console.log("##n1");
        p.token = token;
        Network.check(function success(){
          console.log("##n2 p=" + JSON.stringify(p));
          $http.get(url, {params:p}).success(function(data){
            console.log("##n3 ");
            cached_map[ucid] = data;
            success_cb(data);
          }).error(function(data, status) {
            if (in_browser==1) {
              var debug_ret = {
                "channel":{"id":1,"name":"debug channel1"},
                "messages":[{"id":1,"title":"msg1","text":"text1","created":"2015-01-01"},
                  {"id":2,"title":"msg2","text":"text2","created":"2015-01-02","last_read":"2015-01-03"}]
              };
              cached_map[ucid] = debug_ret;
              success_cb(debug_ret);
              return;
            }
            error_cb && error_cb(data);
          })
        },function error(){
          error_cb && error_cb(network_err);
        })
      }, function error() {
        error_cb && error_cb({code:'x', error:'用户未登入'});
      });
    },
    setRead:function(message) {
      if (message.last_read=='') {
        message.last_read = new Date(); // update cache
        User.getToken(function(token) {
          // update server
          var url = url_prefix + message_setread_url;
          var p = new Object;
          p.token = token;
          p.umid = message.umid;
          setTimeout(function(){
            $http.post(url, p);
          },1);
        }, function error() {
          error_cb && error_cb({code:'x', error:'用户未登入'});
        });
      }
    },
    getMessage:function(ucid, umid, success_cb, error_cb) {
      var cache = cached_map[ucid];
      if (!cache) {
        error_cb && error_cb({ code:'e004', error:'cache not found'});
        return;
      }
      for (var i=0; i<cache.messages.length; i++) {
        if (cache.messages[i].umid==umid) {
          success_cb && success_cb(cache.messages[i]);
          return;
        }
      }
    },
    clearCacheByChannelId:function(ucid) {
      cached_map[ucid] = null;
    },
    getMore: function(uchannel, success_cb, error_cb) {
      if (uchannel.messages.length==0) { //一開始就沒有messages了
        success_cb && success_cb([]);
        return;
      }
      User.getToken(function(token) {
        var last_id = uchannel.messages[uchannel.messages.length-1].umid;
        var url = url_prefix + channel_more_message_url;
        var p = new Object;
        p.token = token;
        p.ucid = uchannel.ucid;
        p.last_id = last_id;
        Network.check(function success(){
          $http.get(url, {params:p}).success(function(messages){
            success_cb && success_cb(messages);
          }).error(function(data, status) {
            if (in_browser==1) {
              success_cb && success_cb([{
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
        },function error(){
          error_cb && error_cb(network_err);
        })
      }, function error() {
        error_cb && error_cb({code:'x', error:'用户未登入'});
      });
    }
  }
}])

.filter('nlToArray', function() {
  return function(text) {
    if (!text)
      return null;
    return text.split('\n');
  };
})

.filter('trimTitle', function() {
  return function(text) {
    var ret = '';
    var len = 0;
    var i = 0;
    for (; i<text.length && len<20; i++) {
      var c = text.charCodeAt(i);
      if (c<256)
        len ++;
      else
        len += 2;
      ret += text.charAt(i);
    }
    if (i<text.length)
      ret += '...';
    return ret;
  }
})

.filter('relativeTime', function() {
  return function(time) {
    moment(time, 'YYYY-MM-DD HH:mm:ss').fromNow();
  }
})


