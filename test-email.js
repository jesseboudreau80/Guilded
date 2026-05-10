require('dotenv').config();

const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function run() {
  try {
    const data = await resend.emails.send({
      from: 'Guilded <guilded@mail.jesseboudreau.com>',
      to: 'YOURREALEMAIL@gmail.com',
      subject: 'Guilded Email Test',
      html: `
        <div style="background:#020617;color:#fff;padding:40px;font-family:sans-serif">
          <h1>Welcome to Guilded ⚔️</h1>
          <p>Your messaging infrastructure is now operational.</p>
        </div>
      `
    });

    console.log(data);
  } catch (err) {
    console.error(err);
  }
}

run();
