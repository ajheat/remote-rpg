// Include the cluster module
var cluster = require('cluster');

// Code to run if we're in the master process
if (cluster.isMaster) {

    // Count the machine's CPUs
    var cpuCount = require('os').cpus().length;

    // Create a worker for each CPU
    for (var i = 0; i < cpuCount; i += 1) {
        cluster.fork();
    }

    // Listen for terminating workers
    cluster.on('exit', function (worker) {

        // Replace the terminated workers
        console.log('Worker ' + worker.id + ' died :(');
        cluster.fork();

    });

// Code to run if we're in a worker process
} else {
    var AWS = require('aws-sdk');
    var express = require('express');
    var bodyParser = require('body-parser');

    AWS.config.region = process.env.REGION

    var sns = new AWS.SNS();
    var ddb = new AWS.DynamoDB();

    var ddbTable =  process.env.STARTUP_STATE_TABLE;
    var app = express();

    app.set('view engine', 'ejs');
    app.set('views', __dirname + '/views');
    app.use(bodyParser.urlencoded({extended:false}));
	app.use(express.static(__dirname + '/public'));

    app.get('/', function(req, res) {
        res.render('index', {
            static_path: 'static',
			css_path: 'css',
			js_path: 'js',
            theme: process.env.THEME || 'flatly',
            flask_debug: process.env.FLASK_DEBUG || 'false'
        });
    });
	
	app.post('/tokenchange', function(req, res) {
		var primary_key = {'grid_id': {'S': req.body.id}};
		var expression = 'SET token_states = :s';
		var expression_values = {':s': {'S': req.body.tokenString}};
		
		ddb.updateItem({
			'TableName': ddbTable,
			'Key': primary_key,
			'UpdateExpression': expression,
			'ExpressionAttributeValues': expression_values
		}, function(err, data) {
			if (err) {
                var returnStatus = 500;

                if (err.code === 'ConditionalCheckFailedException') {
                    returnStatus = 409;
                }

                res.status(returnStatus).end();
                console.log('DDB Error: ' + err);
			}
		});
	});
	
	app.post('/dimensionschange', function(req, res) {
		var primary_key = {'grid_id': {'S': req.body.id}};
		var expression = 'SET grid_rows = :r, grid_cols = :c';
		var expression_values = {':r': {'N': req.body.rows}, ':c': {'N': req.body.columns}};
		
		ddb.updateItem({
			'TableName': ddbTable,
			'Key': primary_key,
			'UpdateExpression': expression,
			'ExpressionAttributeValues': expression_values
		}, function(err, data) {
			if (err) {
                var returnStatus = 500;

                if (err.code === 'ConditionalCheckFailedException') {
                    returnStatus = 409;
                }

                res.status(returnStatus).end();
                console.log('DDB Error: ' + err);
			}
		});
	});
	
	app.post('/gridstate', function(req, res) {
		var primary_key = {'grid_id': {'S': req.body.id}};
		
		ddb.getItem({
			'TableName': ddbTable,
			'Key': primary_key
		}, function(err, data) {
			if (err) {
                var returnStatus = 500;

                if (err.code === 'ConditionalCheckFailedException') {
                    returnStatus = 409;
                }

                res.status(returnStatus).end();
                console.log('DDB Error: ' + err);
			} else {
				var returnData = {};
				returnData.tokens = data.Item.token_states.S;
				returnData.rows = data.Item.grid_rows.N;
				returnData.cols = data.Item.grid_cols.N;
				
				res.json(returnData);
				console.log(returnData);
			}
		});
	});

    var restPort = process.env.PORT || 3000;

    var server = app.listen(restPort, function () {
        console.log('Server running at http://127.0.0.1:' + restPort + '/');
    });
}