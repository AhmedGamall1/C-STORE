export const HIDDEN = '***'

export const maskName = <T extends string | null>(value: T): T =>
  (value &&
    value
      .split(/\s+/)
      .map((word) => `${word[0]}***`)
      .join(' ')) as T

export const maskEmail = <T extends string | null>(value: T): T => {
  if (!value) return value
  const [local, domain] = value.split('@')
  return (domain ? `${local[0]}***@${domain}` : `${local[0]}***`) as T
}

export const maskPhone = <T extends string | null>(value: T): T =>
  (value && '*'.repeat(Math.max(value.length - 2, 0)) + value.slice(-2)) as T
