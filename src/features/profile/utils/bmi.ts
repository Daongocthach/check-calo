export type BmiCategory = 'underweight' | 'normal' | 'overweight' | 'obese';

/** The lowest BMI of each category above underweight. */
export const BMI_THRESHOLDS = { normal: 18.5, overweight: 25, obese: 30 } as const;

export function getBmiCategory(bmi: number): BmiCategory {
  if (bmi < BMI_THRESHOLDS.normal) return 'underweight';
  if (bmi < BMI_THRESHOLDS.overweight) return 'normal';
  if (bmi < BMI_THRESHOLDS.obese) return 'overweight';
  return 'obese';
}
