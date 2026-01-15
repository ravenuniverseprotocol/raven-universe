const nodemailer = require('nodemailer');

class Mailer {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            tls: {
                rejectUnauthorized: false
            }
        });
    }

    async sendOTP(toEmail, code) {
        const mailOptions = {
            from: '"Raven Universe Command" <' + process.env.EMAIL_USER + '>',
            to: toEmail,
            subject: 'Raven Universe - Protocol Access Code',
            text: `Commander,\n\nYour verification code for the Raven Universe Uplink is:\n\n${code}\n\nThis code expires in 10 minutes.\n\n- Raven Command`,
            html: `
                <div style="background: #000; color: #0f0; padding: 20px; font-family: Courier New, monospace;">
                    <h2>Raven Universe Uplink</h2>
                    <p>Commander,</p>
                    <p>Your verification code is:</p>
                    <h1 style="color: #fff; border: 1px solid #0f0; display: inline-block; padding: 10px;">${code}</h1>
                    <p>This code expires in 10 minutes.</p>
                </div>
            `
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`[MAIL] OTP sent to ${toEmail}`);
            return true;
        } catch (error) {
            console.error('[MAIL] Error sending email:', error);
            return false;
        }
    }
}

module.exports = new Mailer();
