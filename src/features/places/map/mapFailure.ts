export type BasemapFailure='map_authorization'|'map_unavailable'
/** Fixed categories only: upstream URLs/messages may contain tokens or location. */
export function classifyBasemapFailure(value:unknown):BasemapFailure|null {
 if(!value||typeof value!=='object')return null
 const error=value as {message?:unknown;url?:unknown;status?:unknown;statusCode?:unknown}
 const message=typeof error.message==='string'?error.message:''
 const resource=typeof error.url==='string'?error.url:''
 if(/\/models\/places\/|mapbox-terrain-dem-v1|pazo-terrain-dem|terrain-rgb/i.test(resource+' '+message))return null
 const context=message+' '+resource
 const status=Number(error.status??error.statusCode)
 // Some Mapbox errors have an HTTP code without the URL. A tile authorization
 // rejection is not a normal blank basemap, even when the URL was omitted.
 if([401,403].includes(status)||/\b(401|403)\b|unauthoriz|forbidden/i.test(message))return 'map_authorization'
 if(!/mapbox|tiles|styles|resource|openstreetmap/i.test(context))return null
 if(status===404||status>=500||/failed to fetch|networkerror|network error|loading tile/i.test(message))return 'map_unavailable'
 return null
}
