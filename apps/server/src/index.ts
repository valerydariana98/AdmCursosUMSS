import http from 'node:http';

const PORT = process.env.PORT || 3001;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ message: 'Servidor corriendo correctamente' }));
});

server.listen(PORT, () => {
  console.log(` Servidor listo en http://localhost:${PORT}`);
});