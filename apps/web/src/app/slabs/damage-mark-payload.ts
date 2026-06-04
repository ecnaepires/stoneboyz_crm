export const damageMarkTypes = ['scratch', 'chip', 'crack', 'stain', 'other'] as const;
export const damageMarkSeverities = ['minor', 'major'] as const;

export type DamageMarkType = (typeof damageMarkTypes)[number];
export type DamageMarkSeverity = (typeof damageMarkSeverities)[number];

export interface DamageMarkPayload {
  type: DamageMarkType;
  severity: DamageMarkSeverity;
  shape: unknown;
  note?: string;
}

const isDamageMarkType = (value: string): value is DamageMarkType =>
  damageMarkTypes.includes(value as DamageMarkType);

const isDamageMarkSeverity = (value: string): value is DamageMarkSeverity =>
  damageMarkSeverities.includes(value as DamageMarkSeverity);

export const buildDamageMarkPayload = (formData: FormData): DamageMarkPayload => {
  const typeValue = String(formData.get('type') ?? '');
  const severityValue = String(formData.get('severity') ?? 'minor');
  const shapeValue = String(formData.get('shape') ?? '');
  const noteValue = String(formData.get('note') ?? '').trim();

  if (!isDamageMarkType(typeValue)) {
    throw new Error('Choose a damage type');
  }

  if (!isDamageMarkSeverity(severityValue)) {
    throw new Error('Choose a damage severity');
  }

  if (!shapeValue) {
    throw new Error('Mark the damage area on the photo');
  }

  return {
    type: typeValue,
    severity: severityValue,
    shape: JSON.parse(shapeValue),
    ...(noteValue ? { note: noteValue } : {}),
  };
};
