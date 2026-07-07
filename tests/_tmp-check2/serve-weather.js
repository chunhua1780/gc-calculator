require('http').createServer((req,res)=>{
  const fs=require('fs');
  const path=require('path');
  let p=req.url.split('?')[0];
  if(p==='/')p='/index.html';
  let fp=path.join('C:\\Users\\chunh\\Desktop\\gc-weather',decodeURIComponent(p));
  fs.readFile(fp,(err,data)=>{
    if(err){res.writeHead(404);res.end('not found');return;}
    const ext=path.extname(fp);
    const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css'};
    res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream'});
    res.end(data);
  });
}).listen(8878,()=>console.log('server up on 8878'));
