'use strict';

var RFB = require('rfb');
var io = require('socket.io');
var path = require("path");
var bodyParser = require('body-parser');
//var cio = require('socket.io-client');
var Png = require('./node_modules/png/build/Release/png').Png;
//var Png = require('./node_modules/node-png/lib/png').Png;
var express = require('express');
var http = require('http');
var clients = [];
var Config = {
   HTTP_PORT: 8090
 };

function encodeFrame(rect) {
  var rgb = new Buffer(rect.width * rect.height * 3, 'binary');
  var offset = 0;

  for (var i = 0; i < rect.fb.length; i += 4) {
    rgb[offset] = rect.fb[i + 2];
    offset += 1;
    rgb[offset] = rect.fb[i + 1];
    offset += 1;
    rgb[offset] = rect.fb[i];
    offset += 1;
  }
  var image = new Png(rgb, rect.width, rect.height, 'rgb');
  return image.encodeSync();
}

function addEventHandlers(r, socket) {
  var initialized = false;
  var screenWidth;
  var screenHeight;

  function handleConnection(width, height) {
    screenWidth = width;
    screenHeight = height;
    console.info('RFB connection established');
    socket.emit('init', {
      width: width,
      height: height
    });
    clients.push({
      socket: socket,
      rfb: r,
      interval: setInterval(function () {
        r.requestUpdate({
          x: 0,
          y: 0,
          width: width,
          height: height,
          subscribe: 1
        });
      }, 50)
    });
    r.requestRedraw();
    initialized = true;
  }

  r.on('error', function (e) {
    console.error('Error while talking with the remote RFB server', e);
  });

  r.on('raw', function (rect) {
    if (!initialized) {
      console.log("---------------not initialized-----------------");
      handleConnection(rect.width, rect.height);
    }
    console.log(rect);
    socket.emit('frame', {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      image: encodeFrame(rect).toString('base64')
    });
    r.requestUpdate({
      x: 0,
      y: 0,
      subscribe: 1,
      width: screenWidth,
      height: screenHeight
    });
  });

  r.on('*', function () {
    console.error(arguments);
  });
}

function createRfbConnection(config, socket) {
  var r;
  try {
    r = RFB({
      host: config.host,
      port: config.port,
      password: config.password,
    });
    setTimeout(function () {
      r.requestRedraw();
    }, 200);
  } catch (e) {
    console.log(e);
  }
  addEventHandlers(r, socket);
  return r;
}

function disconnectClient(socket) {
  clients.forEach(function (client) {
    if (client.socket === socket) {
      client.rfb.end();
      clearInterval(client.interval);
    }
  });
  clients = clients.filter(function (client) {
    return client.socket === socket;
  });
}

function socket1(server, host, port) {
  io = io.listen(server, { log: false, 'transports':['xhr-polling','polling', 'websocket', 'flashsocket'], });
  io.sockets.on('connection', function (socket) {
    console.info('Client connected');
    //connect(config);
    var r = createRfbConnection({host: host, port: port, password: ""}, socket);
    socket.on('mouse', function (evnt) {
      r.sendPointer(evnt.x, evnt.y, evnt.button);
    });
    socket.on('keyboard', function (evnt) {
      r.sendKey(evnt.keyCode, evnt.isDown);
      console.info('Keyboard input');
    });
    socket.on('disconnect', function () {
      disconnectClient(socket);
      console.info('Client disconnected');
    });
  });
}

function socket2(server) {
  io = io.listen(server, { log: false, 'transports':['xhr-polling','polling', 'websocket', 'flashsocket'], });
  io.sockets.on('connection', function (socket) {
    console.info('Client connected');

    socket.on('init', function (config) {
      //connect(config);
      var r = createRfbConnection(config, socket);
      socket.on('mouse', function (evnt) {
        r.sendPointer(evnt.x, evnt.y, evnt.button);
      });
      socket.on('keyboard', function (evnt) {
        r.sendKey(evnt.keyCode, evnt.isDown);
        console.info('Keyboard input');
      });
      socket.on('disconnect', function () {
        disconnectClient(socket);
        console.info('Client disconnected');
      });
    });
  });
}

(function () {
  var app = express();
  var server = http.createServer(app);

  app.use(express.static(__dirname + '/static/'));
  app.use(bodyParser.urlencoded({ extended: true }));

  app.get('/', function(req, res){
    socket2(server);
    response.sendfile(path.join(__dirname+'/static/index.html'));
  });

  app.post('/vnc', function(req, res){
    socket1(server, req.body.host, req.body.port);
    res.sendfile(path.join(__dirname+'/static/vnc.html'));
  });

  server.listen(Config.HTTP_PORT);

  console.log('Listening on port', Config.HTTP_PORT);

}());
