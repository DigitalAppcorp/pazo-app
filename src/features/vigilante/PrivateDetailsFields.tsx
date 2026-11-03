import { useId, useState } from 'react'
import { HEALTH_CONDITIONS, HEALTH_CONDITION_LABELS, type HealthCondition, type PetHealthDetails } from './privateDetails'

const inputClass = 'w-full bg-[#FAF8F5] border border-[#204E4A]/10 rounded-xl px-3 py-1.5 text-xs text-[#204E4A] focus:outline-none focus:border-[#E1E53F]'
const labelClass = 'text-[13px] font-bold text-[#5C7470] block mb-0.5'

interface PostalCodeFieldProps {
  value: string
  onChange: (value: string) => void
  lang: 'es' | 'en'
  invalid?: boolean
  inputClassName?: string
  labelClassName?: string
}

// Optional household postal code. The "i" button explains why PAZO asks for it.
export const PostalCodeField = ({ value, onChange, lang, invalid = false, inputClassName = inputClass, labelClassName = labelClass }: PostalCodeFieldProps) => {
  const id = useId()
  const [showInfo, setShowInfo] = useState(false)
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <label htmlFor={id} className={labelClassName}>
          {lang === 'es' ? 'Código postal · privado · opcional' : 'ZIP code · private · optional'}
        </label>
        <button
          type="button"
          aria-expanded={showInfo}
          aria-controls={id + '-info'}
          aria-label={lang === 'es' ? '¿Para qué es el código postal?' : 'What is the ZIP code for?'}
          onClick={() => setShowInfo((open) => !open)}
          className="mb-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#E7F0DA] text-[11px] font-black text-[#204E4A] cursor-pointer"
        >
          i
        </button>
      </div>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="postal-code"
        maxLength={5}
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, 5))}
        aria-invalid={invalid}
        aria-describedby={invalid ? id + '-error' : undefined}
        placeholder="90026"
        className={inputClassName}
      />
      {showInfo && (
        <p id={id + '-info'} className="mt-1 text-[12px] leading-snug text-[#5C7470]">
          {lang === 'es'
            ? 'Lo usamos solo para avisos de salud cerca de ti. Nadie más lo ve.'
            : 'We only use it for health alerts near you. No one else can see it.'}
        </p>
      )}
      {invalid && (
        <p id={id + '-error'} role="alert" className="mt-1 text-[12px] font-bold text-[#B5462F]">
          {lang === 'es' ? 'Escribe los 5 dígitos o déjalo vacío.' : 'Enter all 5 digits or leave it empty.'}
        </p>
      )}
    </div>
  )
}

interface PetHealthFieldsProps {
  value: PetHealthDetails
  onChange: (value: PetHealthDetails) => void
  lang: 'es' | 'en'
  birthMonthInvalid?: boolean
}

export const PetHealthFields = ({ value, onChange, lang, birthMonthInvalid = false }: PetHealthFieldsProps) => {
  const id = useId()
  const toggleCondition = (condition: HealthCondition) =>
    onChange({
      ...value,
      conditions: value.conditions.includes(condition)
        ? value.conditions.filter((item) => item !== condition)
        : [...value.conditions, condition],
    })
  return (
    <>
      <div>
        <label htmlFor={id + '-birth'} className={labelClass}>
          {lang === 'es' ? 'Mes y año de nacimiento aprox. · privado' : 'Approx. birth month · private'}
        </label>
        <input
          id={id + '-birth'}
          type="month"
          value={value.birthMonth}
          onChange={(event) => onChange({ ...value, birthMonth: event.target.value })}
          aria-invalid={birthMonthInvalid}
          className={inputClass}
        />
        {birthMonthInvalid && (
          <p role="alert" className="mt-1 text-[12px] font-bold text-[#B5462F]">
            {lang === 'es' ? 'Elige un mes que ya haya pasado.' : 'Choose a month that has already passed.'}
          </p>
        )}
      </div>

      <div>
        <span id={id + '-conditions'} className={labelClass}>
          {lang === 'es' ? 'Condiciones de salud · privado' : 'Health conditions · private'}
        </span>
        <div role="group" aria-labelledby={id + '-conditions'} className="flex flex-wrap gap-1.5">
          {HEALTH_CONDITIONS.map((condition) => {
            const selected = value.conditions.includes(condition)
            return (
              <button
                key={condition}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleCondition(condition)}
                className={`text-[12px] font-bold px-2.5 py-1.5 rounded-full transition-colors cursor-pointer ${selected
                  ? 'bg-[#204E4A] text-[#E1E53F]'
                  : 'bg-[#FAF8F5] text-[#5C7470]'
                }`}
              >
                {HEALTH_CONDITION_LABELS[condition][lang]}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label htmlFor={id + '-brand'} className={labelClass}>
            {lang === 'es' ? 'Marca de su comida' : 'Food brand'}
          </label>
          <input
            id={id + '-brand'}
            type="text"
            maxLength={80}
            value={value.foodBrand}
            onChange={(event) => onChange({ ...value, foodBrand: event.target.value })}
            placeholder={lang === 'es' ? 'Opcional' : 'Optional'}
            className={inputClass}
          />
        </div>
        <div className="flex-1">
          <label htmlFor={id + '-product'} className={labelClass}>
            {lang === 'es' ? 'Producto' : 'Product'}
          </label>
          <input
            id={id + '-product'}
            type="text"
            maxLength={120}
            value={value.foodProduct}
            onChange={(event) => onChange({ ...value, foodProduct: event.target.value })}
            placeholder={lang === 'es' ? 'Opcional' : 'Optional'}
            className={inputClass}
          />
        </div>
      </div>
      <p className="text-[11px] leading-snug text-[#5C7470]">
        {lang === 'es'
          ? 'Con estos datos PAZO solo te avisa de lo que le importa a tu mascota. Nunca salen en su perfil público.'
          : 'PAZO uses these only to alert you about what matters to your pet. They never appear on the public profile.'}
      </p>
    </>
  )
}
