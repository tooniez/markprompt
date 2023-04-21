import { track } from '@vercel/analytics';
import {
  ErrorMessage,
  Field,
  Form,
  Formik,
  FormikErrors,
  FormikValues,
} from 'formik';
import { ChangeEvent, FC, useState } from 'react';
import { toast } from 'react-hot-toast';

import Button from '@/components/ui/Button';
import { ErrorLabel } from '@/components/ui/Forms';
import { NoAutoInput } from '@/components/ui/Input';
import { addSource, deleteSource } from '@/lib/api';
import useProject from '@/lib/hooks/use-project';
import useSources from '@/lib/hooks/use-sources';
import useUser from '@/lib/hooks/use-user';
import {
  extractProjectDomain,
  isMotifProjectAccessible,
} from '@/lib/integrations/motif';
import { getLabelForSource } from '@/lib/utils';
import { Project } from '@/types/types';

const _addSource = async (
  projectId: Project['id'],
  projectDomain: string,
  mutate: () => void,
) => {
  try {
    const newSource = await addSource(projectId, 'motif', {
      projectDomain,
    });
    await mutate();
    toast.success(
      `The source ${getLabelForSource(
        newSource,
      )} has been added to the project.`,
    );
  } catch (e) {
    console.error(e);
    toast.error(`${e}`);
  }
};

type MotifSourceProps = {
  clearPrevious?: boolean;
  onDidRequestClose: () => void;
};

const MotifSource: FC<MotifSourceProps> = ({
  clearPrevious,
  onDidRequestClose,
}) => {
  const { project } = useProject();
  const { user } = useUser();
  const { sources, mutate } = useSources();
  const [projectDomain, setProjectDomain] = useState('');

  if (!user) {
    return <></>;
  }

  return (
    <>
      <Formik
        initialValues={{ projectDomain: '' }}
        validateOnBlur
        onSubmit={async (_values, { setSubmitting, setErrors }) => {
          if (!project || !projectDomain) {
            return;
          }

          const isAccessible = await isMotifProjectAccessible(projectDomain);

          if (!isAccessible) {
            const errors: FormikErrors<FormikValues> = {
              projectDomain: 'Project is not accessible',
            };
            setErrors(errors);
            return;
          }

          setSubmitting(true);
          if (clearPrevious) {
            for (const source of sources) {
              await deleteSource(project.id, source.id);
            }
          }
          track('connect motif project');
          await _addSource(project.id, projectDomain, mutate);
          setSubmitting(false);
          onDidRequestClose();
        }}
      >
        {({ isSubmitting, isValid }) => (
          <Form className="h-full flex-grow">
            <div className="flex h-full flex-grow flex-col gap-2">
              <div className="h-flex-none mt-4 flex flex-col gap-1 px-4 pb-8">
                <p className="mb-1 flex-none text-sm font-medium text-neutral-300">
                  Project URL
                </p>
                <div className="flex flex-none flex-row gap-2">
                  <Field
                    wrapperClassName="flex-grow"
                    type="text"
                    name="projectDomain"
                    inputSize="sm"
                    as={NoAutoInput}
                    disabled={isSubmitting}
                    rightLabel=".motif.land"
                    value={projectDomain}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
                      setProjectDomain(event.target.value);
                    }}
                    onPaste={(event: ClipboardEvent) => {
                      event.preventDefault();

                      const pastedText = event.clipboardData?.getData('text');
                      let newValue = pastedText || '';
                      if (pastedText) {
                        const _projectDomain = extractProjectDomain(pastedText);
                        if (_projectDomain) {
                          newValue = _projectDomain;
                        }
                      }

                      setProjectDomain(newValue);
                    }}
                  />
                  <Button
                    className="flex-none"
                    disabled={!isValid}
                    loading={isSubmitting}
                    variant="plain"
                    buttonSize="sm"
                    type="submit"
                  >
                    Connect
                  </Button>
                </div>
                <ErrorMessage name="projectDomain" component={ErrorLabel} />
              </div>
            </div>
          </Form>
        )}
      </Formik>
    </>
  );
};

export default MotifSource;
