const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const routes = {
  '/': ['public/demo-qr.html','text/html; charset=utf-8'],
  '/demo-qr.html': ['public/demo-qr.html','text/html; charset=utf-8'],
  '/demo-machine-qr.svg': ['docs/demo-machine-qr.svg','image/svg+xml'],
  '/project-presentation.html': ['docs/project-presentation.html','text/html; charset=utf-8'],
};
http.createServer((req,res)=>{
  const route=routes[new URL(req.url,'http://localhost').pathname];
  if(!route || !['GET','HEAD'].includes(req.method)){res.writeHead(404);res.end('Not found');return;}
  fs.readFile(route[0],(error,data)=>{if(error){res.writeHead(404);res.end('File unavailable');return;}res.writeHead(200,{'Content-Type':route[1],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:data);});
}).listen(3080,'0.0.0.0',()=>{
  console.log('Demo: http://localhost:3080/demo-qr.html');
  for(const n of Object.values(os.networkInterfaces()).flat())if(n?.family==='IPv4'&&!n.internal)console.log(`Phone / network: http://${n.address}:3080/demo-qr.html`);
});
