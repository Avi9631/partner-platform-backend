const { Worker } = require('bullmq');
const { getRedisConfig } = require('../config/redis.config');
const logger = require('../config/winston.config.js');
const nodemailer = require('nodemailer');

/**
 * Email Worker
 * Processes email jobs from the queue
 * Using official redis package with BullMQ
 */

let emailWorker = null;
let transporter = null;

// Initialize email transporter
const initializeTransporter = async () => {
    if (transporter) {
        return transporter;
    }

    try {
        const emailConfig = {
            host: process.env.SMTP_HOST || 'smtp.hostinger.com',
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true' || false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            },
            tls: {
                rejectUnauthorized: false
            },
            connectionTimeout: 60000,
            greetingTimeout: 30000,
            socketTimeout: 60000
        };

        if (!emailConfig.auth.user || !emailConfig.auth.pass) {
            logger.warn('SMTP credentials not found. Email worker will not be able to send emails.');
            return null;
        }

        transporter = nodemailer.createTransport(emailConfig);

        // Verify connection
        await transporter.verify();
        logger.info('Email transporter verified and ready');

        return transporter;
    } catch (error) {
        logger.error('Failed to initialize email transporter:', error);
        return null;
    }
};

// Helper function to send course invite email
const sendCourseInviteEmail = async (emailData) => {
    const {
        courseName,
        courseDescription,
        inviterName,
        inviterEmail,
        inviteeEmail,
        accessLevel,
        acceptUrl,
        expiresAt,
        message
    } = emailData;

    const expirationDate = new Date(expiresAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Course Invitation</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #ffffff; padding: 30px; border: 1px solid #e9ecef; }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #6c757d; }
            .btn { display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .btn:hover { background-color: #0056b3; }
            .alert { background-color: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 4px; margin: 15px 0; }
            .access-badge { background-color: #e9ecef; color: #495057; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
            .course-info { background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0; color: #007bff;">Course Invitation</h1>
            </div>
            
            <div class="content">
                <h2>You're invited to join a course!</h2>
                
                <p>Hello!</p>
                
                <p><strong>${inviterName}</strong> has invited you to join the course:</p>
                
                <div class="course-info">
                    <h3 style="margin: 0 0 10px 0;">${courseName}</h3>
                    ${courseDescription ? `<p style="margin: 0; color: #666;">${courseDescription}</p>` : ''}
                    <p style="margin: 10px 0 0 0;"><strong>Access Level:</strong> <span class="access-badge">${accessLevel}</span></p>
                </div>
                
                ${message ? `<div class="alert"><strong>Personal Message:</strong><br>${message}</div>` : ''}
                
                <p>Click the button below to accept this invitation and start learning:</p>
                
                <div style="text-align: center;">
                    <a href="${acceptUrl}" class="btn">Accept Invitation</a>
                </div>
                
                <div class="alert">
                    <strong>Important:</strong> This invitation will expire on <strong>${expirationDate}</strong>. 
                    Please accept it before then to access the course.
                </div>
                
                <p>If you can't click the button above, you can copy and paste this link into your browser:</p>
                <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace;">${acceptUrl}</p>
                
                <p>If you don't want to join this course, you can safely ignore this email.</p>
                
                <p>For any questions, please contact <strong>${inviterEmail}</strong></p>
            </div>
            
            <div class="footer">
                <p>This invitation was sent through FeedAQ Academy.</p>
                <p>&copy; ${new Date().getFullYear()} FeedAQ Academy. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    const mailOptions = {
        from: `"Huskite" <${process.env.SMTP_USER}>`,
        to: inviteeEmail,
        subject: `Invitation to join "${courseName}"`,
        html: emailHtml,
        replyTo: inviterEmail
    };

    return mailOptions;
};

// Job processor function
const processEmailJob = async (job) => {
    const { name, data } = job;

    logger.info(`Processing email job: ${job.id}, type: ${name}`);

    try {
        // Initialize transporter if not already done
        const emailTransporter = await initializeTransporter();
        if (!emailTransporter) {
            throw new Error('Email transporter not initialized - SMTP credentials missing');
        }

        let mailOptions;

        // Handle different job types
        switch (name) {
            case 'course-invite':
                mailOptions = await sendCourseInviteEmail(data);
                break;

            case 'send-email':
                mailOptions = {
                    from: data.from || `"Huskite" <${process.env.SMTP_USER}>`,
                    to: data.to,
                    subject: data.subject,
                    text: data.text,
                    html: data.html,
                    ...(data.cc && { cc: data.cc }),
                    ...(data.bcc && { bcc: data.bcc }),
                    ...(data.attachments && { attachments: data.attachments }),
                    ...(data.replyTo && { replyTo: data.replyTo })
                };
                break;

            case 'test-email':
                mailOptions = {
                    from: `"Huskite" <${process.env.SMTP_USER}>`,
                    to: data.to,
                    subject: data.subject || 'Test Email',
                    html: '<h1>Test Email</h1><p>Email service is working correctly!</p>'
                };
                break;

            default:
                throw new Error(`Unknown job type: ${name}`);
        }

        // Send email
        const result = await emailTransporter.sendMail(mailOptions);

        logger.info(`Email sent successfully: ${job.id}, messageId: ${result.messageId}`);

        return {
            success: true,
            messageId: result.messageId,
            jobId: job.id
        };

    } catch (error) {
        logger.error(`Failed to process email job ${job.id}:`, error);
        throw error; // BullMQ will handle retries
    }
};

// Start the email worker
const startEmailWorker = () => {
    if (emailWorker) {
        logger.warn('Email worker already running');
        return emailWorker;
    }

    try {
        // BullMQ will create its own connection using the config
        const connection = getRedisConfig();

        emailWorker = new Worker('email-queue', processEmailJob, {
            connection,
            concurrency: 5, // Process 5 jobs concurrently
            limiter: {
                max: 10, // Maximum 10 jobs
                duration: 1000 // Per second
            }
        });

        // Worker event listeners
        emailWorker.on('completed', (job, result) => {
            logger.info(`Email job ${job.id} completed successfully`, result);
        });

        emailWorker.on('failed', (job, error) => {
            logger.error(`Email job ${job?.id} failed:`, error);
        });

        emailWorker.on('error', (error) => {
            logger.error('Email worker error:', error);
        });

        emailWorker.on('stalled', (jobId) => {
            logger.warn(`Email job ${jobId} stalled`);
        });

        logger.info('Email worker started successfully');

        return emailWorker;
    } catch (error) {
        logger.error('Failed to start email worker:', error);
        throw error;
    }
};

// Stop the email worker gracefully
const stopEmailWorker = async () => {
    if (emailWorker) {
        try {
            logger.info('Stopping email worker gracefully...');
            
            // Close the worker gracefully - waits for active jobs to complete
            // Set force: false to allow current jobs to finish (default behavior)
            await emailWorker.close();
            
            emailWorker = null;
            logger.info('Email worker stopped successfully - all active jobs completed');
        } catch (error) {
            logger.error('Failed to stop email worker:', error);
            throw error;
        }
    } else {
        logger.info('Email worker was not running');
    }
};

// Initialize worker on module load
if (process.env.START_EMAIL_WORKER !== 'false') {
    initializeTransporter().then(() => {
        startEmailWorker();
    }).catch((error) => {
        logger.error('Failed to initialize email worker:', error);
    });
}

module.exports = {
    startEmailWorker,
    stopEmailWorker,
    processEmailJob
};
