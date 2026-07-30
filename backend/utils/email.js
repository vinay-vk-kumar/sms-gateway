const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_FROM = process.env.RESEND_FROM || 'SMS Gateway <onboarding@resend.dev>';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const emailStyles = `font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f8fafc;`;
const containerStyle = `background-color: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); text-align: center;`;
const headerStyle = `margin-bottom: 32px; border-bottom: 1px solid #e2e8f0; padding-bottom: 24px;`;
const brandStyle = `font-size: 24px; font-weight: 700; color: #0f172a; text-decoration: none; letter-spacing: -0.5px;`;
const buttonStyle = `display: inline-block; background-color: #0f172a; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 14px; margin: 24px 0; border: 1px solid #000;`;
const footerStyle = `margin-top: 32px; font-size: 13px; color: #64748b;`;

async function sendPasswordResetEmail(email, token) {
    try {
        if (!process.env.RESEND_API_KEY) {
            console.warn('[WARN] RESEND_API_KEY is missing. Email not sent.');
            return;
        }

        const resetLink = `${FRONTEND_URL}/forgot-password?token=${token}`;

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
                        <p style="color: #475569; font-size: 16px; line-height: 1.6;">We received a request to reset your password. Click the button below to choose a new one:</p>
                        
                        <a href="${resetLink}" style="${buttonStyle}">Reset Password</a>
                        
                        <p style="color: #475569; font-size: 14px; margin-top: 0;">This link will expire in 10 minutes.</p>
                        <p style="color: #475569; font-size: 14px;">If you didn't ask to reset your password, you can ignore this email.</p>
                        
                        <div style="${footerStyle}">
                            <p>&copy; ${new Date().getFullYear()} SMS Gateway. All rights reserved.</p>
                        </div>
                    </div>
                </div>
            `,
            text: `Reset your SMS Gateway password by visiting this link: ${resetLink}. This link expires in 10 minutes.`,
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

async function sendVerificationEmail(email, token) {
    try {
        if (!process.env.RESEND_API_KEY) {
            console.warn('[WARN] RESEND_API_KEY is missing. Verification Email not sent.');
            return;
        }

        const verifyLink = `${FRONTEND_URL}/verify-email?token=${token}`;

        const { data, error } = await resend.emails.send({
            from: EMAIL_FROM,
            to: email,
            subject: `Verify your email address`,
            html: `
                <div style="${emailStyles}">
                     <div style="${containerStyle}">
                        <div style="${headerStyle}">
                            <span style="${brandStyle}">SMS Gateway</span>
                        </div>
                        
                        <h2 style="color: #334155; font-size: 20px; margin-top: 0;">Verify your email address</h2>
                        <p style="color: #475569; font-size: 16px; line-height: 1.6;">Welcome to SMS Gateway!</p>
                        <p style="color: #475569; font-size: 16px; line-height: 1.6;">Please click the button below to verify your email address and activate your account:</p>
                        
                        <a href="${verifyLink}" style="${buttonStyle}">Verify Email Address</a>
                        
                        <p style="color: #475569; font-size: 14px; margin-top: 0;">This link will expire in 10 minutes.</p>
                        
                        <div style="${footerStyle}">
                            <p>&copy; ${new Date().getFullYear()} SMS Gateway. All rights reserved.</p>
                        </div>
                    </div>
                </div>
            `,
            text: `Verify your email address by visiting this link: ${verifyLink}. This link expires in 10 minutes.`,
        });

        if (error) {
            console.error('[Resend Error]', error);
            throw new Error('Failed to send verification email');
        }

        return data;
    } catch (error) {
        console.error('[Email Error]', error);
        throw error;
    }
}

module.exports = {
    sendPasswordResetEmail,
    sendVerificationEmail
};
