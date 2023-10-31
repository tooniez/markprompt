import {
  ErrorMessage,
  Field,
  Formik,
  FormikErrors,
  FormikValues,
} from 'formik';
import { FC, useCallback } from 'react';
import { toast } from 'sonner';

import Button from '@/components/ui/Button';
import {
  ErrorLabel,
  FormField,
  FormHeading,
  FormHeadingGroup,
  FormLabel,
  FormRoot,
  FormSubHeading,
} from '@/components/ui/Forms';
import { NoAutoInput } from '@/components/ui/Input';
import { RecordEditor } from '@/components/ui/RecordEditor';
import { NoAutoTextArea } from '@/components/ui/TextArea';
import { setSourceData } from '@/lib/api';
import useSources from '@/lib/hooks/use-sources';
import { setMetadata } from '@/lib/integrations/nango.client';
import { WebsitePagesNangoMetadata } from '@/lib/integrations/website';
import { DbSource, NangoSourceDataType, Project } from '@/types/types';

type WebsitePagesSettingsProps = {
  projectId: Project['id'];
  source: DbSource | undefined;
  forceDisabled?: boolean;
  onDidCompletedOrSkip?: () => void;
};

const toGlobList = (text: string) => {
  return text
    .split('\n')
    .map((url) => url.trim())
    .filter((url) => url && url.length > 0 && !url.startsWith('# '));
};

