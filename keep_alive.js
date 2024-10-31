const http = require('http');

http.createServer(function (req, res) {
    res.write("Ы, я живой.");
    res.end();
}).listen(8080);