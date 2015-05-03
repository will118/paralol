var crypto = require('crypto');
var fs = require('fs');

module.exports = {

  get: function(filePath, cb) {
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

}
