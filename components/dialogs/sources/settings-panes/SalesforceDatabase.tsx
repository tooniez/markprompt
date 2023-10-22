import {
  ErrorMessage,
  Field,
  Form,
  Formik,
  FormikErrors,
  FormikValues,
} from 'formik';
import { FC, useCallback } from 'react';
import { toast } from 'sonner';

import Button from '@/components/ui/Button';
import { ErrorLabel } from '@/components/ui/Forms';
import { NoAutoInput } from '@/components/ui/Input';
import { setSourceData } from '@/lib/api';
import useSources from '@/lib/hooks/use-sources';
import { setMetadata } from '@/lib/integrations/nango.client';
import { SalesforceNangoMetadata } from '@/lib/integrations/salesforce';
import { DbSource, NangoSourceDataType, Project } from '@/types/types';

import { SalesforceSharedForm, prepareFields } from './SalesforceSharedForm';

type SalesforceDatabaseSettingsProps = {
  projectId: Project['id'];
  source: DbSource | undefined;
  forceDisabled?: boolean;
  onDidCompletedOrSkip?: () => void;
};

export const SalesforceDatabaseSettings: FC<
  SalesforceDatabaseSettingsProps
> = ({ projectId, source, forceDisabled, onDidCompletedOrSkip }) => {
  const { mutate: mutateSources, isNameAvailable } = useSources();

  const sourceData = source?.data as NangoSourceDataType | undefined;
  const nangoMetadata = sourceData?.nangoMetadata as SalesforceNangoMetadata;

  const updateConfiguration = useCallback(
    async (
      newData: any | undefined,
      nangoMetadata: SalesforceNangoMetadata | undefined,
      setSubmitting: (submitting: boolean) => void,
    ) => {
      if (
        !projectId ||
        !source ||
        !sourceData?.integrationId ||
        !sourceData?.connectionId
      ) {
        return;
      }

      setSubmitting(true);

      await setSourceData(projectId, source.id, {
        ...(source.data as any),
        ...newData,
        ...(nangoMetadata ? { nangoMetadata } : {}),
      });

      if (nangoMetadata) {
        await setMetadata(
          projectId,
          sourceData.integrationId,
          sourceData.connectionId,
          nangoMetadata,
        );
      }

      setSubmitting(false);
      toast.success('Configuration has been updated');
      onDidCompletedOrSkip?.();
      await mutateSources();
    },
    [
      mutateSources,
      onDidCompletedOrSkip,
      projectId,
      source,
      sourceData?.connectionId,
      sourceData?.integrationId,
    ],
  );

  return (
    <>
      <Formik
        initialValues={{
          name: sourceData?.name || '',
        }}
        enableReinitialize
        validateOnMount
        validate={async (values) => {
          const errors: FormikErrors<FormikValues> = {};
          if (!values.name || values.name.trim().length === 0) {
            errors.name = 'Please enter a name';
          } else if (
            values.name !== sourceData?.name &&
            !isNameAvailable(values.name)
          ) {
            errors.name = 'This name is already taken';
          }

          return errors;
        }}
        onSubmit={async (values, { setSubmitting }) => {
          await updateConfiguration(
            { name: values.name },
            undefined,
            setSubmitting,
          );
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
      <div className="h-8" />
      <Formik
        initialValues={{
          customFields: nangoMetadata?.customFields?.join(', ') || '',
          filters: nangoMetadata?.filters || '',
          titleMapping: nangoMetadata?.mappings?.title || '',
          contentMapping: nangoMetadata?.mappings?.content || '',
          pathMapping: nangoMetadata?.mappings?.path || '',
          metadataFields: nangoMetadata?.metadataFields?.join(', ') || '',
        }}
        enableReinitialize
        onSubmit={async (values, { setSubmitting }) => {
          const nangoMetadata: SalesforceNangoMetadata = {
            customFields: prepareFields(values.customFields),
            filters: values.filters,
            mappings: {
              title: values.titleMapping,
              content: values.contentMapping,
              path: values.pathMapping,
            },
            metadataFields: prepareFields(values.metadataFields),
          };
          await updateConfiguration(undefined, nangoMetadata, setSubmitting);
        }}
      >
        {({ isSubmitting, isValid }) => (
          <Form className="FormRoot">
            <SalesforceSharedForm isSubmitting={isSubmitting} />
            <Button
              className="mt-4 flex-none self-start"
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
    </>
  );
};
