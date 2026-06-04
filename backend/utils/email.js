const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_FROM = process.env.RESEND_FROM || 'SMS Gateway <onboarding@resend.dev>';

const emailStyles = `font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f8fafc;`;
const containerStyle = `background-color: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);`;
const headerStyle = `text-align: center; margin-bottom: 32px; border-bottom: 1px solid #e2e8f0; padding-bottom: 24px;`;
const brandStyle = `font-size: 24px; font-weight: 700; color: #0f172a; text-decoration: none; letter-spacing: -0.5px;`;
const codeContainerStyle = `background-color: #f1f5f9; border-radius: 8px; padding: 16px; text-align: center; margin: 32px 0;`;
const codeStyle = `font-size: 32px; font-weight: 700; color: #0f172a; letter-spacing: 12px; font-family: monospace;`;
const footerStyle = `margin-top: 32px; text-align: center; font-size: 13px; color: #64748b;`;

async function sendOtpEmail(email, otp) {
    try {
        if (!process.env.RESEND_API_KEY) {
            console.warn('[WARN] RESEND_API_KEY is missing. Email not sent.');
            return;
        }

        const { data, error } = await resend.emails.send({
            from: EMAIL_FROM,
            to: email,
            subject: `Reset your SMS Gateway password`,
            html: `
                <div style="${emailStyles}">
                     <div style="${containerStyle}">
                        <div style="${headerStyle}">
                            <span style="${brandStyle}">SMS Gateway</span>
                        </div>
                        
                        <h2 style="color: #334155; font-size: 20px; margin-top: 0;">Reset your password</h2>
                        <p style="color: #475569; font-size: 16px; line-height: 1.6;">Hello,</p>
                        <p style="color: #475569; font-size: 16px; line-height: 1.6;">We received a request to reset your password for your SMS Gateway account. Enter the code below to reset it:</p>
                        
                        <div style="${codeContainerStyle}">
                            <span style="${codeStyle}">${otp}</span>
                        </div>
                        
                        <p style="color: #475569; font-size: 14px; margin-top: 0;">This code will expire in 10 minutes.</p>
                        <p style="color: #475569; font-size: 14px;">If you didn't ask to reset your password, you can ignore this email.</p>
                        
                        <div style="${footerStyle}">
                            <p>&copy; ${new Date().getFullYear()} SMS Gateway. All rights reserved.</p>
                        </div>
                    </div>
                </div>
            `,
            text: `Reset your SMS Gateway password. Your code is: ${otp}. This code expires in 10 minutes.`,
        });

        if (error) {
            console.error('[Resend Error]', error);
            throw new Error('Failed to send password reset email');
        }

        return data;
    } catch (error) {
        console.error('[Email Error]', error);
        throw error;
    }
}

module.exports = { sendOtpEmail };
