var http = require('http');

var server = 'http://192.168.1.65/';

function getFileData(filename) {
  http.get(server + filename, function(res) {
    console.log(res);
  }).on('error', function(e) {
    console.log("Got error: " + e.message);
  });
}

function getChunkSizes(totalSize, numberOfChunks) {
  if (numberOfChunks > 1) {
    var avgChunkSize = totalSize / numberOfChunks;
    var smallChunkSize = Math.floor(avgChunkSize);
    var smallChunkCount = numberOfChunks - 1;
    var biggerChunkSize = totalSize - (smallChunkSize * smallChunkCount);
    var chunks = Array.apply(null, new Array(smallChunkCount)).map(function() { return smallChunkSize; });
    chunks.push(biggerChunkSize);
    if (chunks.reduce(function(a, b) { return a + b; }) !== totalSize) {
      console.error("Chunk calculator failed");
    } else {
      return chunks;
    }
  }

  return [totalSize];
}

getFileData('malca.mp3');
