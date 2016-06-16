// Include the cluster module
var cluster = require('cluster');

// Code to run if we're in the master process
if (cluster.isMaster) {

	// Count the machine's CPUs
	//var cpuCount = require('os').cpus().length;
	var cpuCount = 1;
	// Create a worker for each CPU
	for (var i = 0; i < cpuCount; i += 1) {
		cluster.fork();

	}

	// Listen for dying workers
	cluster.on('exit', function(worker) {
		// Replace the dead worker, we're not sentimental
		console.log('Worker ' + worker.id + ' died :(');
		cluster.fork();
	});

	//Listen for connected worker
	cluster.on('listening', function(worker, address) {
		console.log("A worker is now connected to " + address.address + ":" + address.port);
	});

	//listen for disconnected worker
	cluster.on('disconnect', function(worker) {
		console.log('The worker #' + worker.id + ' has disconnected');
	});

	// Code to run if we're in a worker process
} else {
	require('./vnc.js');
	console.log('Worker ' + cluster.worker.id + ' running!');
}
