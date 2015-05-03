var http = require('http');
var fs = require('fs');

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
    job.chunks.forEach(function(x, i) {
      x.file = job.name;
      x.part = i;
      download(x);
    });
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
  var file = fs.createWriteStream(chunk.part + chunk.file);
  http.get(server + 'chunk/' + chunk.file + '/' + chunk.start + '/' + chunk.end, function(response) {
    response.pipe(file);
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
