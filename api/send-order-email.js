import sgMail from '@sendgrid/mail';
import busboy from 'busboy';
import { Readable } from 'node:stream';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function json(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: { ...corsHeaders, ...extraHeaders },
    body: JSON.stringify(body),
  };
}

function normalizeHeaders(headers = {}) {
  // Netlify provides headers as an object; Busboy expects lowercased keys.
  const normalized = {};
  for (const [k, v] of Object.entries(headers)) {
    if (typeof v === 'undefined') continue;
    normalized[String(k).toLowerCase()] = Array.isArray(v) ? v.join(',') : String(v);
  }
  return normalized;
}

function readableFromEventBody(event) {
  const raw = event?.body ?? '';
  const buf = Buffer.from(raw, event?.isBase64Encoded ? 'base64' : 'utf8');
  return Readable.from(buf);
}

export const handler = async (event) => {
  const method = event?.httpMethod || 'GET';
  console.log('📨 Received request:', { method, path: event?.path });

  // Handle preflight requests
  if (method === 'OPTIONS') {
    console.log('✅ Handling preflight OPTIONS request');
    return json(200, { ok: true });
  }

  // Only allow POST requests
  if (method !== 'POST') {
    console.error('❌ Invalid method:', method);
    return json(405, { error: 'Method not allowed' });
  }

  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.error('❌ SENDGRID_API_KEY is missing!');
      return json(500, { error: 'Server misconfigured: SENDGRID_API_KEY is not set' });
    }
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    // Log headers for debugging
    const headers = normalizeHeaders(event?.headers);
    console.log('📋 Request headers:', Object.keys(headers));
    console.log('📋 Content-Type:', headers['content-type']);

    if (!headers['content-type']?.includes('multipart/form-data')) {
      return json(400, { error: 'Expected multipart/form-data' });
    }

    // Parse multipart form data with streaming
    const bb = busboy({
      headers,
      limits: {
        fileSize: 100 * 1024 * 1024, // Allow up to 100MB per file
      },
    });

    let orderDetails = null;
    const files = [];
    let parseError = null;
    let filesBeingProcessed = 0;

    return await new Promise((resolve) => {
      bb.on('field', (fieldname, val) => {
        if (fieldname === 'orderDetails') {
          try {
            orderDetails = JSON.parse(val);
            console.log('📦 Parsed order:', orderDetails?.customer, 'Items:', orderDetails?.items?.length);
          } catch (e) {
            parseError = 'Invalid JSON in orderDetails';
          }
        }
      });

      bb.on('file', (fieldname, file, info) => {
        filesBeingProcessed++;
        const chunks = [];
        let fileSize = 0;
        const maxFileSize = 50 * 1024 * 1024; // 50MB max per file

        console.log(`📄 Starting to stream file: ${info.filename}`);

        file.on('data', (data) => {
          fileSize += data.length;
          if (fileSize > maxFileSize) {
            file.destroy();
            parseError = `File ${info.filename} exceeds 50MB limit`;
            console.error(`❌ File too large: ${info.filename}`);
            return;
          }
          chunks.push(data);
        });

        file.on('end', () => {
          if (parseError) {
            filesBeingProcessed--;
            return;
          }

          const buffer = Buffer.concat(chunks);
          files.push({
            filename: info.filename,
            content: buffer.toString('base64'),
            type: 'application/octet-stream',
            disposition: 'attachment',
          });
          filesBeingProcessed--;
          console.log(`✅ File streamed and buffered: ${info.filename} (${buffer.length} bytes)`);
        });

        file.on('error', (err) => {
          console.error(`❌ File stream error: ${err.message}`);
          parseError = `File upload error: ${err.message}`;
          filesBeingProcessed--;
        });
      });

      bb.on('close', async () => {
        // Wait for all files to finish processing
        const waitForFiles = () => {
          return new Promise((waitResolve) => {
            if (filesBeingProcessed === 0) {
              waitResolve();
              return;
            }
            const checkInterval = setInterval(() => {
              console.log(`⏳ Waiting for files... (${filesBeingProcessed} remaining)`);
              if (filesBeingProcessed === 0) {
                clearInterval(checkInterval);
                waitResolve();
              }
            }, 50);
          });
        };

        await waitForFiles();
        console.log(`✅ All files processed. Total: ${files.length}`);

        if (parseError) {
          resolve(json(400, { error: parseError }));
          return;
        }

        if (!orderDetails) {
          resolve(json(400, { error: 'Missing order details' }));
          return;
        }

        try {
          console.log('📎 Files ready for sending:', files.length, 'File names:', files.map(f => f.filename).join(', '));
          console.log('📎 File sizes:', files.map(f => `${f.filename}: ${(f.content.length / 1024).toFixed(2)}KB`).join(', '));

          // Email to admin with attachments
          const adminEmailHTML = createAdminEmailHTML(orderDetails);
          const adminEmail = {
            to: process.env.ADMIN_EMAIL || '3d.print.ittt@gmail.com',
            from: process.env.SENDGRID_FROM_EMAIL || '3d.print.ittt@gmail.com',
            subject: `🎉 New Order - ${orderDetails.customer} (${orderDetails.items.length} files)`,
            html: adminEmailHTML,
            attachments: files,
          };
          console.log('📧 Admin email configured with', files.length, 'attachments');

          // Email to customer (without files, just confirmation)
          const customerEmailHTML = createCustomerEmailHTML(orderDetails);
          const customerEmail = {
            to: orderDetails.email,
            from: process.env.SENDGRID_FROM_EMAIL || '3d.print.ittt@gmail.com',
            subject: `✓ Order Confirmed - 3D Print It (${orderDetails.items.length} files)`,
            html: customerEmailHTML,
          };

          // Send both emails
          console.log('📤 Sending emails to admin:', adminEmail.to, 'and customer:', customerEmail.to);
          console.log('📤 API Key length:', process.env.SENDGRID_API_KEY?.length);

          try {
            await Promise.all([
              sgMail.send(adminEmail),
              sgMail.send(customerEmail),
            ]);
          } catch (emailError) {
            console.error('❌ SendGrid error:', JSON.stringify({
              message: emailError.message,
              code: emailError.code,
              status: emailError.status,
              errors: emailError.response?.body?.errors,
            }, null, 2));
            throw emailError;
          }

          console.log('✅ Emails sent successfully with', files.length, 'attachments!');
          resolve(
            json(200, {
              success: true,
              message: 'Emails sent successfully',
              filesAttached: files.length,
            })
          );
        } catch (error) {
          console.error('❌ Email send error:', error.message);
          resolve(json(500, { error: error.message }));
        }
      });

      bb.on('error', (err) => {
        console.error('❌ Form parse error:', err.message);
        resolve(json(400, { error: `Parse error: ${err.message}` }));
      });

      if (!event?.body) {
        console.error('❌ No request body');
        resolve(json(400, { error: 'No request body' }));
        return;
      }

      const nodeStream = readableFromEventBody(event);
      nodeStream.pipe(bb);
    });
  } catch (error) {
    console.error('❌ Handler error:', error.message);
    return json(500, { error: error.message });
  }
};

