// PAZO F16-P05 — static privileged SQL draft grant guard.
// Limited to reviewed P05 drafts; runtime catalog verification still required.
// It never approves hosted SQL, a financial record or a service benefit.
const SCHEMA_FN=/\bCREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(public\.f16_[a-z0-9_]+)\s*\(/gi
const SAFE=Object.freeze({phase:'PASS',reason:'privileged_draft_functions_fenced',
 mayApplyHostedSql:false,mayDeployWorker:false,mayGrantBenefits:false})
function normalize(source){
 return source.replace(/--[^\r\n]*/g,' ').replace(/\s+/g,' ')
}
const count=(s,rx)=>[...s.matchAll(rx)].length
export function auditP05PrivilegedSqlDraft(source){
 const block=reason=>Object.freeze({...SAFE,phase:'BLOCK',reason})
 if(typeof source!=='string'||source.length>250000||source.length<50)
  return block('sql_source_invalid')
 const s=normalize(source)
 const functions=[...s.matchAll(SCHEMA_FN)].map(x=>x[1])
 if(count(s,/\bCREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\b/gi)!==functions.length)
  return block('unrecognized_function_schema_or_name')
 if(!/^\s*\\set\s+ON_ERROR_STOP\s+on/im.test(source)||
  !/\bBEGIN\s*;/i.test(s)||!/\bCOMMIT\s*;/i.test(s)||
  !/current_database\(\)\s*<>\s*'f14_synthetic'/i.test(s)||
  !/session_user\s*<>\s*'f14_admin'/i.test(s))
  return block('disposable_only_guard_missing')
 if(/\bGRANT\s+EXECUTE\s+ON\s+FUNCTION\b[\s\S]*?\bTO\s+(?:PUBLIC|anon|authenticated)\b/i.test(s))
  return block('client_execute_grant_detected')
 if(/\bDROP\s+(?:TABLE|SCHEMA)\b|\bALTER\s+DEFAULT\s+PRIVILEGES\b/i.test(s))
  return block('wide_privilege_mutation')
 for(const fn of functions){
  const pattern=fn.replace(/\./g,'\\.')
  const revoke=new RegExp(
   '\\bREVOKE\\s+ALL\\s+ON\\s+FUNCTION\\s+'+pattern+
   '\\s*\\([^;]*\\)\\s+FROM\\s+PUBLIC\\s*,\\s*anon\\s*,\\s*authenticated\\s*;', 'i')
  const grant=new RegExp(
   '\\bGRANT\\s+EXECUTE\\s+ON\\s+FUNCTION\\s+'+pattern+
   '\\s*\\([^;]*\\)\\s+TO\\s+service_role\\s*;', 'i')
  if(!revoke.test(s))return block('privileged_function_revoke_missing')
  if(!grant.test(s))return block('privileged_function_service_grant_missing')
 }
 if(functions.length>0&&
  (count(s,/\bSECURITY\s+DEFINER\b/gi)<functions.length||
   count(s,/\bSET\s+search_path\s*=\s*''/gi)<functions.length))
  return block('privileged_function_search_path_or_definer_missing')
 return SAFE
}
