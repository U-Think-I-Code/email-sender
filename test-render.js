const fs = require('fs');
const template = fs.readFileSync('./template.html', 'utf-8');

let htmlBody = template;
let fullHtml = htmlBody;
if (!htmlBody.toLowerCase().includes('<html')) {
    fullHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4;">
    <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 650px; margin: auto; padding: 20px;">
        ${htmlBody}
    </div>
</body>
</html>`;
}

fs.writeFileSync('./output.html', fullHtml);
console.log('Done');
