var http = require('http');
var url = require('url');
var formidable = require('./lib/formidable');
var sys = require('sys');
var fs = require('fs');
var crypto = require('crypto');
var paperboy = require('./lib/paperboy');

var temp_path = './tmp';
var public_path = './public';
var upload_dir = 'uploads';
var upload_path = path.join(path.dirname(__filename), public_path + '/' + upload_dir);

var view_path = './views';
var view_cache = {};

var progress_cache = {}; 
var filename_cache = {};
var description_cache = {};

// HTTP Server
var server = http.createServer(function(req, res) {
	// Simple Router
	switch (true) {
		case req.url == '/':
			index(req, res);
			break;
		case RegExp('/upload/(.+)').test(req.url) && req.method.toUpperCase() == 'POST':
			upload(req, res, RegExp.$1);
			break;
		case RegExp('/description/(.+)').test(req.url) && req.method.toUpperCase() == 'POST':
			description(req, res, RegExp.$1);
			break;
		case RegExp('/progress/(.+)').test(req.url) && req.method.toUpperCase() == 'GET':
			progress(req, res, RegExp.$1);
			break;
		default:
		// Static content + 404
			paperboy
	    	.deliver(path.join(path.dirname(__filename), public_path), req, res)
			break;
	}
});

// Start server
server.listen(1337);

// Render view file in view_path. Replace %placeholders% with locals.
function render_view(view_name, locals){	
	var view = view_cache[view_name];

	if(!view) {
		view = fs.readFileSync(view_path + '/' + view_name + '.view.html').toString();
		view_cache[view_name] = view;
	}

	if (locals != 'undefined') {
		for (l in locals) {
			var searchfor = '%' + l + '%';
			view = view.replace(new RegExp(searchfor, 'g'), locals[l]);
		}
	}

	return view;
}

// Genearte UUID based on remote address
function gen_uuid(remote_addr) {
	var random = '';
	for (var i=0; i < 32; i++) {
		random += Math.floor(Math.random() * 16).toString(16); 
	}
	return crypto.createHash('md5').update(random + remote_addr).digest('hex');
}

// Show upload form
function index(req, res) {
	//IE Cache Fix
	res.writeHeader(200, {'Content-Type': 'text/html',
	'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate', 
	'Pragma' : 'no-cache', 'Expires': 'Fri, 01 Jan 1990 00:00:00 GMT'});
	
	// No collisions
	do {
		uuid = gen_uuid(req.connection.remoteAddress);
    } while(progress_cache[uuid]);

	var locals = {};
	locals['UUID'] = uuid;

	progress_cache[uuid] = 'ready';

	res.write(render_view('index', locals));
	res.end();
}

// Upload
function upload(req, res, params) {
	if(progress_cache[params] != 'ready') {
			res.writeHead(200, {'Content-Type': 'text/plain'});
			res.write('Invalid Upload UUID :(');
			res.end();
			return;
	}
	
	var form = new formidable.IncomingForm();

	filename_cache[params] = 'uploading';
	form.uploadDir = temp_path;
	
	form.addListener('progress', function(rec, tot) {
		var progress = parseInt(rec / tot * 100);
		progress_cache[params] = progress;
	});
	
	form.parse(req, function(err, fields, files) {
		if(err) {
			delete progress_cache[params];
			res.writeHead(200, {'Content-Type': 'text/plain'});
			res.write('Error :(');
			res.end();
			return;
		}
		
		var filename = files['file']['filename'];
		var filepath = files['file']['path'];
		fs.mkdirSync(upload_path + '/' + params, 0755);
		fs.renameSync(filepath, upload_path + '/' + params + '/' + filename);
		filename_cache[params] = filename;
		res.writeHead(200, {'Content-Type': 'text/plain'});
		res.write('OK :)');
		res.end();
	});
}

// Progress AJAX
function progress(req, res, params) {
	if(!progress_cache[params]) {
		res.writeHead(200, {'Content-Type': 'application/json'});
	    res.write(JSON.stringify({'progress': 0, 'path': '#'}));
	    res.end();
		return;
	}
	var path = '/' + upload_dir + '/' + params + '/' + filename_cache[params];
	
	if(!filename_cache[params] || filename_cache[params] == 'uploading') {
		path = '#';
	}
	
	// IE Cache Fix
	res.writeHead(200, {'Content-Type': 'application/json', 
	'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate', 
	'Pragma' : 'no-cache', 'Expires': 'Fri, 01 Jan 1990 00:00:00 GMT'});
	res.write(JSON.stringify({'progress': progress_cache[params], 
		'path': path }));
	res.end();
}

// Description
function description(req, res, params) {
	if(progress_cache[params] != 100) {
		res.writeHead(200, {'Content-Type': 'text/plain'});
		res.write('Invalid Upload UUID :(');
		res.end();
		return;
	}
	delete progress_cache[params];
	
	var form = new formidable.IncomingForm();

	form.type = 'urlencoded';	
	form.encoding = 'utf-8';
	
	form.parse(req, function(err, fields, files) {
		var description = fields['description'];
		description_cache[params] = description;
		
		var locals = {};
		locals['PATH'] = '/' + upload_dir + '/' + params + '/' + filename_cache[params];
		locals['DESCRIPTION'] = description;
		
		res.writeHeader(200, {'Content-Type': 'text/html'});
		res.write(render_view('description', locals));
		
		res.end();
	});
}




