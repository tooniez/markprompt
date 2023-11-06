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
import { Note } from '@/components/ui/Note';
import { RecordEditor } from '@/components/ui/RecordEditor';
import { NoAutoTextArea } from '@/components/ui/TextArea';
import { setSourceData } from '@/lib/api';
import useSources from '@/lib/hooks/use-sources';
import { setMetadata } from '@/lib/integrations/nango.client';
import { WebsitePagesNangoMetadata } from '@/lib/integrations/website';
import { toNormalizedUrl } from '@/lib/utils';
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
          includeRegexes: nangoMetadata?.includeRegexes?.join('\n') || '',
          excludeRegexes: nangoMetadata?.excludeRegexes?.join('\n') || '',
          requestHeaders: nangoMetadata?.requestHeaders || [],
          targetSelectors: nangoMetadata?.targetSelectors || '',
          excludeSelectors: nangoMetadata?.excludeSelectors || '',
        }}
        enableReinitialize
        validateOnMount
        onSubmit={async (values, { setSubmitting }) => {
          const newNangoMetadata: Partial<WebsitePagesNangoMetadata> = {
            includeRegexes: toGlobList(values.includeRegexes),
            excludeRegexes: toGlobList(values.excludeRegexes),
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
        {({ values, isSubmitting, isValid, setFieldValue }) => {
          const baseUrlRegexp = toNormalizedUrl(baseUrl).replace(/\//gi, '\\/');
          return (
            <FormRoot>
              <FormHeadingGroup>
                <FormHeading>URL configuration</FormHeading>
                <FormSubHeading learnMoreHref="https://en.wikipedia.org/wiki/Regular_expression">
                  Specify URL patterns to include and exclude, using regular
                  expressions. One per line.{' '}
                </FormSubHeading>
              </FormHeadingGroup>
              <FormField>
                <FormLabel>Include list</FormLabel>
                <Field
                  className="h-[100px] flex-grow font-mono text-xs"
                  type="text"
                  name="includeRegexes"
                  textAreaSize="sm"
                  placeholder={`Examples:\n\n\\/blog\\/.*$\n\\/docs\\/.*$`}
                  as={NoAutoTextArea}
                  disabled={isSubmitting || forceDisabled}
                />
                <ErrorMessage name="includeRegexes" component={ErrorLabel} />
              </FormField>
              <FormField>
                <FormLabel>Exclude list</FormLabel>
                <Field
                  className="h-[100px] flex-grow font-mono text-xs"
                  type="text"
                  name="excludeRegexes"
                  textAreaSize="sm"
                  placeholder={`Examples:\n\n\\/login$\n\\/files\\/.+\\.txt$`}
                  as={NoAutoTextArea}
                  disabled={isSubmitting || forceDisabled}
                />
                <ErrorMessage name="excludeRegexes" component={ErrorLabel} />
              </FormField>
              <Note size="sm" type="info">
                <a
                  className="subtle-underline"
                  href="https://chat.openai.com/"
                  target="_blank"
                  rel="noreferrer"
                >
                  ChatGPT
                </a>{' '}
                works great for generating regular expressions. Give it a few
                examples, and it will generate the right expressions that you
                can paste here.
              </Note>
              <FormHeadingGroup>
                <FormHeading>Request configuration</FormHeading>
                <FormSubHeading>
                  Specify extra data to send alongside a request to your
                  website.
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
              {/* <FormHeadingGroup>
                <FormHeading>Content targets</FormHeading>
                <FormSubHeading>
                  Specify which parts of the page to include or exclude, using
                  CSS selectors.{' '}
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
              </FormField> */}
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
          );
        }}
      </Formik>
    </>
  );
};
