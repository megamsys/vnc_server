var fs = require('fs'),
    net = require('net');
var yaml = require('./vnc_config.js');

var currentTags = {};
var clients = [];

exports.conn = function(obj, socket, currentRoom) {
    var r;
    try {
        r = net.createConnection(obj.Port, obj.Host, function() {
            //console.log('vnc server connected to ' + obj.Port);
        });
    } catch (e) {
        //console.log("vnc client connection failed : " + e);
        r.end();
    }
    addEventHandlers(r, socket, currentRoom);
    return r;
}

exports.disconn = function(currentConnections, socket) {
    clients.forEach(function(client) {
        if (client.socket === socket) {
            client.target.end();
        }
    });
    clients = clients.filter(function(client) {
        return client.socket === socket;
    });
}

exports.ss = function(socket, currentConnections) {
    var conn = currentConnections[socket._ultron.id];

    socket.on('message', function(msg) {
        if (socket.protocol === 'base64') {
            conn.write(new Buffer(msg, 'base64'));
        } else {
            conn.write(msg, 'binary');
        }
    });

    socket.on('close', function(code, reason) {
        //console.log('WebSocket client disconnected: ' + code + ' [' + reason + ']');
        conn.end();
    });

    socket.on('error', function(a) {
        //console.log('WebSocket client error: ' + a);
        conn.end();
    });
}

function addEventHandlers(r, socket, currentRoom) {

    r.on('data', function(data) {
        try {
            if (socket.protocol === 'base64') {
                socket.send(new Buffer(data).toString('base64'));
            } else {
                socket.send(data, {binary: true});
            }
        } catch (e) {
            //console.log("Client closed, cleaning up target");
            r.end();
        }
    });

    r.on('end', function() {
        //console.log('Client closed, cleaning up target');
        //currentRoom[socket._ultron.id].close();
    });

    r.on('error', function() {
        clients.forEach(function(client) {
            if (client.socket === socket) {
                client.target.end();
            }
        });
        //currentRoom[socket._ultron.id].close();
    });

    clients.push({socket: socket, target: r});

}
