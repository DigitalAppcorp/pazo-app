/**
 * PAZO A01 welcome mascot: original layered vector, rather than a flattened
 * screenshot. Every expression/movement is decorative: no timers, data
 * collection, audio, animation library or interference with onboarding.
 */
export function WelcomeAnimatedCompanion() {
  return <svg aria-hidden="true" focusable="false"
    className="pazo-welcome-dog h-full w-full overflow-visible" viewBox="0 0 420 386"
    preserveAspectRatio="xMidYMax meet">
    <defs>
      <linearGradient id="pazoWelcomeDogFur" x1=".12" y1=".1" x2=".92" y2=".9">
        <stop offset="0" stopColor="#FEC179"/>
        <stop offset=".57" stopColor="#E9A154"/>
        <stop offset="1" stopColor="#CF8544"/>
      </linearGradient>
      <linearGradient id="pazoWelcomeDogLight" x1="0" x2="1" y1="0" y2="1">
        <stop stopColor="#FFF7E5"/><stop offset="1" stopColor="#F9E4C6"/>
      </linearGradient>
      <linearGradient id="pazoWelcomeDogInner" x1="0" x2="1" y1="0" y2="1">
        <stop stopColor="#E69B69"/><stop offset="1" stopColor="#B97755"/>
      </linearGradient>
      <filter id="pazoWelcomeSoftShadow"><feGaussianBlur stdDeviation="7"/></filter>
    </defs>

    <ellipse cx="212" cy="359" rx="163" ry="12" fill="#4F7047" opacity=".19" filter="url(#pazoWelcomeSoftShadow)"/>
    <path d="M0 348Q78 330 145 341T290 338Q362 333 420 347V386H0Z" fill="#91B26C" opacity=".36"/>

    <g fill="#568B58" opacity=".95">
      <path d="M42 353Q19 317 18 280Q46 283 61 333Q50 285 74 269Q90 302 74 343Q103 305 117 315Q109 352 96 363Z"/>
      <path d="M332 352Q317 306 337 278Q355 297 350 341Q373 294 390 292Q398 324 370 355Q395 337 413 346L406 368H332Z"/>
      <path d="M13 360Q24 335 36 345Q38 365 34 372H11Z" fill="#AEC77E"/>
      <path d="M387 365Q399 337 417 337V375H387Z" fill="#BED184"/>
    </g>
    <g className="pazo-welcome-leaf pazo-welcome-leaf--left" fill="#C6D98A" opacity=".8">
      <path d="M65 296Q42 265 35 243Q78 254 65 296Z"/>
    </g>

    {/* Tail pivots behind the torso; unlike a simple image bob it actually wags. */}
    <g className="pazo-welcome-tail">
      <path d="M146 245Q103 208 92 246Q89 284 135 298L162 283Z" fill="url(#pazoWelcomeDogFur)"/>
      <path d="M100 241Q111 226 131 241Q123 254 115 261Q101 259 100 241Z" fill="#FFF0D3"/>
      <path d="M98 257Q112 275 139 279" fill="none" opacity=".27" stroke="#AD703E" strokeWidth="5" strokeLinecap="round"/>
    </g>

    {/* Torso breathing is separate from head tilt and wag. */}
    <g className="pazo-welcome-breath">
      <path d="M120 274Q123 221 167 207Q214 181 261 207Q307 220 310 279L307 340H116Z" fill="url(#pazoWelcomeDogFur)"/>
      <path d="M155 276Q166 237 200 235Q232 237 243 278L242 334H161Z" fill="url(#pazoWelcomeDogLight)"/>
      <path d="M124 317Q121 289 146 277L167 292L170 345H136Q127 340 124 317Z" fill="#DA9050"/>
      <path d="M270 283Q296 287 300 318L298 344H263L256 292Z" fill="#D78B49"/>
      <path d="M148 329Q159 339 155 353H116Q108 349 112 337Q125 324 148 329Z" fill="#FFF1DE"/>
      <path d="M280 329Q297 331 300 344Q303 357 291 357H253Q244 353 251 340Q261 329 280 329Z" fill="#FFF1DE"/>
      <path d="M126 341v9m16-11v10m124-12v11m15-7v9" fill="none" stroke="#D4B18A" strokeWidth="2.4" strokeLinecap="round"/>
    </g>

    {/* Large, friendly corgi face is a layered animated illustration. */}
    <g className="pazo-welcome-head">
      <path d="M142 165Q103 134 98 53Q102 31 124 41Q167 63 181 105Z" fill="url(#pazoWelcomeDogFur)"/>
      <path d="M127 136Q112 110 111 62Q115 54 123 65Q146 94 153 115Z" fill="url(#pazoWelcomeDogInner)"/>
      <path d="M268 164Q303 121 313 54Q316 28 294 40Q251 62 236 105Z" fill="url(#pazoWelcomeDogFur)"/>
      <path d="M286 132Q304 103 301 64Q296 56 290 68Q269 96 262 116Z" fill="url(#pazoWelcomeDogInner)"/>
      <path d="M115 147Q113 89 167 79Q212 68 255 81Q311 91 308 152Q310 210 264 247Q239 268 206 269Q152 262 128 216Q110 187 115 147Z" fill="url(#pazoWelcomeDogFur)"/>
      <path d="M182 81Q200 73 220 78Q232 121 226 156Q219 177 210 178Q198 170 195 155Q190 126 182 81Z" fill="#FFF5E5" opacity=".95"/>
      <path d="M142 181Q134 165 125 184Q121 207 151 229Q183 254 209 250Q237 253 271 229Q298 209 292 184Q286 170 274 183Q256 153 225 167Q209 180 199 171Q168 151 142 181Z" fill="url(#pazoWelcomeDogLight)"/>

      <g className="pazo-welcome-eyes">
        <path d="M147 145Q157 129 171 142" stroke="#35453B" strokeWidth="7" fill="none" strokeLinecap="round"/>
        <path d="M239 143Q250 129 264 143" stroke="#35453B" strokeWidth="7" fill="none" strokeLinecap="round"/>
      </g>
      <g className="pazo-welcome-blink">
        <path d="M147 144Q158 151 171 143" stroke="#35453B" strokeWidth="6" fill="none" strokeLinecap="round"/>
        <path d="M239 143Q250 150 264 143" stroke="#35453B" strokeWidth="6" fill="none" strokeLinecap="round"/>
      </g>
      <ellipse cx="149" cy="196" rx="16" ry="9" fill="#E9A095" opacity=".37"/>
      <ellipse cx="271" cy="196" rx="16" ry="9" fill="#E9A095" opacity=".37"/>
      <path d="M189 181Q206 174 223 180Q220 196 207 198Q195 197 189 181Z" fill="#37443D"/>
      <path d="M207 196v11Q193 222 174 209M207 207Q224 223 243 209" stroke="#594B40" strokeWidth="5" fill="none" strokeLinecap="round"/>
      <path d="M186 207Q209 221 230 209Q225 250 206 250Q189 249 186 207Z" fill="#8C4C47"/>
      <path className="pazo-welcome-tongue" d="M205 218Q186 210 187 229Q188 254 206 256Q223 257 226 232Q225 212 205 218Z" fill="#EE969A"/>
      <path d="M204 225Q208 238 206 249" stroke="#D46D7D" strokeWidth="3.2" fill="none" strokeLinecap="round"/>
      <path d="M147 235Q204 285 267 235" fill="none" stroke="#204E4A" strokeWidth="13" strokeLinecap="round"/>
      <ellipse cx="205" cy="270" rx="17" ry="16" fill="#E1E53F"/>
      <circle cx="205" cy="268" r="11" fill="#D4BB53"/>
      <circle cx="205" cy="268" r="7" fill="#F5DE68"/>
      <path d="m203 263 5 5-5 5" stroke="#8F8133" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M136 167Q142 169 145 175" stroke="#FFF7E5" opacity=".37" strokeWidth="4" fill="none" strokeLinecap="round"/>
    </g>
  </svg>
}
