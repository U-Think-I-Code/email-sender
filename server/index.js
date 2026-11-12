const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

let status = {
    total: 0,
    sent: 0,
    failed: 0,
    current: '',
    isSending: false,
    logs: []
};

app.get('/api/status', (req, res) => {
    res.json(status);
});

app.post('/api/send', upload.fields([{ name: 'csv', maxCount: 1 }, { name: 'attachments' }]), async (req, res) => {
    const { subject, template, smtpHost, smtpPort, smtpUser, smtpPass } = req.body;
    
    if (!req.files || !req.files.csv || req.files.csv.length === 0) {
        return res.status(400).json({ error: 'CSV file is required' });
    }

    const csvFile = req.files.csv[0];
    const attachmentFiles = req.files.attachments || [];

    // Filter out any manually attached edulogo.png to prevent duplicate/attachment display issues
    const mailAttachments = attachmentFiles
        .filter(file => file.originalname !== 'edulogo.png')
        .map(file => ({
            filename: file.originalname,
            path: file.path
        }));

    const recipients = [];
    fs.createReadStream(csvFile.path)
        .pipe(csv())
        .on('data', (data) => recipients.push(data))
        .on('end', async () => {
            fs.unlinkSync(csvFile.path); // Clean up
            
            status = {
                total: recipients.length,
                sent: 0,
                failed: 0,
                current: 'Starting...',
                isSending: true,
                logs: []
            };

            const transporter = nodemailer.createTransport({
                host: smtpHost,
                port: smtpPort,
                secure: smtpPort == 465,
                auth: {
                    user: smtpUser,
                    pass: smtpPass
                }
            });

            if (recipients.length > 0) {
                console.log('Parsed columns from CSV:', Object.keys(recipients[0]));
            }

            res.json({ message: 'Campaign started', total: recipients.length });

            for (const recipient of recipients) {
                if (!status.isSending) break;

                // Robustly find name and email from recipient keys (case-insensitive, trimmed, and stripping BOM)
                let name = 'Candidate';
                let email = '';
                const availableKeys = Object.keys(recipient).map(k => k.replace(/^\uFEFF/, '').trim());
                
                Object.keys(recipient).forEach(key => {
                    const normalizedKey = key.replace(/^\uFEFF/, '').toLowerCase().trim();
                    
                    if (
                        normalizedKey === 'name' || 
                        normalizedKey === 'full name' || 
                        normalizedKey === 'fullname' || 
                        normalizedKey === 'student name' || 
                        normalizedKey === 'candidate name' || 
                        normalizedKey === 'first name'
                    ) {
                        name = recipient[key];
                    }
                    
                    if (
                        normalizedKey === 'email' || 
                        normalizedKey === 'email address' || 
                        normalizedKey === 'email_address' || 
                        normalizedKey === 'email id' || 
                        normalizedKey === 'emailid' || 
                        normalizedKey === 'mail' ||
                        normalizedKey === 'to'
                    ) {
                        email = recipient[key];
                    }
                });

                if (!email) {
                    status.failed++;
                    status.logs.push(`Skipped: Missing email for "${name}". Available columns: [${availableKeys.join(', ')}]`);
                    continue;
                }

                // Replace placeholders (template is already HTML from ReactQuill)
                const htmlBody = template
                    .replace(/{{name}}/gi, name)
                    .replace(/{{first_name}}/gi, name)
                    .replace(/{{full_name}}/gi, name)
                    .replace(/{{email}}/gi, email);

                try {
                    await transporter.sendMail({
                        from: `HNtrix Limited <${smtpUser}>`,
                        to: email,
                        subject: subject,
                        html: htmlBody,
                        attachments: mailAttachments,
                        headers: {
                            'List-Unsubscribe': `<mailto:${smtpUser}?subject=unsubscribe>`,
                            'Precedence': 'bulk',
                            'X-Mailer': 'HNtrix Mailer 1.0',
                        }
                    });
                    status.sent++;
                    status.current = `Sent to ${email}`;
                    status.logs.push(`Success: ${email}`);
                } catch (error) {
                    status.failed++;
                    status.logs.push(`Failed: ${email} - ${error.message}`);
                }

                // Rate limiting: 1 second delay between emails
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            status.isSending = false;
            status.current = 'Completed';
            
            // Clean up attachments after campaign ends
            attachmentFiles.forEach(file => {
                try {
                    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
                } catch (e) {
                    console.error('Failed to delete attachment', e);
                }
            });
        });
});

app.post('/api/stop', (req, res) => {
    status.isSending = false;
    res.json({ message: 'Campaign stopping...' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Workaround for Node v25.2.0 bug where event loop doesn't stay alive for express listener
setInterval(() => {}, 1000 * 60 * 60);
