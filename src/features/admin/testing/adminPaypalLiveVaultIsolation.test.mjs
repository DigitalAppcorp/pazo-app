import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const ui=readFileSync(new URL('../components/AdminPayPalSettings.tsx',import.meta.url),'utf8')

test('Live renders no editable Client ID / Client Secret fields in legacy Vault',()=>{
 assert.ok(ui.includes("data-pazo-live-vault-locked=\"true\""))
 assert.ok(ui.includes("env==='sandbox'?"))
 assert.ok(ui.includes("Las credenciales Live se guardan cifradas mediante el formulario privado de abajo"))
 assert.ok(ui.includes("LIVE_VAULT_SETUP_RELEASED&&<AdminPaypalLiveVaultSetup"))
 assert.ok(ui.includes("const LIVE_EDGE_PROVISIONING_RELEASED=false"))
})
test('legacy credential RPC refuses Live even when called from stale UI code',()=>{
 const start=ui.indexOf(' const saveCredentials=async()=>{')
 const end=ui.indexOf(' const inspectExistingSandbox=async()=>{',start)
 assert.ok(start>=0&&end>start)
 const source=ui.slice(start,end)
 assert.ok(source.indexOf("if(env==='live')")>=0)
 assert.ok(source.indexOf("if(env==='live')")<
  source.indexOf("supabase.rpc('pazo_admin_paypal_save_credentials'"))
 assert.ok(source.includes("setClientSecret('')"))
})
test('switching Sandbox to Live clears in-memory secret fields',()=>{
 assert.ok(ui.includes("setEnv(value);setClientId('');setClientSecret('')"))
})
test('Live never invokes legacy Vault connection validation',()=>{
 const start=ui.indexOf(' const validateCredentials=async()=>{')
 const end=ui.indexOf(' const liveContent = <div',start)
 assert.ok(start>=0&&end>start)
 const source=ui.slice(start,end)
 assert.ok(source.indexOf("if(env==='live')")<
  source.indexOf("supabase.functions.invoke('pazo-admin-paypal-validate'"))
})
