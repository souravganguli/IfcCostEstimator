const http = require('http');
const port = process.env.PORT || 3000

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/html' })
  fs.createReadStream('start.html').pipe(res)
});

server.listen(port,() => {
  console.log(`Server running at port `+port);
});