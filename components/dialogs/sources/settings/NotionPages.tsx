import { ErrorMessage, Field, Form, Formik } from 'formik';
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
  showSkip?: boolean;
  showOptional?: boolean;
  onDidCompletedOrSkip?: () => void;
};

export const NotionPagesSettings: FC<NotionPagesSettingsProps> = ({
  projectId,
  source,
  forceDisabled,
  showSkip,
  showOptional,
  onDidCompletedOrSkip,
}) => {
  const { mutate: mutateSources } = useSources();

  return (
    <Formik
      initialValues={{
        displayName: (source?.data as NangoSourceDataType)?.displayName || '',
      }}
      validateOnMount
      onSubmit={async (values, { setSubmitting }) => {
        if (!projectId || !source) {
          return;
        }

        setSubmitting(true);
        await setSourceData(projectId, source.id, {
          ...(source.data as any),
          displayName: values.displayName,
        });
        setSubmitting(false);
        toast.success('Configuration updated');
        onDidCompletedOrSkip?.();
        await mutateSources();
      }}
    >
      {({ isSubmitting, isValid }) => (
        <Form className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <div className="flex flex-row items-center gap-2">
              <p className="text-sm font-medium text-neutral-300">
                Display name{showOptional && ' (optional)'}
              </p>
            </div>
            <div className="flex flex-row gap-2">
              <Field
                className="flex-grow"
                type="text"
                name="displayName"
                inputSize="sm"
                as={NoAutoInput}
                disabled={isSubmitting || forceDisabled}
              />
            </div>
            <ErrorMessage name="identifier" component={ErrorLabel} />
          </div>
          <div className="flex flex-row gap-2">
            <Button
              className="flex-none"
              disabled={!isValid || forceDisabled}
              loading={isSubmitting}
              variant="plain"
              buttonSize="sm"
              type="submit"
            >
              Save
            </Button>
            {showSkip && (
              <Button
                className="flex-none"
                disabled={forceDisabled}
                variant="ghost"
                buttonSize="sm"
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onDidCompletedOrSkip?.();
                }}
              >
                Skip
              </Button>
            )}
          </div>
        </Form>
      )}
    </Formik>
  );
};