export const WebsitePagesSettings: FC<WebsitePagesSettingsProps> = ({
  projectId,
  source,
  forceDisabled,
  onDidCompletedOrSkip,
}) => {
  const { mutate: mutateSources, isNameAvailable } = useSources();

  const sourceData = source?.data as NangoSourceDataType | undefined;
  const nangoMetadata = sourceData?.nangoMetadata as WebsitePagesNangoMetadata;
  const baseUrl = nangoMetadata?.baseUrl || '';

  const updateSourceData = useCallback(
    async (
      newSourceData: Partial<NangoSourceDataType>,
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
        ...newSourceData,
        nangoMetadata: {
          ...nangoMetadata,
          ...newSourceData.nangoMetadata,
        },
      });

      if (newSourceData?.nangoMetadata) {
        await setMetadata(
          projectId,
          sourceData.integrationId,
          sourceData.connectionId,
          {
            ...nangoMetadata,
            ...newSourceData?.nangoMetadata,
          },
        );
      }

      setSubmitting(false);
      toast.success('Configuration has been updated');
      onDidCompletedOrSkip?.();
      await mutateSources();
    },
    [
      mutateSources,
      nangoMetadata,
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
          await updateSourceData({ name: values.name }, setSubmitting);
        }}
      >
        {({ isSubmitting, isValid }) => (
          <FormRoot>
            <FormField>
              <FormLabel>Name</FormLabel>
              <Field
                className="flex-grow"
                type="text"
                name="name"
                inputSize="sm"
                as={NoAutoInput}
                disabled={isSubmitting || forceDisabled}
              />
              <ErrorMessage name="name" component={ErrorLabel} />
            </FormField>
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
          </FormRoot>
        )}
      </Formik>
      <div className="h-8" />
      <Formik
        initialValues={{
          includeGlobs: nangoMetadata?.includeGlobs?.join('\n') || '',
          excludeGlobs: nangoMetadata?.excludeGlobs?.join('\n') || '',
          requestHeaders: nangoMetadata?.requestHeaders || [],
          targetSelectors: nangoMetadata?.targetSelectors || '',
          excludeSelectors: nangoMetadata?.excludeSelectors || '',
        }}
        enableReinitialize
        validateOnMount
        validate={async (values) => {
          const errors: FormikErrors<FormikValues> = {};

          if (values.excludeGlobs) {
            const urls = toGlobList(values.excludeGlobs);
            if (urls.some((url) => !url.startsWith(baseUrl))) {
              errors.excludeGlobs = `URLs must start with ${baseUrl}.`;
            }
          }

          if (values.includeGlobs) {
            const urls = toGlobList(values.includeGlobs);
            if (urls.some((url) => !url.startsWith(baseUrl))) {
              errors.includeGlobs = `URLs must start with ${baseUrl}.`;
            }
          }

          return errors;
        }}
        onSubmit={async (values, { setSubmitting }) => {
          const newNangoMetadata: Partial<WebsitePagesNangoMetadata> = {
            includeGlobs: toGlobList(values.includeGlobs),
            excludeGlobs: toGlobList(values.excludeGlobs),
            requestHeaders: values.requestHeaders,
            targetSelectors: values.targetSelectors,
            excludeSelectors: values.excludeSelectors,
          };
          await updateSourceData(
            { nangoMetadata: newNangoMetadata },
            setSubmitting,
          );
        }}
      >
        {({ values, isSubmitting, isValid, setFieldValue }) => (
          <FormRoot>
            <FormHeadingGroup>
              <FormHeading>URL configuration</FormHeading>
              <FormSubHeading>
                Specify URLs to include and exclude, using a glob pattern. One
                per line.{' '}
                <a
                  className="subtle-underline"
                  href="https://en.wikipedia.org/wiki/Glob_(programming)"
                  rel="noreferrer"
                  target="_blank"
                >
                  Learn more
                </a>
              </FormSubHeading>
            </FormHeadingGroup>
            <FormField>
              <FormLabel>Include list</FormLabel>
              <Field
                className="h-[100px] flex-grow font-mono text-xs"
                type="text"
                name="includeGlobs"
                textAreaSize="sm"
                placeholder={`Examples:\n\n${baseUrl}/blog/**/*\n${baseUrl}/docs/**/*`}
                as={NoAutoTextArea}
                disabled={isSubmitting || forceDisabled}
              />
              <ErrorMessage name="includeGlobs" component={ErrorLabel} />
            </FormField>
            <FormField>
              <FormLabel>Exclude list</FormLabel>
              <Field
                className="h-[100px] flex-grow font-mono text-xs"
                type="text"
                name="excludeGlobs"
                textAreaSize="sm"
                placeholder={`Examples:\n\n${baseUrl}/login\n${baseUrl}/internal/**/*\n${baseUrl}/files/*.txt`}
                as={NoAutoTextArea}
                disabled={isSubmitting || forceDisabled}
              />
              <ErrorMessage name="excludeGlobs" component={ErrorLabel} />
            </FormField>
            <FormHeadingGroup>
              <FormHeading>Request configuration</FormHeading>
              <FormSubHeading>
                Specify extra data to send alongside a request to your website.
              </FormSubHeading>
            </FormHeadingGroup>
            <FormField>
              <FormLabel>Headers</FormLabel>
              <RecordEditor
                records={values.requestHeaders || {}}
                onRecordsChanged={(records) => {
                  setFieldValue('requestHeaders', records);
                }}
              />
            </FormField>
            <FormHeadingGroup>
              <FormHeading>Content targets</FormHeading>
              <FormSubHeading>
                Specify which parts of the page to include or exclude, using CSS
                selectors.{' '}
                <a
                  className="subtle-underline"
                  href="https://github.com/fb55/css-select/blob/master/README.md#supported-selectors"
                  rel="noreferrer"
                  target="_blank"
                >
                  Learn more
                </a>
              </FormSubHeading>
            </FormHeadingGroup>
            <FormField>
              <FormLabel>Target selectors</FormLabel>
              <Field
                className="flex-grow font-mono text-xs"
                type="text"
                name="targetSelectors"
                inputSize="sm"
                placeholder={'E.g. div.main-article-content'}
                as={NoAutoInput}
                disabled={isSubmitting || forceDisabled}
              />
            </FormField>
            <FormField>
              <FormLabel>Exclude selectors</FormLabel>
              <Field
                className="flex-grow font-mono text-xs"
                type="text"
                name="excludeSelectors"
                inputSize="sm"
                placeholder={'E.g. nav, aside, .summary > blockquote'}
                as={NoAutoInput}
                disabled={isSubmitting || forceDisabled}
              />
            </FormField>
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
          </FormRoot>
        )}
      </Formik>
    </>
  );
};