// HTML email templates
function createAdminEmailHTML(orderDetails) {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .header h1 { margin: 0; font-size: 28px; }
    .section { background: #f9fafb; padding: 20px; margin: 15px 0; border-left: 4px solid #3b82f6; }
    .section h3 { margin-top: 0; color: #1e3a8a; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .detail-row:last-child { border-bottom: none; }
    .label { font-weight: bold; color: #1e3a8a; }
    .value { color: #333; }
    .item-card { background: white; border: 1px solid #d1d5db; padding: 15px; margin: 10px 0; border-radius: 5px; }
    .total-section { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 20px; text-align: center; border-radius: 5px; }
    .total-price { font-size: 32px; font-weight: bold; color: #16a34a; }
    .footer { background: #1f2937; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 New Order Received!</h1>
      <p>3D Print It - Order Management System</p>
    </div>

    <div class="section">
      <h3>👤 Customer Information</h3>
      <div class="detail-row">
        <span class="label">Name:</span>
        <span class="value">${orderDetails.customer}</span>
      </div>
      <div class="detail-row">
        <span class="label">Email:</span>
        <span class="value">${orderDetails.email}</span>
      </div>
      <div class="detail-row">
        <span class="label">Phone:</span>
        <span class="value">${orderDetails.phone}</span>
      </div>
      <div class="detail-row">
        <span class="label">Company:</span>
        <span class="value">${orderDetails.company || 'N/A'}</span>
      </div>
    </div>

    <div class="section">
      <h3>📦 Order Details (Files Attached)</h3>
      ${orderDetails.items.map((item) => `
        <div class="item-card">
          <div style="font-weight: bold; color: #3b82f6; margin-bottom: 10px;">📄 ${item.file}</div>
          <div class="detail-row">
            <span class="label">Material:</span>
            <span class="value">${item.material}</span>
          </div>
          <div class="detail-row">
            <span class="label">Quality:</span>
            <span class="value">${item.quality}</span>
          </div>
          <div class="detail-row">
            <span class="label">Infill:</span>
            <span class="value">${item.infill}%</span>
          </div>
          <div class="detail-row">
            <span class="label">Weight:</span>
            <span class="value">${item.weight}g</span>
          </div>
          <div class="detail-row">
            <span class="label">Est. Print Time:</span>
            <span class="value">${item.time}</span>
          </div>
          <div class="detail-row" style="border-bottom: none; font-weight: bold; padding-top: 15px; color: #16a34a;">
            <span>Price:</span>
            <span>EGP${item.price}</span>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="total-section">
      <p style="font-size: 18px; margin-bottom: 10px;">Order Total</p>
      <div class="total-price">EGP${orderDetails.total}</div>
      <p style="margin-top: 10px; font-size: 12px; color: #666;">* Estimated amount (subject to file review)</p>
    </div>

    ${orderDetails.notes ? `
      <div class="section">
        <h3>📝 Special Notes</h3>
        <p>${orderDetails.notes}</p>
      </div>
    ` : ''}

    <div class="section">
      <p style="color: #666; font-size: 13px;"><strong>Order Time:</strong> ${new Date().toLocaleString()}</p>
      <p style="color: #999; font-size: 12px;">✓ Files are attached to this email. Please review and respond to customer within 2 hours.</p>
    </div>

    <div class="footer">
      <p style="margin: 0; padding: 0;">3D Print It - Cairo, Egypt</p>
      <p style="margin: 5px 0; padding: 0;">Established 2021 • Quality Craftsmanship</p>
    </div>
  </div>
</body>
</html>
  `;
}

function createCustomerEmailHTML(orderDetails) {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .header h1 { margin: 0; font-size: 28px; }
    .section { background: #f9fafb; padding: 20px; margin: 15px 0; border-left: 4px solid #3b82f6; }
    .section h3 { margin-top: 0; color: #1e3a8a; }
    .item-card { background: white; border: 1px solid #d1d5db; padding: 15px; margin: 10px 0; border-radius: 5px; }
    .total-section { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 20px; text-align: center; border-radius: 5px; }
    .total-price { font-size: 32px; font-weight: bold; color: #16a34a; }
    .steps li { padding: 10px 0; border-bottom: 1px solid #e5e7eb; padding-left: 30px; position: relative; }
    .steps li:before { content: attr(data-number); position: absolute; left: 0; background: #3b82f6; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; }
    .contact-box { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 15px 0; border-radius: 5px; }
    .footer { background: #1f2937; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✓ Order Confirmed!</h1>
      <p>Thank you for choosing 3D Print It</p>
    </div>

    <div class="section">
      <h3>Hello ${orderDetails.customer},</h3>
      <p>We've received your order and will begin reviewing your 3D files shortly. Our team will ensure the highest quality for your prints.</p>
    </div>

    <div class="section">
      <h3>📦 Your Order Details</h3>
      ${orderDetails.items.map((item) => `
        <div class="item-card">
          <div style="font-weight: bold; color: #3b82f6; margin-bottom: 10px;">📄 ${item.file}</div>
          <div style="font-size: 13px; color: #666;">
            ${item.material} • ${item.quality} • ${item.infill}% Infill
          </div>
        </div>
      `).join('')}
    </div>

    <div class="total-section">
      <p style="font-size: 18px; margin-bottom: 10px;">Estimated Price</p>
      <div class="total-price">EGP${orderDetails.total}</div>
      <p style="margin-top: 10px; font-size: 12px; color: #666;">* Final price will be confirmed after file review</p>
    </div>

    <div class="section">
      <h3>📋 What Happens Next?</h3>
      <ol class="steps" style="list-style: none; padding: 0;">
        <li data-number="1" style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; padding-left: 30px; position: relative;">We'll review your files and specifications</li>
        <li data-number="2" style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; padding-left: 30px; position: relative;">We'll provide a final quote and timeline</li>
        <li data-number="3" style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; padding-left: 30px; position: relative;">Payment confirmation and scheduling</li>
        <li data-number="4" style="padding: 10px 0; padding-left: 30px; position: relative;">Your prints will be created with care</li>
      </ol>
    </div>

    <div class="contact-box">
      <p style="margin: 0; margin-bottom: 10px;"><strong>Questions or need to make changes?</strong></p>
      <p style="margin: 5px 0;">We typically respond within <strong>2 hours</strong> during business hours.</p>
      <p style="margin: 5px 0; font-size: 12px;">
        📞 <strong>Phone:</strong> +20 109 922 8486<br/>
        💬 <strong>WhatsApp:</strong> +20 109 922 8486<br/>
        📧 <strong>Email:</strong> 3d.print.ittt@gmail.com
      </p>
    </div>

    <div class="footer">
      <p style="margin: 0; padding: 0;">3D Print It - New Cairo, Egypt</p>
      <p style="margin: 5px 0; padding: 0;">Established 2021 • Quality Craftsmanship</p>
    </div>
  </div>
</body>
</html>
  `;
}
