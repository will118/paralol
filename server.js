var express = require('express');
var bodyParser = require('body-parser')
var crypto = require('crypto');
var fs = require('fs');
var app = express();

app.use(bodyParser.json());

function getHash(filePath, cb) {
  fs.exists(filePath, function(exists) {
    if (exists) {
      var fd = fs.createReadStream(filePath);
      var hash = crypto.createHash('sha1');
      hash.setEncoding('hex');
      fd.on('end', function() {
        hash.end();
        cb(hash.read());
      });
      fd.pipe(hash);
    } else {
      cb(null);
    }
  });
}

function getPath(file) {
  if (file) {
    return __dirname + '/files/' + file;
  } else {
    return '';
  }
};

function fileNotFound(res) {
  res.status(403).send('File not found');
}

app.get('/:file', function(req, res) {
  var filePath = getPath(req.params.file);
  fs.exists(filePath, function (exists) {
    if (exists) {
      fs.stat(filePath, function(err, stats) {
        getHash(filePath, function(sha1) {
          res.send({
            size: stats.size,
            name: req.params.file,
            hash: sha1
          });
        });
      });
    } else {
      fileNotFound(res);
    }
  });
});

app.post('/chunk', function(req, res) {
  var r = req.body;
  if (r.file && r.start && r.end) {
    var filePath = getPath(r.file);
    fs.exists(filePath, function (exists) {
      if (exists) {
        var stream = fs.createReadStream(filePath, {start: r.start, end: r.end});
        stream.pipe(res);
      } else {
        fileNotFound(res);
      }
    });
  }
  res.status(403);
});

var server = app.listen(8080, function () {
  console.log('Started server...');
});