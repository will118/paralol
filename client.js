var http = require('http');
var fs = require('fs');
var co = require('co');

var server = 'http://192.168.1.65/';

var masterIp = '192.168.1.80'
var extraIps = ['192.168.1.312312']
var connectionCount = extraIps.length + 1;

function getFileData(filename) {
  http.get(server + filename, function(res) {
    res.setEncoding('utf8');
    res.on('data', function (json) {
      addDownloadJob(JSON.parse(json));
    });
  }).on('error', function(e) {
    console.log("Got error: " + e.message);
  });
}

function addDownloadJob(data) {
  var job = createDownloadJob(data);
  if (job && job.chunks) {
    var promises = job.chunks.map(function(x, i) {
      x.file = job.name;
      x.part = i;
      return download(x);
    });
    co(function *(){
      var res = yield promises;
      joinChunks(res);
    });
  }
}

function joinChunks(chunks) {
  if (chunks[0]) {
    var outStream = fs.createWriteStream(chunks[0].name);
    function join(xs) {
      if (xs) {
        var inStream = fs.createReadStream(xs[0].path);
        inStream.on('end', function() {
          if (xs.length == 1) {
            outStream.end();
            chunks.forEach(function(x) { fs.unlink(x.path); });
            console.log('File downloaded:', xs[0].name);
          } else {
            join(xs.slice(1));
          }
        });
      }
      inStream.pipe(outStream, {end: false});
    }
    join(chunks);
  }
}

function createDownloadJob(data) {
  if (data) {
    var chunkSizes = getChunkSizes(data.size, connectionCount);
    var position = 0;
    data.chunks = chunkSizes.map(function(x) {
      var chunk = {start: position, end: position + x};
      position = position + x;
      return chunk;
    });
  }
  return data;
}

function download(chunk) {
  var path = chunk.file + '_' + chunk.part;
  var file = fs.createWriteStream(path);
  return new Promise(function(resolve, reject) {
    http.get(server + 'chunk/' + chunk.file + '/' + chunk.start + '/' + chunk.end, function(response) {
      response.pipe(file);
      response.on('end', function() {
        resolve({part: chunk.part, name: chunk.file, path: path});
      });
    });
  });
}

function getChunkSizes(totalSize, numberOfChunks) {
  if (numberOfChunks > 1) {
    var avgChunkSize = totalSize / numberOfChunks;
    var smallChunkSize = Math.floor(avgChunkSize);
    var smallChunkCount = numberOfChunks - 1;
    var biggerChunkSize = totalSize - (smallChunkSize * smallChunkCount);
    var chunkSizes = Array.apply(null, new Array(smallChunkCount)).map(function() { return smallChunkSize; });
    chunkSizes.push(biggerChunkSize);
    if (chunkSizes.reduce(function(a, b) { return a + b; }) !== totalSize) {
      console.error("Chunk calculator failed");
    } else {
      return chunkSizes;
    }
  }

  return [totalSize];
}

getFileData('malca.mp3');
