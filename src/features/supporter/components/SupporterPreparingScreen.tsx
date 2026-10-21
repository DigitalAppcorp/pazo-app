// PAZO supporter preflight — friendly, self-contained animated illustration.
// No new provider calls, subscription state, dependencies or fonts.
type Props={lang:'es'|'en';unavailable:boolean;slow:boolean;onRetry:()=>void;onClose:()=>void}
export function SupporterPreparingScreen({lang,unavailable,slow,onRetry,onClose}:Props){
 const t=(es:string,en:string)=>lang==='es'?es:en
 const failed=unavailable||slow
 return <div
  className="absolute inset-0 z-30 flex min-h-full flex-col items-center justify-center overflow-y-auto bg-[#F5F5ED] px-6 py-8 text-center text-[#204E4A]"
  role={failed?'alert':'status'} aria-live="polite" aria-busy={!failed}>
  <div className="w-full max-w-[330px]">
   <p className="mb-5 text-[12px] font-black tracking-[0.19em] text-[#658077]">PAZO</p>
   <div className="relative mx-auto flex h-[228px] w-[270px] max-w-full items-center justify-center">
    <div className="absolute left-[19px] top-[32px] h-[160px] w-[224px] rounded-full bg-[#E9EDDA] opacity-80"/>
    <svg className="relative z-10 h-[205px] w-[245px] overflow-visible" viewBox="0 0 245 205"
      fill="none" aria-hidden="true" focusable="false">
     <ellipse cx="125" cy="181" rx="94" ry="10" fill="#D6DFC8" opacity=".75"/>
     <g className="pazo-kitten-tail">
      <path d="M151 132C189 154 213 132 209 105C206 82 188 80 183 90C178 103 195 112 182 121C169 127 161 121 148 115Z" fill="#A6BD94"/>
      <path d="M189 88C201 79 216 88 214 101C209 107 201 109 197 105C204 98 197 92 189 88Z" fill="#C4D3B0"/>
     </g>
     <ellipse cx="119" cy="135" rx="62" ry="45" fill="#C1CFAD"/>
     <ellipse cx="118" cy="149" rx="37" ry="25" fill="#F7EEDF"/>
     <path d="M68 86L70 34C72 22 87 30 103 45L115 53L143 41C157 30 171 28 171 44L170 92Z" fill="#ADC29A"/>
     <path d="M78 72L78 40C84 41 94 51 101 61Z" fill="#EABDAE"/>
     <path d="M144 61C153 50 161 42 164 40L163 73Z" fill="#EABDAE"/>
     <ellipse cx="119" cy="98" rx="57" ry="49" fill="#BDCFAB"/>
     <path d="M89 115C89 100 102 93 119 94C139 92 153 102 150 118C148 136 134 142 120 141C102 140 91 132 89 115Z" fill="#F6ECDD"/>
     <ellipse cx="96" cy="102" rx="5" ry="6" fill="#244A3F"/>
     <ellipse cx="142" cy="102" rx="5" ry="6" fill="#244A3F"/>
     <ellipse cx="85" cy="115" rx="10" ry="5" fill="#E8B9AC" opacity=".7"/>
     <ellipse cx="152" cy="115" rx="10" ry="5" fill="#E8B9AC" opacity=".7"/>
     <path d="M113 113C115 110 122 110 125 113L119 118Z" fill="#B77776"/>
     <path d="M119 118C116 124 112 124 110 121C111 129 118 128 119 122C122 128 129 128 130 121C128 124 122 124 119 118Z" fill="#496E5A"/>
     <path d="M73 127C59 126 46 133 44 150C42 165 57 171 72 163C84 155 91 143 92 133Z" fill="#B0C79C"/>
     <ellipse cx="66" cy="159" rx="18" ry="12" fill="#D9E0C9"/>
     <g className="pazo-kitten-paw">
      <path d="M161 132C174 122 188 131 187 146C186 162 169 171 154 163L140 155Z" fill="#B1C89F"/>
      <ellipse cx="168" cy="157" rx="17" ry="12" fill="#D9E0C9"/>
      <ellipse cx="159" cy="156" rx="3" ry="4" fill="#A3BD92"/>
      <ellipse cx="168" cy="153" rx="3" ry="4" fill="#A3BD92"/>
      <ellipse cx="177" cy="157" rx="3" ry="4" fill="#A3BD92"/>
     </g>
     <g className="pazo-kitten-yarn">
      <path d="M171 174C162 164 163 151 176 145C191 139 199 153 193 163C187 172 194 181 208 173" fill="none" stroke="#D0AB51" strokeWidth="3" strokeLinecap="round"/>
      <circle cx="205" cy="169" r="27" fill="#E1E53F"/>
      <path d="M190 150C212 155 210 180 196 193" fill="none" stroke="#C5CA39" strokeWidth="3" strokeLinecap="round"/>
      <path d="M199 143C215 152 225 169 218 187" fill="none" stroke="#FAF2AC" strokeWidth="3" strokeLinecap="round"/>
      <path d="M184 166C194 160 207 165 213 175" fill="none" stroke="#C5CA39" strokeWidth="3" strokeLinecap="round"/>
     </g>
    </svg>
   </div>
   <h2 className="mt-2 text-[22px] font-black tracking-[-0.04em]">
    {failed?t('No pudimos preparar tu membresía','We could not prepare your membership')
      :t('Preparando tu espacio…','Getting everything ready…')}
   </h2>
   <p className="mx-auto mt-3 max-w-[280px] text-[14px] font-medium leading-relaxed text-[#657F74]">
    {unavailable
      ?t('No pudimos comprobar tu estado. No se inició ningún cobro.','We could not check your status. No charge was started.')
      :slow
        ?t('Esto está tardando más de lo esperado. Puedes volver a intentarlo.','This is taking longer than expected. You can try again.')
        :t('Estamos comprobando tu membresía para mostrarte la opción correcta.','We are checking your membership to show the right option.')}
   </p>
   {!failed&&<div className="mt-6 flex justify-center gap-2" aria-hidden="true">
    <span className="pazo-kitten-dot h-2 w-2 rounded-full bg-[#8EBF8B]"/>
    <span className="pazo-kitten-dot h-2 w-2 rounded-full bg-[#8EBF8B]"/>
    <span className="pazo-kitten-dot h-2 w-2 rounded-full bg-[#8EBF8B]"/>
   </div>}
   {failed&&<button type="button" onClick={onRetry}
     className="mt-6 min-h-12 w-full rounded-full bg-[#E1E53F] px-5 py-3 text-[15px] font-black text-[#204E4A] hover:bg-[#EBEF78] focus-visible:bg-[#F0F59B]">
     {t('Intentar de nuevo','Try again')}
   </button>}
   <button type="button" onClick={onClose}
    className="mt-4 min-h-11 rounded-full px-5 py-2 text-[13px] font-bold text-[#476862] underline underline-offset-4 hover:bg-[#E9EDDD] focus-visible:bg-[#E1E53F]">
    {t('Volver a PAZO','Back to PAZO')}
   </button>
  </div>
 </div>
}
