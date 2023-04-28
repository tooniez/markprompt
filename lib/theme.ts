export type Color = string;
export type Dimension = number;

export const isColor = (value: any): value is Color => {
  return typeof value === 'string';
};

export const isDimension = (value: any): value is Dimension => {
  return typeof value === number;
};

export type ComponentTheme = {};
