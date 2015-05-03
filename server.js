var bodyParser = require('body-parser')
var express = require('express');
var hash = require('./hash');
var fs = require('fs');
var app = express();

app.use(bodyParser.json());

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
        hash.get(filePath, function(sha1) {
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

app.get('/chunk/:file/:start/:end', function(req, res) {
  var r = req.params;
  if (r && r.file && r.start && r.end) {
    var filePath = getPath(r.file);
    fs.exists(filePath, function (exists) {
      if (exists) {
        var opt = {start: parseInt(r.start), end: parseInt(r.end)}
        var stream = fs.createReadStream(filePath, opt);
        stream.pipe(res);
      } else {
        fileNotFound(res);
      }
    });
  } else {
    fileNotFound(res);
  }
});

app.listen(8080);
