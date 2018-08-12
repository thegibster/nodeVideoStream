'use strict';
//Streaming video content to the browser
const { createServer } = require('http');
const { stat, createReadStream, createWriteStream }  = require('fs');
const { promisify } = require('util');
const file  = './video.mp4';
const fileInfo = promisify(stat);
const multiparty = require('multiparty');

const respondWithVideo =  async (req, res) => {
  const { size } = await fileInfo(file);
  const range = req.headers.range;
  if(range) {
    let [start, end] = range.replace(/bytes=/, '').split('-');
    start = parseInt(start, 10); // baseten
    end = end ? parseInt(end, 10) : size - 1;
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Accept_Ranges': 'bytes',
      'Content-Length': (end-start) + 1,
      'Content-Type': 'video/mp4'
    });
    createReadStream(file, { start, end })
      .pipe(res)
      .on('error', console.error);

  } else {
    res.writeHeader(200, {
      'Content-Length': size,
      'Content-Type': 'video/mp4'
    });
    createReadStream(file)
      .pipe(res)
      .on('error', console.error);
  }
}

createServer((req,res) => {
  if (req.method === 'POST') {
    let form = new multiparty.Form();
    form.on('part', (part) => {
      part.pipe(createWriteStream(`./${part.filename}`))
      .on('close', () => {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`<h1>File uploaded: ${part.filename}</h1>`);
      })
    });
    form.parse(req);
  } else if (req.url === '/video'){
    respondWithVideo(req,res);
  } else {
    res.writeHead(200, {'Content-Type': 'text/html' });
    res.end(`
      <form enctype="multipart/form-data" method="POST" action="/">
        <input type="file" name="upload-file" />
        <button>Upload File</button>
      </form>
      `);
  }
}).listen(3000, () => console.log('stream server - http://localhost:3000'));
