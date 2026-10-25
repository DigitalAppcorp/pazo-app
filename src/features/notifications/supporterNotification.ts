import type {PazoNotification} from '../../types/pazo'
export const isSupporterNotification=(value:PazoNotification)=>['supporter_campaign','supporter_verified'].includes(value.sourceType||'')&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value.sourceId||'')
export function supporterNotificationCopy(value:PazoNotification,lang:'es'|'en'){
 if(!isSupporterNotification(value))return {title:value.title,subtitle:value.subtitle}
 const en=lang==='en'
 if(value.sourceType==='supporter_campaign')return {title:en?'Help us keep growing':'Ayúdanos a seguir creciendo',subtitle:en?'Optional support for US$2.99 per month. Basic PAZO stays free. Explore Friend of PAZO whenever you wish.':'Apoyo voluntario de US$2.99 al mes. PAZO básico sigue siendo gratis. Conoce Amigo de PAZO cuando quieras.'}
 if(value.sourceType==='supporter_verified'&&value.supporterCopyVersion!=='thanks_v2')return {title:en?'You are a Friend of PAZO!':'¡Ya eres Amigo de PAZO!',subtitle:en?'Thank you for supporting our community. Your payment was verified and your benefits are available. We want to offer an excellent experience. Would you help us check them and tell us if everything works correctly?':'Muchas gracias por apoyar nuestra comunidad. Tu pago fue verificado y tus beneficios ya están disponibles. En PAZO queremos ofrecer una experiencia excelente. ¿Nos ayudas a revisarlos y contarnos si todo funciona correctamente?'}
 if(value.sourceType==='supporter_verified')return {title:en?'You are a Friend of PAZO!':'¡Ya eres Amigo de PAZO!',subtitle:en?'Your payment and benefits are verified. Thank you! Review your badge and access if you wish.':'Tu pago y tus beneficios están verificados. ¡Gracias! Revisa tu insignia y acceso si lo deseas.'}
 return {title:value.title,subtitle:value.subtitle}
}
