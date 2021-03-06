const fs = require('fs-extra');
const path = require('path');
const EventEmitter = require('events');

function ComskipWrapper(profile, working_dir, fork)
{
  if(fork == null)
    fork = true;

  if(profile == null)
    profile = 'default';

  if(working_dir == null)
    working_dir = './comskip_data';

  this.profile = profile;
  this.working_dir = working_dir;
  this.forked = fork;

  fs.mkdirsSync(this.output_dir());

  if(!fork) {
    this.comskip_events = new EventEmitter();
  }
}

ComskipWrapper.prototype.ini_file = function() {
  var ini_path = this.working_dir + '/' + this.profile + '/comskip.ini';
  if(!fs.existsSync(ini_path))
    fs.copySync(path.dirname(module.filename) + '/../comskip.ini', ini_path);
  return ini_path;
};

ComskipWrapper.prototype.logo_file = function() {
  return this.working_dir + '/' + this.profile + '/logo.bmp';
};

ComskipWrapper.prototype.output_dir = function() {
  return this.working_dir + '/' + this.profile + '/output';
};

ComskipWrapper.prototype.stop = function()
{
  var promise = new Promise((resolve, reject) => {
    if(this.forked) {
      if(this.comskip_child.connected) {
        this.comskip_child.on('message', function(msg) {
          if(msg.type == 'finish')``
            resolve(msg.finish.result);
        });
        this.comskip_child.on('close', function(code, signal) {
          resolve(signal);
        });
        this.comskip_child.send({'type': 'stop'});
      } else
        resolve(0);
    } else {
      this.comskip_events.on('finish', result => resolve(result));
      this.comskip.stop();
    }
  });
  return promise;
};

ComskipWrapper.prototype.run = function(mpeg_file, finish_cb, update_cb)
{
  if(this.forked) {
    // En un proceso aparte
    var child_process = require('child_process');
    var log = fs.createWriteStream(this.output_dir() + '/stdio.' + process.pid + '.log', { flags : 'w' });
    var write_log = function(data) {
      log.write(data);
    };
    comskip_child = child_process.fork(path.dirname(module.filename) + '/comskipChild', [mpeg_file, this.ini_file(), this.logo_file(), this.output_dir()], {silent: true});
    comskip_child.stdout.on('data', write_log);
    comskip_child.stderr.on('data', write_log);
    comskip_child.on('message', function(msg) {
      switch(msg.type) {
        case 'finish':
          finish_cb(msg.finish.result);
          comskip_child.disconnect();
          setTimeout(function() {
            console.log(`Killing comskipChild! (pid=${comskip_child.pid})`);
            comskip_child.kill('SIGKILL');
	        }, 2000);
          break;
        case 'update':
          update_cb(msg.segment.start, msg.segment.end, msg.segment.completed);
          break;
      }
    });
    comskip_child.on('close', function(code, signal) {
      log.end();
      if(code != 0)
        finish_cb(signal);
    });
    this.comskip_child = comskip_child;
  } else {
    // En este mismo proceso
    this.comskip = require('../build/Release/comskip');
    this.comskip.run(mpeg_file, this.ini_file(), this.logo_file(), this.output_dir(), result => {
      this.comskip_events.emit('finish', result);
      finish_cb(result);
    }, update_cb);
  }
};

module.exports = ComskipWrapper;
