import express from 'express';
import cors from 'cors';
import nodemailer from "nodemailer";
import { PrismaClient } from "./src/generated/prisma/index.js";
import { withAccelerate } from "@prisma/extension-accelerate";
// import Date
const transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: "megahertzrobotics@gmail.com",
        pass: process.env.MAIL_URL,
    },
});
const prisma = new PrismaClient({
    accelerateUrl: process.env.DATABASE_URL,
}).$extends(withAccelerate());
const app = express();
app.use(express.json());
app.use(cors());
app.post('/signin', async (req, res) => {
    const dataUser = req.body;
    const response = await prisma.user.findFirst({
        where: { email: dataUser.email }
    });
    if (!response) {
        await prisma.user.create({
            data: {
                name: dataUser.name,
                email: dataUser.email
            }
        });
        return res.status(202).json({ 'msg': 'User creation success', });
    }
    else {
        return res.status(202).json({ 'msg': 'User already exists', });
    }
});
//megahertzrobotics@gmail.com
//also send cart details
app.post('/verify', async (req, res) => {
    const amount = req.body.amount;
    //amount token,userEmail,Cart
    const email = req.body.email;
    const cart = JSON.parse(req.body.cart);
    console.log(email);
    // console.log(typeof cart)
    // const amount=jwt.decode(data) as JwtPayload
    const response = await prisma.txn.create({
        data: {
            amount: amount,
            products: JSON.stringify(cart),
            status: 'yet_to',
            date: String(new Date()),
            userEmail: email
        }
    });
    const id = response.id;
    const itemsHtml = cart.map((item) => `
  <tr>
    <td style="padding: 12px; border-bottom: 1px solid #eee; vertical-align: top;">
       <strong style="font-size: 14px; color: #333;">${item.name}</strong><br>
       <span style="font-size: 12px; color: #777;">ID: ${item.id} | ${item.category}</span>
    </td>
    <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center; vertical-align: top;">
      ${item.qty}
    </td>
    <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; vertical-align: top; font-weight: bold;">
      ${item.price}
    </td>
  </tr>
`).join('');
    const info = await transporter.sendMail({
        from: '"MEGAHERTZ ROBOTICS"',
        to: [`megahertzrobotics@gmail.com`, 'amrutanshu.nanda@megahertzrobotics.com', 'laganjeet.jena@megahertzrobotics.com', 'omm.sanjog@megahertzrobotics.com'],
        subject: `Action Required: Payment Approval for ${amount}`,
        html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Approval</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
        .header { background-color: #003366; color: #ffffff; padding: 25px; text-align: center; }
        .content { padding: 30px 20px; }
        .table-wrapper { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
        .table-wrapper th { background-color: #f8f9fa; text-align: left; padding: 10px; font-size: 12px; color: #666; text-transform: uppercase; border-bottom: 2px solid #ddd; }
        .total-section { background-color: #eef2f5; padding: 20px; text-align: center; border-radius: 6px; margin: 20px 0; }
        .total-amount { font-size: 26px; font-weight: bold; color: #003366; margin-top: 5px; }
        .btn-container { text-align: center; margin-top: 30px; }
        .btn { display: inline-block; padding: 12px 30px; margin: 0 8px; border-radius: 4px; text-decoration: none; font-weight: bold; font-size: 14px; }
        .btn-approve { background-color: #28a745; color: #ffffff !important; border-bottom: 3px solid #1e7e34; }
        .btn-deny { background-color: #dc3545; color: #ffffff !important; border-bottom: 3px solid #bd2130; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #999; }
      </style>
    </head>
    <body>
      <div class="container">
        
        <div class="header">
          <h2 style="margin:0; font-size: 24px;">MEGAHERTZ ROBOTICS</h2>
        </div>

        <div class="content">
          <p style="font-size: 16px; color: #333;">Hello,</p>
          <p style="color: #555; line-height: 1.5;">The following order requires your confirmation before processing.</p>

          <table class="table-wrapper">
            <thead>
              <tr>
                <th width="60%">Item Description</th>
                <th width="15%" style="text-align: center;">Qty</th>
                <th width="25%" style="text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="total-section">
            <div style="font-size: 14px; color: #666; text-transform: uppercase;">Total Request Amount</div>
            <div class="total-amount">${amount}</div>
          </div>

          <div class="btn-container">
            <a href="https://mega-be.vercel.app/success/${id}" class="btn btn-approve">APPROVE PAYMENT</a>
            <a href="https://mega-be.vercel.app/failure/${id}" class="btn btn-deny">DENY REQUEST</a>
          </div>
        </div>

        <div class="footer">
          <p>Automated message from Megahertz Robotics System.</p>
        </div>

      </div>
    </body>
    </html>
  `
    });
    res.status(202).json({ 'msg': 'wait for approval' });
});
//verified mail sending
app.get('/success/:id', async (req, res) => {
    console.log(req.params);
    const id = Number(req.params.id);
    console.log(id);
    let response = await prisma.txn.findFirst({
        where: { id: id },
        select: {
            id: true,
            userEmail: true,
            products: true,
            status: true,
            amount: true,
        }
    });
    console.log(response);
    if (response) {
        if (response.status == 'yet_to') {
            //pass
        }
        else {
            return res.send('DUPLICATE UPDATE HOLD!!!!!!!!!');
        }
        const cart = JSON.parse(response.products);
        const itemsHtml = cart.map((item) => `
  <tr>
    <td style="padding: 12px; border-bottom: 1px solid #eee; vertical-align: top;">
       <strong style="font-size: 14px; color: #333;">${item.name}</strong><br>
       <span style="font-size: 12px; color: #777;">ID: ${item.id} | ${item.category}</span>
    </td>
    <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center; vertical-align: top;">
      ${item.qty}
    </td>
    <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; vertical-align: top; font-weight: bold;">
      ${item.price}
    </td>
  </tr>
`).join('');
        const info = await transporter.sendMail({
            from: '"MEGAHERTZ ROBOTICS" <your-email@example.com>',
            to: [`megahertzrobotics@gmail.com`, `${response.userEmail}`, `sujalkrishna1919@zohomail.in`],
            subject: `Order Confirmation: Transaction #${id}`,
            html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
        .header { background-color: #003366; color: #ffffff; padding: 25px; text-align: center; }
        .content { padding: 30px 20px; }
        .table-wrapper { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
        .table-wrapper th { background-color: #f8f9fa; text-align: left; padding: 10px; font-size: 12px; color: #666; text-transform: uppercase; border-bottom: 2px solid #ddd; }
        
        /* New Info Box Style */
        .info-box { background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 4px; padding: 10px; margin-bottom: 20px; text-align: center; font-size: 14px; color: #555; }
        
        .total-section { background-color: #eef2f5; padding: 20px; text-align: right; border-radius: 6px; margin: 20px 0; }
        .total-label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
        .total-amount { font-size: 24px; font-weight: bold; color: #003366; margin-top: 5px; }
        
        .btn-container { text-align: center; margin-top: 30px; }
        .btn { display: inline-block; padding: 12px 30px; background-color: #003366; color: #ffffff !important; border-radius: 4px; text-decoration: none; font-weight: bold; font-size: 14px; }
        
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #999; line-height: 1.4; }
      </style>
    </head>
    <body>
      <div class="container">
        
        <div class="header">
          <h2 style="margin:0; font-size: 24px;">MEGAHERTZ ROBOTICS</h2>
        </div>

        <div class="content">
          <p style="font-size: 16px; color: #333; margin-top: 0;"><strong>Order Details</strong></p>
          <p style="color: #666; line-height: 1.5; margin-bottom: 20px;">
            This email confirms that the following transaction has been successfully recorded in our system.
          </p>

          <div class="info-box">
            Reference ID: <strong>#${id}</strong>
          </div>

          <table class="table-wrapper">
            <thead>
              <tr>
                <th width="60%">Item Description</th>
                <th width="15%" style="text-align: center;">Qty</th>
                <th width="25%" style="text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="total-section">
            <div class="total-label">Total Amount Paid</div>
            <div class="total-amount">${response.amount}</div>
          </div>

     
        </div>

        <div class="footer">
          <p>
            Need help? Contact our support team.<br>
            &copy; ${new Date().getFullYear()} Megahertz Robotics. All rights reserved.
          </p>
        </div>

      </div>
    </body>
    </html>
  `
        });
        await prisma.txn.update({
            where: { id: id },
            data: {
                status: 'completed'
            }
        });
        res.send(`
            <html>
                <body style="font-family: sans-serif; text-align: center; padding-top: 50px;">
                    <h1 style="color: green;">Success</h1>
                    <p>The payment has been successfully <strong>APPROVED</strong>.</p>
                    <p>You can close this window now.</p>
                </body>
            </html>
        `);
    }
    else {
        res.send("Something is up with the server");
    }
});
//unverified mail sending
app.get('/failure/:id', async (req, res) => {
    const id = Number(req.params.id);
    console.log(id);
    let response = await prisma.txn.findFirst({
        where: { id: id },
        select: {
            id: true,
            userEmail: true,
            products: true,
            status: true,
            amount: true,
        }
    });
    console.log(response);
    if (response) {
        if (response.status == 'yet_to') {
            //pass
        }
        else {
            return res.send('DUPLICATE UPDATE HOLD!!!!!!!!!');
        }
        const cart = JSON.parse(response.products);
        const itemsHtml = cart.map((item) => `
  <tr>
    <td style="padding: 12px; border-bottom: 1px solid #eee; vertical-align: top;">
       <strong style="font-size: 14px; color: #333;">${item.name}</strong><br>
       <span style="font-size: 12px; color: #777;">ID: ${item.id} | ${item.category}</span>
    </td>
    <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center; vertical-align: top;">
      ${item.qty}
    </td>
    <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; vertical-align: top; font-weight: bold;">
      ${item.price}
    </td>
  </tr>
`).join('');
        const info = await transporter.sendMail({
            from: '"MEGAHERTZ ROBOTICS" <your-email@example.com>',
            to: [`sujalkrishna1919@zohomail.in`, `megahertzrobotics@gmail.com`, `${response.userEmail}`],
            subject: `Action Required: Payment Failed for Transaction #${id}`,
            html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Failed</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
        /* Changed header to a warning color or kept dark blue but added warning text below */
        .header { background-color: #003366; color: #ffffff; padding: 25px; text-align: center; }
        .content { padding: 30px 20px; }
        
        .alert-banner { background-color: #ffebee; color: #c62828; padding: 15px; border-radius: 4px; text-align: center; margin-bottom: 25px; border: 1px solid #ef9a9a; }
        
        .table-wrapper { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
        .table-wrapper th { background-color: #f8f9fa; text-align: left; padding: 10px; font-size: 12px; color: #666; text-transform: uppercase; border-bottom: 2px solid #ddd; }
        
        .info-box { background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 4px; padding: 10px; margin-bottom: 20px; text-align: center; font-size: 14px; color: #555; }
        
        .total-section { background-color: #eef2f5; padding: 20px; text-align: right; border-radius: 6px; margin: 20px 0; }
        .total-label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
        .total-amount { font-size: 24px; font-weight: bold; color: #003366; margin-top: 5px; }
        
        .btn-container { text-align: center; margin-top: 30px; }
        /* Changed button to a "Retry" style (Red/Orange) or kept branding */
        .btn { display: inline-block; padding: 12px 30px; background-color: #d32f2f; color: #ffffff !important; border-radius: 4px; text-decoration: none; font-weight: bold; font-size: 14px; }
        
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #999; line-height: 1.4; }
      </style>
    </head>
    <body>
      <div class="container">
        
        <div class="header">
          <h2 style="margin:0; font-size: 24px;">MEGAHERTZ ROBOTICS</h2>
        </div>

        <div class="content">
          
          <div class="alert-banner">
            <strong>Payment Unsuccessful</strong>
          </div>

          <p style="font-size: 16px; color: #333; margin-top: 0;"><strong>Hello,</strong></p>
          <p style="color: #666; line-height: 1.5; margin-bottom: 20px;">
            We attempted to process your order, but the transaction could not be completed. No funds have been deducted from your account. 
            <br><br>
            This may be due to insufficient funds, a bank decline, or a temporary system error.
          </p>

          <div class="info-box">
            Failed Transaction ID: <strong>#${id}</strong>
          </div>

          <table class="table-wrapper">
            <thead>
              <tr>
                <th width="60%">Item Description</th>
                <th width="15%" style="text-align: center;">Qty</th>
                <th width="25%" style="text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="total-section">
            <div class="total-label">Total Amount Attempted</div>
            <div class="total-amount">${response.amount}</div>
          </div>

          <div class="btn-container">
            <a href="https://your-website.com/checkout/retry/${id}" class="btn">Retry Payment</a>
          </div>
     
        </div>

        <div class="footer">
          <p>
            If you continue to experience issues, please contact your bank or reach out to our support team.<br>
            &copy; ${new Date().getFullYear()} Megahertz Robotics. All rights reserved.
          </p>
        </div>

      </div>
    </body>
    </html>
  `
        });
        await prisma.txn.update({
            where: { id: id },
            data: {
                status: 'failed'
            }
        });
        res.send(`
    <html>
        <body style="font-family: sans-serif; text-align: center; padding-top: 50px;">
            <h1 style="color: #d32f2f;">Transaction Failed</h1>
            <p>The payment was <strong>DECLINED</strong> and could not be processed.</p>
            <p>Please close this window and try again.</p>
        </body>
    </html>
`);
    }
    else {
        res.send("Something is up with the server");
    }
});
app.listen(3000);
//# sourceMappingURL=index.js.map
