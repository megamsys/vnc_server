var RFB = require('rfb');
var yaml = require('./vnc_config.js');
var Png = require('./../node_modules/png/build/Release/png').Png;

var currentTags = {};
var clients = [];
exports.conn = function(obj, socket, currentRoom) {
    var connection;
    try {
        connection = RFB({
            host: obj.Host,
            port: obj.Port,
            password: obj.Password,
        });
        setTimeout(function() {
            connection.requestRedraw();
        }, 200);
    } catch (e) {
        io.to(currentRoom[socket.id]).emit('error', "VNC client connection failed : " + e);
    }
    addEventHandlers(connection, socket, currentRoom);
    return connection;
}

exports.disconn = function(currentConnections, socket) {
    clients.forEach(function (client) {
    if (client.socket === socket) {
      console.log("disconnect rfb");
      client.rfb.end();
      clearInterval(client.interval);
    }
  });
  clients = clients.filter(function (client) {
    return client.socket === socket;
  });
}

exports.ss = function(socket, currentConnections) {
    var conn = currentConnections[socket.id];
    socket.on('mouse', function(evnt) {
        conn.sendPointer(evnt.x, evnt.y, evnt.button);
    });
    socket.on('keyboard', function(evnt) {
      console.log("keyboard event")
        conn.sendKey(evnt.keyCode, evnt.isDown);
    });
}

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

function addEventHandlers(r, socket, currentRoom) {
    var initialized = false;
    var screenWidth;
    var screenHeight;

    function handleConnection(width, height) {
        screenWidth = width;
        screenHeight = height;
        socket.emit('init', {
            width: width,
            height: height
        });
        clients.push({
            socket: socket,
            rfb: r,
            interval: setInterval(function() {
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

    r.on('error', function(e) {
        io.to(currentRoom[socket.id]).emit('error', "VNC client update failed : " + e);
    });

    r.on('raw', function(rect) {
        if (!initialized) {
            handleConnection(rect.width, rect.height);
        }
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

    r.on('*', function() {
        io.to(currentRoom[socket.id]).emit('error', "VNC client update failed.");
    });
}
