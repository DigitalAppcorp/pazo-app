import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const config=JSON.parse(readFileSync(new URL('../../../../vercel.json',import.meta.url),'utf8'))
const app=readFileSync(new URL('../../../App.tsx',import.meta.url),'utf8')
const route=readFileSync(new URL('../../supporter/supporterAccountRoute.mjs',import.meta.url),'utf8')
test('PayPal return and cancel resolve to PWA shell instead of Vercel 404',()=>{
 assert.ok(config.rewrites.some(x=>x.source==='/paypal/return'&&x.destination==='/index.html'))
 assert.ok(config.rewrites.some(x=>x.source==='/paypal/cancel'&&x.destination==='/index.html'))
 assert.ok(route.includes("location?.pathname==='/paypal/return'"))
 assert.ok(route.includes("location?.pathname==='/paypal/cancel'"))
 assert.ok(route.includes('history.replaceState('))
 assert.ok(app.includes('normalizeSupporterPaypalCallback(window.location,window.history)'))
})
test('public checkout host is staged separately from platform preview',()=>{
 const sql=readFileSync(new URL('../../../../supabase/migrations/20261019183232_pazo_admin_paypal_gateway_settings.sql',import.meta.url),'utf8')
 assert.ok(sql.includes('return_origin text NOT NULL'))
 assert.ok(sql.includes("p_return_origin !~ '^https://"))
 assert.ok(sql.includes("live_checkout_enabled=false"))
 assert.ok(!sql.includes("DEFAULT 'https://pazo"))
})
