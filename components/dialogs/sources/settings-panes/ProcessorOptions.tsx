import {
  ErrorMessage,
  Field,
  Form,
  Formik,
  FormikErrors,
  FormikValues,
} from 'formik';
import { FC } from 'react';
import { toast } from 'sonner';

import Button from '@/components/ui/Button';
import {
  ErrorLabel,
  FormField,
  FormLabel,
  FormRoot,
} from '@/components/ui/Forms';
import { NoAutoTextArea } from '@/components/ui/TextArea';
import { MarkdownProcessorOptions } from '@/lib/schema';

type ProcessorOptionsProps = {
  processorOptions?: MarkdownProcessorOptions;
  isValid: boolean;
  isSubmitting: boolean;
  forceDisabled: boolean;
  onChanged: (processorOptions: MarkdownProcessorOptions) => void;
};

export const ProcessorOptions: FC<ProcessorOptionsProps> = ({
  processorOptions,
  isValid,
  isSubmitting,
  forceDisabled,
  onChanged,
}) => {
  return (
    <>
      <FormField>
        <FormLabel>Name</FormLabel>
        <Field
          className="h-[120px] flex-grow font-mono text-xs"
          type="text"
          name="metadataFields"
          placeholder={`Example: Id, Language`}
          textAreaSize="sm"
          as={NoAutoTextArea}
          disabled={isSubmitting}
        />
        <ErrorMessage name="name" component={ErrorLabel} />
      </FormField>
    </>
  );
};
