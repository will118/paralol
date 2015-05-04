var hash = require('./hash');
var http = require('http');
var fs = require('fs');
var co = require('co');

var server = 'http://192.168.1.65';

var downloadIps = [
  '192.168.1.80',
  '192.168.1.93'
]
var connectionCount = downloadIps.length;

function getFileData(filename) {
  http.get(server + '/' + filename, function(res) {
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
      joinChunks(res, data.hash);
    });
  }
}

function joinChunks(chunks, serverSha1) {
  if (chunks[0]) {
    var filename = chunks[0].name;
    var outStream = fs.createWriteStream(filename);
    function join(xs) {
      if (xs) {
        var inStream = fs.createReadStream(xs[0].path);
        inStream.on('end', function() {
          if (xs.length == 1) {
            outStream.end();
            hash.get(filename, function(sha1) {
              if (sha1 === serverSha1) {
                chunks.forEach(function(x) { fs.unlink(x.path); });
                console.log('File downloaded:', filename, '\nSHA1 verified:', sha1);
              } else {
                console.log('Corrupt merged file:', filename, '\nHashes:', serverSha1, sha1);
              }
            });
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
      position = position + x + 1;
      return chunk;
    });
  }
  return data;
}

function reqFunc(file, path, chunk, resolve) {
  console.log(chunk);
  var ip = downloadIps[chunk.part % connectionCount];
  var options = {
      host: server.replace(/http:\/\//, ""),
      port: 80,
      path: '/chunk/' + chunk.file + '/' + chunk.start + '/' + chunk.end,
      method: 'GET',
      localAddress: ip
  };

  var req = http.request(options, function(res) {
    res.pipe(file, {end: true});
    res.on('end', function() {
      console.log('Fetched ' + path + ' on ' + ip);
      resolve({part: chunk.part, name: chunk.file, path: path});
    });
  });

  req.on('error', function(err) {
    console.log(err);
    console.log('Error downloading chunk:', path);
  });

  req.end();
}

function download(chunk) {
  var path = chunk.file + '_' + chunk.part;
  var file = fs.createWriteStream(path);
  return new Promise(function(resolve, reject) { reqFunc(file, path, chunk, resolve); });
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
