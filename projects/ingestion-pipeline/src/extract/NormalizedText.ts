import { Brand, Schema } from 'effect'

import * as Unicode from '@news-research/ingestion-data/Unicode'

function normalizeText(maxLength: number) {
  return (text: string) =>
    text
      .normalize('NFC')
      .split(/\s+/)
      .map((line) => line.trim())
      .filter((line) => line !== '')
      .join(' ')
      .slice(0, maxLength)
}

export function NormalizedTextSSchema<S extends number>(size: S) {
  return Schema.transform(
    Schema.String,
    Schema.String.pipe(
      Schema.maxLength(size),
      Schema.brand(`NormalizedText${size}` as const)
    ),
    {
      strict: true,
      decode: normalizeText(size),
      encode: normalizeText(size),
    }
  ).pipe(Unicode.parseUnicode())
}

export function NormalizedTextSBrand<S extends number>(_: S) {
  return Brand.nominal<string & Brand.Brand<`NormalizedText${S}`>>()
}

export type NormalizedTextS<S extends number> = string &
  Brand.Brand<`NormalizedText${S}`>

const sizes = {
  tiny: 64,
  small: 256,
  medium: 512,
  large: 1024,
  xl: 2048,
  xxl: 4096,
} as const

export const NormalizedTextTinySchema = NormalizedTextSSchema(sizes.tiny)
export type NormalizedTextTiny = NormalizedTextS<typeof sizes.tiny>
export const NormalizedTextTinyBrand = NormalizedTextSBrand(sizes.tiny)

export const NormalizedTextSmallSchema = NormalizedTextSSchema(sizes.small)
export type NormalizedTextSmall = NormalizedTextS<typeof sizes.small>
export const NormalizedTextSmallBrand = NormalizedTextSBrand(sizes.small)

export const NormalizedTextMediumSchema = NormalizedTextSSchema(sizes.medium)
export type NormalizedTextMedium = NormalizedTextS<typeof sizes.medium>
export const NormalizedTextMediumBrand = NormalizedTextSBrand(sizes.medium)

export const NormalizedTextLargeSchema = NormalizedTextSSchema(sizes.large)
export type NormalizedTextLarge = NormalizedTextS<typeof sizes.large>
export const NormalizedTextLargeBrand = NormalizedTextSBrand(sizes.large)

export const NormalizedTextXlSchema = NormalizedTextSSchema(sizes.xl)
export type NormalizedTextXl = NormalizedTextS<typeof sizes.xl>
export const NormalizedTextXlBrand = NormalizedTextSBrand(sizes.xl)

export const NormalizedTextXxlSchema = NormalizedTextSSchema(sizes.xxl)
export type NormalizedTextXxl = NormalizedTextS<typeof sizes.xxl>
export const NormalizedTextXxlBrand = NormalizedTextSBrand(sizes.xxl)
