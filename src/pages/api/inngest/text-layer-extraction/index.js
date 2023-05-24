import { inngest } from '../index';

// Create a simple async Next.js API route handler
export default async function handler(req, res) {
  const incoming = JSON.parse(req.body);
  const uuid = incoming.uuid;

  console.log(`UUID in API Call: ${uuid}`)

  // Send your event payload to Inngest
  await inngest.send({
    name: 'extract.text.layer',
    data: {
      uuid: uuid,
    },
  });

  res.status(200).json({ success: true });
}
