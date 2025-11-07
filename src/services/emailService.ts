import nodemailer from 'nodemailer';
import { config } from '../config/app';

export interface BookingEmailData {
  passengerName: string;
  passengerEmail: string;
  bookingCode: string;
  travelDate: string;
  departureCity: string;
  arrivalCity: string;
  departureTime: string;
  arrivalTime: string;
  busCompany: string;
  plateNumber: string;
  seatNumber: number;
  price: number;
  distance?: number;
  duration?: number;
}

export interface BookingCancellationEmailData {
  passengerName: string;
  passengerEmail: string;
  bookingCode: string;
  travelDate: string;
  departureCity: string;
  arrivalCity: string;
  refundAmount?: number;
}

export interface BookingReminderEmailData {
  passengerName: string;
  passengerEmail: string;
  bookingCode: string;
  travelDate: string;
  departureCity: string;
  arrivalCity: string;
  departureTime: string;
  busCompany: string;
  plateNumber: string;
  seatNumber: number;
  hoursUntilDeparture: number;
}

export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;

  /**
   * Initialize email transporter
   */
  private static async getTransporter(): Promise<nodemailer.Transporter> {
    if (this.transporter) {
      return this.transporter;
    }

    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: false,
      auth: {
        user: config.email.user,
        pass: config.email.password,
      },
    });

    // Verify connection
    try {
      await this.transporter.verify();
      console.log('✅ Email service configured successfully');
    } catch (error) {
      console.error('❌ Email service configuration failed:', error);
      throw new Error('Email service configuration failed');
    }

    return this.transporter;
  }

  /**
   * Send booking confirmation email
   */
  static async sendBookingConfirmation(data: BookingEmailData): Promise<boolean> {
    try {
      const transporter = await this.getTransporter();

      const htmlContent = this.generateBookingConfirmationHTML(data);
      const textContent = this.generateBookingConfirmationText(data);

      const mailOptions = {
        from: config.email.from,
        to: data.passengerEmail,
        subject: `Booking Confirmed - ${data.bookingCode} | ${config.app.name}`,
        text: textContent,
        html: htmlContent,
      };

      const result = await transporter.sendMail(mailOptions);
      console.log('✅ Booking confirmation email sent:', result.messageId);
      return true;
    } catch (error: any) {
      console.error('❌ Failed to send booking confirmation email:', error);
      throw new Error(`Failed to send booking confirmation email: ${error.message}`);
    }
  }

  /**
   * Send booking cancellation email
   */
  static async sendBookingCancellation(data: BookingCancellationEmailData): Promise<boolean> {
    try {
      const transporter = await this.getTransporter();

      const htmlContent = this.generateBookingCancellationHTML(data);
      const textContent = this.generateBookingCancellationText(data);

      const mailOptions = {
        from: config.email.from,
        to: data.passengerEmail,
        subject: `Booking Cancelled - ${data.bookingCode} | ${config.app.name}`,
        text: textContent,
        html: htmlContent,
      };

      const result = await transporter.sendMail(mailOptions);
      console.log('✅ Booking cancellation email sent:', result.messageId);
      return true;
    } catch (error: any) {
      console.error('❌ Failed to send booking cancellation email:', error);
      throw new Error(`Failed to send booking cancellation email: ${error.message}`);
    }
  }

  /**
   * Send booking reminder email
   */
  static async sendBookingReminder(data: BookingReminderEmailData): Promise<boolean> {
    try {
      const transporter = await this.getTransporter();

      const htmlContent = this.generateBookingReminderHTML(data);
      const textContent = this.generateBookingReminderText(data);

      const mailOptions = {
        from: config.email.from,
        to: data.passengerEmail,
        subject: `Travel Reminder - Your trip is in ${data.hoursUntilDeparture} hours!`,
        text: textContent,
        html: htmlContent,
      };

      const result = await transporter.sendMail(mailOptions);
      console.log('✅ Booking reminder email sent:', result.messageId);
      return true;
    } catch (error: any) {
      console.error('❌ Failed to send booking reminder email:', error);
      throw new Error(`Failed to send booking reminder email: ${error.message}`);
    }
  }

  /**
   * Generate HTML content for booking confirmation email
   */
  private static generateBookingConfirmationHTML(data: BookingEmailData): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Confirmation</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">🎉 Booking Confirmed!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your seat is reserved</p>
          </div>

          <!-- Booking Code -->
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-bottom: 3px solid #667eea;">
            <p style="margin: 0; color: #6c757d; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Booking Code</p>
            <h2 style="margin: 10px 0 0 0; color: #2c3e50; font-size: 32px; font-weight: bold; letter-spacing: 2px;">${data.bookingCode}</h2>
          </div>

          <!-- Passenger Info -->
          <div style="padding: 30px 20px;">
            <p style="margin: 0 0 20px 0; font-size: 18px; color: #2c3e50;">Hello <strong>${data.passengerName}</strong>,</p>
            <p style="margin: 0 0 20px 0; color: #495057; line-height: 1.6;">
              Thank you for choosing ${config.app.name}! Your booking has been confirmed. Below are your travel details:
            </p>

            <!-- Journey Details -->
            <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #667eea; font-size: 18px; border-bottom: 2px solid #667eea; padding-bottom: 10px;">
                🚌 Journey Details
              </h3>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; color: #6c757d; font-size: 14px;">Route:</td>
                  <td style="padding: 10px 0; color: #2c3e50; font-weight: bold; text-align: right;">
                    ${data.departureCity} → ${data.arrivalCity}
                  </td>
                </tr>
                <tr style="background-color: #ffffff;">
                  <td style="padding: 10px 0; color: #6c757d; font-size: 14px;">Travel Date:</td>
                  <td style="padding: 10px 0; color: #2c3e50; font-weight: bold; text-align: right;">
                    ${new Date(data.travelDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #6c757d; font-size: 14px;">Departure Time:</td>
                  <td style="padding: 10px 0; color: #2c3e50; font-weight: bold; text-align: right;">${data.departureTime}</td>
                </tr>
                <tr style="background-color: #ffffff;">
                  <td style="padding: 10px 0; color: #6c757d; font-size: 14px;">Arrival Time:</td>
                  <td style="padding: 10px 0; color: #2c3e50; font-weight: bold; text-align: right;">${data.arrivalTime}</td>
                </tr>
                ${data.duration ? `
                <tr>
                  <td style="padding: 10px 0; color: #6c757d; font-size: 14px;">Duration:</td>
                  <td style="padding: 10px 0; color: #2c3e50; font-weight: bold; text-align: right;">
                    ${Math.floor(data.duration / 60)}h ${data.duration % 60}m
                  </td>
                </tr>
                ` : ''}
              </table>
            </div>

            <!-- Bus & Seat Details -->
            <div style="background-color: #e8f5e8; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #27ae60; font-size: 18px; border-bottom: 2px solid #27ae60; padding-bottom: 10px;">
                🪑 Bus & Seat Information
              </h3>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; color: #6c757d; font-size: 14px;">Bus Company:</td>
                  <td style="padding: 10px 0; color: #2c3e50; font-weight: bold; text-align: right;">${data.busCompany}</td>
                </tr>
                <tr style="background-color: #f0f8f0;">
                  <td style="padding: 10px 0; color: #6c757d; font-size: 14px;">Plate Number:</td>
                  <td style="padding: 10px 0; color: #2c3e50; font-weight: bold; text-align: right;">${data.plateNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #6c757d; font-size: 14px;">Seat Number:</td>
                  <td style="padding: 10px 0; color: #2c3e50; font-weight: bold; text-align: right;">
                    <span style="background-color: #27ae60; color: white; padding: 5px 15px; border-radius: 20px; font-size: 16px;">
                      Seat ${String(data.seatNumber).padStart(2, '0')}
                    </span>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Price -->
            <div style="background-color: #fff3cd; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #ffc107;">
              <table style="width: 100%;">
                <tr>
                  <td style="color: #856404; font-size: 16px;">Total Fare:</td>
                  <td style="text-align: right; color: #856404; font-size: 24px; font-weight: bold;">
                    RWF ${data.price.toLocaleString()}
                  </td>
                </tr>
              </table>
            </div>

            <!-- Important Instructions -->
            <div style="background-color: #e7f3ff; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #007bff;">
              <h3 style="margin: 0 0 15px 0; color: #007bff; font-size: 18px;">
                📋 Important Instructions
              </h3>
              <ul style="margin: 0; padding-left: 20px; color: #495057; line-height: 1.8;">
                <li>Arrive at the departure point at least <strong>30 minutes before departure</strong></li>
                <li>Bring a <strong>valid ID</strong> for verification</li>
                <li>Show your <strong>booking code</strong> (${data.bookingCode}) to the staff</li>
                <li>Keep this email for your records</li>
                <li>Contact us immediately if you need to make changes</li>
              </ul>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${config.app.url}/bookings/${data.bookingCode}" 
                 style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                View Booking Details
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #2c3e50; color: white; padding: 30px 20px; text-align: center;">
            <p style="margin: 0 0 10px 0; font-size: 16px;">Need help?</p>
            <p style="margin: 0 0 20px 0; font-size: 14px; opacity: 0.8;">
              Contact us at <a href="mailto:${config.email.user}" style="color: #667eea;">${config.email.user}</a>
            </p>
            <p style="margin: 0; font-size: 12px; opacity: 0.6;">
              © ${new Date().getFullYear()} ${config.app.name}. All rights reserved.
            </p>
            <p style="margin: 10px 0 0 0; font-size: 12px; opacity: 0.6;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate text content for booking confirmation email
   */
  private static generateBookingConfirmationText(data: BookingEmailData): string {
    return `
${config.app.name} - BOOKING CONFIRMATION

🎉 Your booking is confirmed!

Booking Code: ${data.bookingCode}

Hello ${data.passengerName},

Thank you for choosing ${config.app.name}! Your booking has been confirmed.

JOURNEY DETAILS:
- Route: ${data.departureCity} → ${data.arrivalCity}
- Travel Date: ${new Date(data.travelDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
- Departure Time: ${data.departureTime}
- Arrival Time: ${data.arrivalTime}
${data.duration ? `- Duration: ${Math.floor(data.duration / 60)}h ${data.duration % 60}m` : ''}

BUS & SEAT INFORMATION:
- Bus Company: ${data.busCompany}
- Plate Number: ${data.plateNumber}
- Seat Number: ${String(data.seatNumber).padStart(2, '0')}

TOTAL FARE: RWF ${data.price.toLocaleString()}

IMPORTANT INSTRUCTIONS:
✓ Arrive at least 30 minutes before departure
✓ Bring a valid ID for verification
✓ Show your booking code (${data.bookingCode}) to the staff
✓ Keep this email for your records

View your booking details: ${config.app.url}/bookings/${data.bookingCode}

Need help? Contact us at ${config.email.user}

© ${new Date().getFullYear()} ${config.app.name}. All rights reserved.
    `.trim();
  }

  /**
   * Generate HTML content for booking cancellation email
   */
  private static generateBookingCancellationHTML(data: BookingCancellationEmailData): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Cancelled</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: white; padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">Booking Cancelled</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">We're sorry to see you go</p>
          </div>

          <!-- Content -->
          <div style="padding: 30px 20px;">
            <p style="margin: 0 0 20px 0; font-size: 18px; color: #2c3e50;">Hello <strong>${data.passengerName}</strong>,</p>
            
            <p style="margin: 0 0 20px 0; color: #495057; line-height: 1.6;">
              Your booking has been successfully cancelled as per your request.
            </p>

            <!-- Booking Details -->
            <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #e74c3c;">
              <h3 style="margin: 0 0 15px 0; color: #e74c3c;">Cancelled Booking Details</h3>
              <table style="width: 100%;">
                <tr>
                  <td style="padding: 8px 0; color: #6c757d;">Booking Code:</td>
                  <td style="padding: 8px 0; color: #2c3e50; font-weight: bold; text-align: right;">${data.bookingCode}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6c757d;">Route:</td>
                  <td style="padding: 8px 0; color: #2c3e50; font-weight: bold; text-align: right;">
                    ${data.departureCity} → ${data.arrivalCity}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6c757d;">Travel Date:</td>
                  <td style="padding: 8px 0; color: #2c3e50; font-weight: bold; text-align: right;">
                    ${new Date(data.travelDate).toLocaleDateString()}
                  </td>
                </tr>
                ${data.refundAmount ? `
                <tr>
                  <td style="padding: 8px 0; color: #6c757d;">Refund Amount:</td>
                  <td style="padding: 8px 0; color: #27ae60; font-weight: bold; text-align: right;">
                    RWF ${data.refundAmount.toLocaleString()}
                  </td>
                </tr>
                ` : ''}
              </table>
            </div>

            ${data.refundAmount ? `
            <div style="background-color: #d4edda; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #28a745;">
              <p style="margin: 0; color: #155724; line-height: 1.6;">
                <strong>💰 Refund Processing:</strong><br>
                Your refund of RWF ${data.refundAmount.toLocaleString()} will be processed within 5-7 business days.
              </p>
            </div>
            ` : ''}

            <p style="margin: 20px 0; color: #495057; line-height: 1.6;">
              We hope to serve you again in the future. If you have any questions, please don't hesitate to contact us.
            </p>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${config.app.url}" 
                 style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px;">
                Book Another Trip
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #2c3e50; color: white; padding: 30px 20px; text-align: center;">
            <p style="margin: 0 0 10px 0; font-size: 16px;">Need help?</p>
            <p style="margin: 0 0 20px 0; font-size: 14px; opacity: 0.8;">
              Contact us at <a href="mailto:${config.email.user}" style="color: #667eea;">${config.email.user}</a>
            </p>
            <p style="margin: 0; font-size: 12px; opacity: 0.6;">
              © ${new Date().getFullYear()} ${config.app.name}. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate text content for booking cancellation email
   */
  private static generateBookingCancellationText(data: BookingCancellationEmailData): string {
    return `
${config.app.name} - BOOKING CANCELLED

Hello ${data.passengerName},

Your booking has been successfully cancelled as per your request.

CANCELLED BOOKING DETAILS:
- Booking Code: ${data.bookingCode}
- Route: ${data.departureCity} → ${data.arrivalCity}
- Travel Date: ${new Date(data.travelDate).toLocaleDateString()}
${data.refundAmount ? `- Refund Amount: RWF ${data.refundAmount.toLocaleString()}` : ''}

${data.refundAmount ? `\nREFUND PROCESSING:\nYour refund of RWF ${data.refundAmount.toLocaleString()} will be processed within 5-7 business days.\n` : ''}

We hope to serve you again in the future.

Book another trip: ${config.app.url}

Need help? Contact us at ${config.email.user}

© ${new Date().getFullYear()} ${config.app.name}. All rights reserved.
    `.trim();
  }

  /**
   * Generate HTML content for booking reminder email
   */
  private static generateBookingReminderHTML(data: BookingReminderEmailData): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Travel Reminder</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%); color: white; padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">⏰ Travel Reminder</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px; font-weight: bold;">
              Your trip is in ${data.hoursUntilDeparture} hours!
            </p>
          </div>

          <!-- Content -->
          <div style="padding: 30px 20px;">
            <p style="margin: 0 0 20px 0; font-size: 18px; color: #2c3e50;">Hello <strong>${data.passengerName}</strong>,</p>
            
            <p style="margin: 0 0 20px 0; color: #495057; line-height: 1.6; font-size: 16px;">
              This is a friendly reminder that your bus departs in <strong style="color: #e67e22;">${data.hoursUntilDeparture} hours</strong>. 
              Please make sure you're ready for your journey!
            </p>

            <!-- Trip Details -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; padding: 20px; margin: 20px 0; color: white;">
              <h3 style="margin: 0 0 15px 0; font-size: 20px; text-align: center;">Your Trip Details</h3>
              
              <div style="background-color: rgba(255, 255, 255, 0.1); border-radius: 5px; padding: 15px; margin: 10px 0;">
                <table style="width: 100%; color: white;">
                  <tr>
                    <td style="padding: 8px 0; font-size: 14px; opacity: 0.9;">Route:</td>
                    <td style="padding: 8px 0; font-weight: bold; text-align: right; font-size: 16px;">
                      ${data.departureCity} → ${data.arrivalCity}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-size: 14px; opacity: 0.9;">Date:</td>
                    <td style="padding: 8px 0; font-weight: bold; text-align: right; font-size: 16px;">
                      ${new Date(data.travelDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-size: 14px; opacity: 0.9;">Departure:</td>
                    <td style="padding: 8px 0; font-weight: bold; text-align: right; font-size: 20px; color: #ffc107;">
                      ${data.departureTime}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-size: 14px; opacity: 0.9;">Seat:</td>
                    <td style="padding: 8px 0; text-align: right;">
                      <span style="background-color: white; color: #667eea; padding: 5px 15px; border-radius: 20px; font-weight: bold; font-size: 16px;">
                        ${String(data.seatNumber).padStart(2, '0')}
                      </span>
                    </td>
                  </tr>
                </table>
              </div>

              <div style="text-align: center; margin-top: 15px; padding: 15px; background-color: rgba(255, 255, 255, 0.1); border-radius: 5px;">
                <p style="margin: 0; font-size: 14px; opacity: 0.9;">Booking Code</p>
                <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; letter-spacing: 2px;">
                  ${data.bookingCode}
                </p>
              </div>
            </div>

            <!-- Checklist -->
            <div style="background-color: #fff3cd; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #ffc107;">
              <h3 style="margin: 0 0 15px 0; color: #856404;">✅ Pre-Departure Checklist</h3>
              <ul style="margin: 0; padding-left: 20px; color: #856404; line-height: 2;">
                <li><strong>Arrive 30 minutes early</strong> at the departure point</li>
                <li>Bring your <strong>valid ID</strong></li>
                <li>Have your <strong>booking code ready</strong></li>
                <li>Check the weather and dress accordingly</li>
                <li>Pack light refreshments for the journey</li>
              </ul>
            </div>

            <!-- Bus Info -->
            <div style="background-color: #e8f5e8; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0; color: #27ae60; font-weight: bold;">🚌 Bus Information</p>
              <p style="margin: 10px 0 0 0; color: #2c3e50;">
                <strong>${data.busCompany}</strong> - Plate: <strong>${data.plateNumber}</strong>
              </p>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${config.app.url}/bookings/${data.bookingCode}" 
                 style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                View Booking Details
              </a>
            </div>

            <p style="margin: 20px 0; color: #495057; text-align: center; line-height: 1.6;">
              Have a safe and pleasant journey! 🚌✨
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #2c3e50; color: white; padding: 30px 20px; text-align: center;">
            <p style="margin: 0 0 10px 0; font-size: 16px;">Need help?</p>
            <p style="margin: 0 0 20px 0; font-size: 14px; opacity: 0.8;">
              Contact us at <a href="mailto:${config.email.user}" style="color: #667eea;">${config.email.user}</a>
            </p>
            <p style="margin: 0; font-size: 12px; opacity: 0.6;">
              © ${new Date().getFullYear()} ${config.app.name}. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate text content for booking reminder email
   */
  private static generateBookingReminderText(data: BookingReminderEmailData): string {
    return `
${config.app.name} - TRAVEL REMINDER

⏰ Your trip is in ${data.hoursUntilDeparture} hours!

Hello ${data.passengerName},

This is a friendly reminder that your bus departs in ${data.hoursUntilDeparture} hours.

YOUR TRIP DETAILS:
- Route: ${data.departureCity} → ${data.arrivalCity}
- Date: ${new Date(data.travelDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
- Departure Time: ${data.departureTime}
- Seat Number: ${String(data.seatNumber).padStart(2, '0')}
- Booking Code: ${data.bookingCode}

BUS INFORMATION:
- Company: ${data.busCompany}
- Plate Number: ${data.plateNumber}

PRE-DEPARTURE CHECKLIST:
✓ Arrive 30 minutes early at the departure point
✓ Bring your valid ID
✓ Have your booking code ready
✓ Check the weather and dress accordingly
✓ Pack light refreshments for the journey

View your booking: ${config.app.url}/bookings/${data.bookingCode}

Have a safe and pleasant journey!

Need help? Contact us at ${config.email.user}

© ${new Date().getFullYear()} ${config.app.name}. All rights reserved.
    `.trim();
  }
}