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
import { ErrorLabel } from '@/components/ui/Forms';
import { NoAutoInput } from '@/components/ui/Input';
import { setSourceData } from '@/lib/api';
import useSources from '@/lib/hooks/use-sources';
import { DbSource, NangoSourceDataType, Project } from '@/types/types';

type NotionPagesSettingsProps = {
  projectId: Project['id'];
  source: DbSource | undefined;
  forceDisabled?: boolean;
  onDidCompletedOrSkip?: () => void;
};

export const NotionPagesSettings: FC<NotionPagesSettingsProps> = ({
  projectId,
  source,
  forceDisabled,
  onDidCompletedOrSkip,
}) => {
  const { mutate: mutateSources, isNameAvailable } = useSources();

  return (
    <Formik
      initialValues={{
        name: (source?.data as NangoSourceDataType)?.name || '',
      }}
      enableReinitialize
      validateOnMount
      validate={async (values) => {
        const errors: FormikErrors<FormikValues> = {};
        if (!values.name || values.name.trim().length === 0) {
          errors.name = 'Please enter a name';
        } else if (
          values.name !== (source?.data as NangoSourceDataType).name &&
          !isNameAvailable(values.name)
        ) {
          errors.name = 'This name is already taken';
        }

        return errors;
      }}
      onSubmit={async (values, { setSubmitting }) => {
        if (!projectId || !source) {
          return;
        }

        setSubmitting(true);
        await setSourceData(projectId, source.id, {
          ...(source.data as any),
          name: values.name,
        });
        setSubmitting(false);
        toast.success('Configuration has been updated');
        onDidCompletedOrSkip?.();
        await mutateSources();
      }}
    >
      {({ isSubmitting, isValid }) => (
        <Form className="FormRoot">
          <div className="FormField">
            <div className="FormLabel">Name</div>
            <div className="flex flex-row gap-2">
              <Field
                className="flex-grow"
                type="text"
                name="name"
                inputSize="sm"
                as={NoAutoInput}
                disabled={isSubmitting || forceDisabled}
              />
            </div>
            <ErrorMessage name="name" component={ErrorLabel} />
          </div>
          <Button
            className="place-self-start"
            disabled={!isValid || forceDisabled}
            loading={isSubmitting}
            variant="plain"
            buttonSize="sm"
            type="submit"
          >
            Save
          </Button>
        </Form>
      )}
    </Formik>
  );
};
