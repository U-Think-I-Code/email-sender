const fs = require('fs');
const https = require('https');

const data = fs.readFileSync('src/assets/edulogo.png');

const options = {
    hostname: 'api.imgbb.com',
    port: 443,
    path: '/1/upload?key=e0b1d3d0c92d5c8088ebcfc166d338a0', // Free public test key
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
    }
};

const req = https.request(options, (res) => {
    let d = '';
    res.on('data', (chunk) => { d += chunk; });
    res.on('end', () => {
        try {
            console.log("URL: " + JSON.parse(d).data.url);
        } catch(e) {
            console.log(d);
        }
    });
});

req.write('image=' + encodeURIComponent(data.toString('base64')));
req.end();
