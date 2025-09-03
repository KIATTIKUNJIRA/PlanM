// Note: This is a Deno function, as required by Supabase Edge Functions.
import { serve } from "https://deno.land/std@0.203.0/http/server.ts"

// Get LINE Notify token from environment variables
const LINE_TOKEN = Deno.env.get('LINE_NOTIFY_ACCESS_TOKEN');

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const { message } = await req.json();
    if (!message) {
      return new Response("Message is required", { status: 400 });
    }

    const formData = new FormData();
    formData.append('message', message);

    await fetch('https://notify-api.line.me/api/notify', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LINE_TOKEN}`
      },
      body: formData,
    });

    return new Response(JSON.stringify({ success: true, message: "Notification sent." }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500
    });
  }
})