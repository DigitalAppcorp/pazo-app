// @deno-types="https://deno.land/std@0.168.0/http/server.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

serve(async (req: Request): Promise<Response> => {
  try {
    const body = await req.json()

    if (body.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED' || body.event_type === 'PAYMENT.SALE.COMPLETED') {
      const customId = body.resource?.custom_id || body.resource?.custom

      if (customId) {
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { error } = await supabaseAdmin
          .from('pets')
          .update({ is_founder: true })
          .eq('owner_id', customId)

        if (error) {
          console.error('Error actualizando Supabase:', error)
          throw error
        }
        
        console.log(`¡Éxito! Usuario ${customId} ahora es Fundador.`)
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })

  } catch (error: any) {
    console.error("Error en Webhook:", error?.message)
    return new Response(JSON.stringify({ error: error?.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    })
  }
})