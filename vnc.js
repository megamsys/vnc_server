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

var fs = require('fs'),
    net = require('net'),
    util = require('util'),
    url = require('url'),
    http = require('http'),
    path = require('path'),
    mime = require('mime');
    policyfile = require('policyfile'),
    Buffer = require('buffer').Buffer,
    WebSocketServer = require('ws').Server,
    webServer = null,
    wsServer = null,
    web_path = null;

var vnc_tenant = require('./lib/vnc_tenant.js');
var yaml = require('./lib/vnc_config.js');

// This line is from the Node.js HTTPS documentation.
//var options = {
//  key: fs.readFileSync('/etc/nginx/private/console.megam.io.key'),
//  cert: fs.readFileSync('/etc/nginx/certs/console.megam.io.pub')
//};

/**
 * Create a server to listen on port 7000. TO-DO: Make port configurable in a js
 * or json file.
 */
/*var express = require('express');
var app = express();
var server = http.createServer(app)
//var server = https.createServer(options, app)
vnc_tenant.listen(server);

server.listen(yaml.config.server.port);
console.log("VNC Server:" + yaml.version + " listening on port =" + yaml.config.server.port);
*/
/* This take the typical use-case of serving files in ./public */
//app.use(express.static(__dirname + '/public'));

webServer = http.createServer(vnc_tenant.http_request);
webServer.listen(yaml.config.server.port, function() {
    wsServer = new WebSocketServer({server: webServer,
                                    handleProtocols: vnc_tenant.selectProtocol});
    wsServer.on('connection', vnc_tenant.listen);
});

// Attach Flash policyfile answer service
policyfile.createServer().listen(-1, webServer);
