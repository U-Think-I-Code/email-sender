const https = require('https');
https.get('https://www.hntrix.com', (res) => {
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => {
        const matches = data.match(/https?:\/\/[^\s\"\'\>]+?\.(png|jpg|jpeg)/gi);
        console.log(Array.from(new Set(matches)));
    });
});
