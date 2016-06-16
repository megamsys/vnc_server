var forever = require('forever-monitor');
var util = require('util'), path = require('path');

script = path.join(__dirname, './vnc_cluster.js');

var child1 = new (forever.Monitor)(script, {
	'options' : ["--conf=default"]
});
child1.start();

child1.on('exit', function() {
	console.log('your-filename.js has exited after 3 restarts');
});
