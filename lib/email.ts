import { MonthlyUpdateTemplate } from '@/components/emails/templates/MonthlyUpdate';
import { PlainTemplate } from '@/components/emails/templates/Plain';

export type TemplateId = 'plain' | 'monthly_update';

export const getTemplate = (id: TemplateId) => {
  switch (id) {
    case 'monthly_update':
      return MonthlyUpdateTemplate;
    case 'plain':
      return PlainTemplate;
  }
};
