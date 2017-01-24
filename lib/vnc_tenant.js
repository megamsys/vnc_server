/*
 ** Copyright [2013] [Megam Systems]
 **
 ** Licensed under the Apache License, Version 2.0 (the "License");
 ** you may not use this file except in compliance with the License.
 ** You may obtain a copy of the License at
 **
 ** http://www.apache.org/licenses/LICENSE-2.0
 **
 ** Unless required by applicable law or agreed to in writing, software
 ** distributed under the License is distributed on an "AS IS" BASIS,
 ** WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 ** See the License for the specific language governing permissions and
 ** limitations under the License.
 */

var http = require('http');
var url = require('url');
var tenantNumber = 1;
var nickNames = {};
var currentRoom = {};
var currentConnections = {};
var path,
    roomname;
var namesUsed = [];

var vncdb = require('./vnc_source.js');
var vnc = require("../vnc.js");
var fs = require('fs'),
    net = require('net');
// Process an HTTP static file request
exports.http_request = function(request, response) {

    /*  var uri = url.parse(request.url).pathname,
        filename = path.join("", uri);

    fs.exists(filename, function(exists) {
        if (!exists) {
            return http_error(response, 404, "404 Not Found");
        }

        if (fs.statSync(filename).isDirectory()) {
            filename += '/index.html';
        }

        fs.readFile(filename, "binary", function(err, file) {
            if (err) {
                return http_error(response, 500, err);
            }

            response.writeHead(200);
            response.write(file, "binary");
            response.end();
        });
    });*/
};

// Select 'binary' or 'base64' subprotocol, preferring 'binary'
exports.selectProtocol = function(protocols, callback) {
    if (protocols.indexOf('binary') >= 0) {
        callback(true, 'binary');
    } else if (protocols.indexOf('base64') >= 0) {
        callback(true, 'base64');
    } else {
        //console.log("Client must support 'binary' or 'base64' protocol");
        callback(false);
    }
};

/**
 * Export the socket io's listen function.
 */
exports.listen = function(socket) {
    //console.log("==> listen called <==");

    /**
 		 * create a random tenant name attached to a node. for instance each
 		 * tenant <localhost>/stream/node1 will be assigned a name tenant_001.
 		 * They will be joined to "node1". It is assumed that multiple tenants
 		 * can watch node 1.
 		 */

    /*
 		* import the request id from tap.js and this logname is equal redis
 		* key
 		*/
    var location = url.parse(socket.upgradeReq.url, true);
    var path_arr = location.path.split("/");

    if (validateIPaddress(path_arr[1])) {
        var data = {
            "Port": path_arr[2],
            "Host": path_arr[1]
        };
        tenantNumber = assignTenantName(socket, tenantNumber, nickNames, namesUsed);
        handleMessageBroadcasting(data, socket, currentRoom);
        joinTenantToNode(socket, socket._ultron.id + "_" + data.Port);
    }

    socket.on('close', function(code, reason) {
        //console.log("==> socket disconnection <==");
        var nameIndex = namesUsed.indexOf(nickNames[socket._ultron.id]);
        var disconn = vncdb.disconn(currentConnections, socket);
        delete nickNames[socket._ultron.id];
        delete currentRoom[socket._ultron.id];
        delete currentConnections[socket._ultron.id];
    });
};

function assignTenantName(socket, tenantNumber, nickNames, namesUsed) {
    var name = 'Tenant' + tenantNumber;
    nickNames[socket._ultron.id] = name;
    namesUsed.push(name);
    // Megam test: check currect room
    return tenantNumber + 1;
}

function joinTenantToNode(socket, room) {
    //socket.join(room);
    currentRoom[socket._ultron.id] = room;
    return currentRoom[socket._ultron.id];
}

function joinVNCToNode(connection, socket) {
    currentConnections[socket._ultron.id] = connection;
    return currentConnections[socket._ultron.id];
}

function handleMessageBroadcasting(obj, socket, currentRoom) {
    //console.log("VNC Handle ==> " + obj.Port);
    var connection = vncdb.conn(obj, socket, currentRoom);
    joinVNCToNode(connection, socket);
    var message = vncdb.ss(socket, currentConnections);
}

function validateIPaddress(ipaddress) {
    var ipformat = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (ipaddress.match(ipformat)) {
        return (true)
    }
    return (false)
}
